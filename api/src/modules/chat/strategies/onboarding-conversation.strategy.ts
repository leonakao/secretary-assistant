import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationResponse,
  ConversationStrategy,
} from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { User } from '../../users/entities/user.entity';
import { OnboardingAssistantAgent } from '../../ai/agents/onboarding-assistant.agent';
import { AgentContext } from '../../ai/agents/agent.state';
import { ExtractAiMessageService } from 'src/modules/ai/services/extract-ai-message.service';

@Injectable()
export class OnboardingConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(OnboardingConversationStrategy.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatService: ChatService,
    private onboardingAssistantAgent: OnboardingAssistantAgent,
    private extractAiMessageService: ExtractAiMessageService,
  ) {}

  async handleConversation(params: {
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    userId?: string;
  }): Promise<ConversationResponse> {
    if (!params.userId) {
      throw new Error('userId is required for onboarding conversation');
    }
    this.logger.log(
      `Handling onboarding conversation for user ${params.userId}`,
    );

    const user = await this.userRepository.findOneByOrFail({
      id: params.userId,
    });

    await this.chatService.addMessageToMemory({
      sessionId: params.userId,
      companyId: params.companyId,
      role: 'user',
      content: params.message,
    });

    const agentContext: AgentContext = {
      companyId: params.companyId,
      instanceName: params.instanceName,
      userId: params.userId,
      userName: user.name,
      userPhone: user.phone,
      companyDescription: '',
      confirmations: [],
    };

    const messages: string[] = [];

    await this.chatService.sendPresenceNotification({
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      presence: 'composing',
    });

    const stream = await this.onboardingAssistantAgent.streamConversation(
      params.message,
      user,
      agentContext,
      params.userId,
    );

    for await (const chunk of stream) {
      console.log('Assistant chunk:', chunk);
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

    const message = messages.join('\n');

    await this.chatService.sendMessageAndSaveToMemory({
      sessionId: params.userId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message,
    });

    return {
      message,
    };
  }
}
