import { Injectable, Logger } from '@nestjs/common';
import { ExtractAiMessageService } from '../../ai/services/extract-ai-message.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationResponse,
  ConversationStrategy,
} from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { OwnerAssistantAgent } from '../../ai/agents/owner-assistant.agent';
import { AgentContext } from 'src/modules/ai/agents/agent.state';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';
import { FindPendingConfirmationsService } from '../../service-requests/services/find-pending-confirmations.service';

@Injectable()
export class OwnerConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(OwnerConversationStrategy.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly chatService: ChatService,
    private readonly ownerAssistantAgent: OwnerAssistantAgent,
    private readonly extractAiMessageService: ExtractAiMessageService,
    private readonly findPendingConfirmations: FindPendingConfirmationsService,
  ) {}

  async handleConversation(params: {
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    userId?: string;
  }): Promise<ConversationResponse> {
    if (!params.userId) {
      throw new Error('userId is required for owner conversation');
    }

    const user = await this.userRepository.findOneByOrFail({
      id: params.userId,
    });

    const company = await this.companyRepository.findOneByOrFail({
      id: params.companyId,
    });

    await this.chatService.addMessageToMemory({
      sessionId: params.userId,
      companyId: params.companyId,
      role: 'user',
      content: params.message,
    });

    this.logger.log(`Processing owner message: ${params.message}`);

    try {
      const agentContext: AgentContext = {
        companyId: params.companyId,
        instanceName: params.instanceName,
        userId: params.userId,
        userName: user.name,
        userPhone: user.phone,
        companyDescription: company.description,
        confirmations: await this.findPendingConfirmations.execute({
          companyId: params.companyId,
          userId: params.userId,
        }),
      };

      const messages: string[] = [];

      const stream = await this.ownerAssistantAgent.streamConversation(
        params.message,
        user,
        agentContext,
        params.userId,
      );

      for await (const chunk of stream) {
        if (chunk.assistant) {
          const message = this.extractAiMessageService.extractFromChunkMessages(
            chunk.assistant.messages,
          );
          if (message) {
            messages.push(message);
          }
        }

        await this.chatService.sendPresenceNotification({
          instanceName: params.instanceName,
          remoteJid: params.remoteJid,
          presence: 'composing',
        });
      }

      console.log('Final message:', messages.join('\n'));

      const finalMessage = messages.join('\n');

      if (!finalMessage) {
        return { message: '' };
      }

      await this.chatService.sendMessageAndSaveToMemory({
        sessionId: params.userId,
        companyId: params.companyId,
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        message: finalMessage,
      });

      this.logger.log('Agent response sent successfully');

      return {
        message: finalMessage,
      };
    } catch (error) {
      this.logger.error('Error executing owner agent:', error);

      const errorMessage =
        'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';

      await this.chatService.addMessageToMemory({
        sessionId: params.userId,
        companyId: params.companyId,
        role: 'assistant',
        content: errorMessage,
      });

      await this.chatService.sendMessageAndSaveToMemory({
        sessionId: params.userId,
        companyId: params.companyId,
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        message: errorMessage,
      });

      return {
        message: errorMessage,
      };
    }
  }
}
