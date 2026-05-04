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
import {
  buildLangWatchAttributes,
  langWatchTracer,
} from 'src/observability/langwatch';

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

    const userId = params.userId;

    const user = await this.userRepository.findOneByOrFail({
      id: userId,
    });

    const company = await this.companyRepository.findOneByOrFail({
      id: params.companyId,
    });

    await this.chatService.addMessageToMemory({
      sessionId: userId,
      companyId: params.companyId,
      role: 'user',
      content: params.message,
    });

    this.logger.log(`Processing owner message: ${params.message}`);

    return langWatchTracer.withActiveSpan(
      'conversation.owner',
      async (span) => {
        span
          .setType('workflow')
          .setInput('chat_messages', [
            {
              role: 'user',
              content: params.message,
            },
          ])
          .setAttributes(
            buildLangWatchAttributes({
              companyId: params.companyId,
              instanceName: params.instanceName,
              operation: 'owner_conversation',
              routeKind: 'owner',
              threadId: userId,
              userId,
            }),
          );

        try {
          const agentContext: AgentContext = {
            companyId: params.companyId,
            instanceName: params.instanceName,
            userId,
            userName: user.name,
            userPhone: user.phone ?? undefined,
            companyDescription: company.description,
            confirmations: await this.findPendingConfirmations.execute({
              companyId: params.companyId,
              userId,
            }),
          };

          const messages: string[] = [];

          const stream = await this.ownerAssistantAgent.streamConversation(
            params.message,
            user,
            agentContext,
            userId,
          );

          for await (const chunk of stream) {
            if (chunk.assistant) {
              const message =
                this.extractAiMessageService.extractFromChunkMessages(
                  chunk.assistant.messages,
                );
              if (message) {
                this.logger.log(`AIMessage: ${message}`);
                messages.push(message);
              }

              const toolMessages =
                this.extractAiMessageService.extractToolMessagesFromChunkMessages(
                  chunk.assistant.messages,
                );
              for (const toolMessage of toolMessages) {
                this.logger.log(`ToolMessage: ${toolMessage}`);
              }
            }

            await this.chatService.sendPresenceNotification({
              instanceName: params.instanceName,
              remoteJid: params.remoteJid,
              presence: 'composing',
            });
          }

          const finalMessage = messages.join('\n');

          if (!finalMessage) {
            span.setOutput('chat_messages', [
              {
                role: 'assistant',
                content: '',
              },
            ]);

            return { message: '' };
          }

          await this.chatService.sendMessageAndSaveToMemory({
            sessionId: userId,
            companyId: params.companyId,
            instanceName: params.instanceName,
            remoteJid: params.remoteJid,
            message: finalMessage,
          });

          this.logger.log('Agent response sent successfully');

          span.setOutput('chat_messages', [
            {
              role: 'assistant',
              content: finalMessage,
            },
          ]);

          return {
            message: finalMessage,
          };
        } catch (error) {
          this.logger.error('Error executing owner agent:', error);
          span.recordException(error as Error);

          const errorMessage =
            'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';

          await this.chatService.addMessageToMemory({
            sessionId: userId,
            companyId: params.companyId,
            role: 'assistant',
            content: errorMessage,
          });

          await this.chatService.sendMessageAndSaveToMemory({
            sessionId: userId,
            companyId: params.companyId,
            instanceName: params.instanceName,
            remoteJid: params.remoteJid,
            message: errorMessage,
          });

          span.setOutput('chat_messages', [
            {
              role: 'assistant',
              content: errorMessage,
            },
          ]);

          return {
            message: errorMessage,
          };
        }
      },
    );
  }
}
