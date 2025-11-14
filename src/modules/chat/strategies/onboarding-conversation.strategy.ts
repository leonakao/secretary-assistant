import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationResponse,
  ConversationStrategy,
} from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { User } from '../../users/entities/user.entity';
import { assistantOnboardingPrompt } from '../../ai/agent-prompts/assistant-onboarding';
import { OnboardingAssistantAgent } from '../../ai/agents/onboarding-assistant.agent';
import { AgentContext } from '../../ai/agents/agent.state';

@Injectable()
export class OnboardingConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(OnboardingConversationStrategy.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatService: ChatService,
    private onboardingAssistantAgent: OnboardingAssistantAgent,
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

    // Get user to build prompt and context
    const user = await this.userRepository.findOneByOrFail({
      id: params.userId,
    });

    const systemPrompt = assistantOnboardingPrompt(user);

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
      companyDescription: systemPrompt,
      confirmations: [],
    };

    const messages: string[] = [];

    const stream = await this.onboardingAssistantAgent.streamConversation(
      params.message,
      user,
      agentContext,
      params.userId,
    );

    for await (const chunk of stream) {
      if (chunk.assistant) {
        const messageChunk = chunk.assistant.messages
          .map((m: { content: string }) => m.content)
          .join('\n');

        if (messageChunk) {
          messages.push(messageChunk);
        }
      }

      await this.chatService.sendPresenceNotification({
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        presence: 'composing',
      });
    }

    const message = messages.join('\n');

    return {
      message,
    };
  }
}
