import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationResponse,
  ConversationStrategy,
} from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { OnboardingConversationService } from 'src/modules/onboarding/services/onboarding-conversation.service';

@Injectable()
export class OnboardingConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(OnboardingConversationStrategy.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly onboardingConversationService: OnboardingConversationService,
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

    await this.chatService.sendPresenceNotification({
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      presence: 'composing',
    });

    const { assistantMessage } = await this.onboardingConversationService.run({
      userId: params.userId,
      companyId: params.companyId,
      message: params.message,
    });

    if (assistantMessage.trim()) {
      await this.chatService.sendPresenceNotification({
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        presence: 'composing',
      });

      await this.chatService.sendTextMessage({
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        message: assistantMessage,
      });
    }

    return { message: assistantMessage };
  }
}
