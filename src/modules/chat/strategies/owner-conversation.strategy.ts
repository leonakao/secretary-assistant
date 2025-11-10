import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationResponse,
  ConversationStrategy,
} from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { OwnerAssistantAgent } from '../../ai/agents/owner-assistant.agent';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@Injectable()
export class OwnerConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(OwnerConversationStrategy.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private chatService: ChatService,
    private ownerAssistantAgent: OwnerAssistantAgent,
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

    // Save user message to memory
    await this.chatService.addMessageToMemory({
      sessionId: params.userId,
      companyId: params.companyId,
      role: 'user',
      content: params.message,
    });

    this.logger.log(`Processing owner message: ${params.message}`);

    try {
      // Execute the agent with the user's message
      const agentResponse = await this.ownerAssistantAgent.execute(
        params.message,
        user,
        {
          companyId: params.companyId,
          instanceName: params.instanceName,
          userId: params.userId,
          companyDescription: company.description,
        },
        params.userId, // Use userId as thread ID
      );

      // Save agent response to memory
      await this.chatService.addMessageToMemory({
        sessionId: params.userId,
        companyId: params.companyId,
        role: 'assistant',
        content: agentResponse,
      });

      // Send the response back to the user
      await this.chatService.sendMessageAndSaveToMemory({
        sessionId: params.userId,
        companyId: params.companyId,
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        message: agentResponse,
      });

      this.logger.log('Agent response sent successfully');

      return {
        message: agentResponse,
        actions: [], // Agent handles actions internally
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
        actions: [],
      };
    }
  }

}
