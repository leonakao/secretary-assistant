import { Injectable } from '@nestjs/common';
import { ClientConversationStrategy } from '../strategies/client-conversation.strategy';
import { OwnerConversationStrategy } from '../strategies/owner-conversation.strategy';
import { OnboardingConversationStrategy } from '../strategies/onboarding-conversation.strategy';
import type { QueuedWhatsappRoute } from '../../message-queue/entities/message-queue.entity';

@Injectable()
export class ProcessIncomingWhatsappMessageService {
  constructor(
    private readonly clientStrategy: ClientConversationStrategy,
    private readonly ownerStrategy: OwnerConversationStrategy,
    private readonly onboardingStrategy: OnboardingConversationStrategy,
  ) {}

  async execute(params: {
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    route: QueuedWhatsappRoute;
  }): Promise<{ message: string }> {
    if (params.route.kind === 'client') {
      return this.clientStrategy.handleConversation({
        companyId: params.companyId,
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        message: params.message,
        contactId: params.route.contactId,
      });
    }

    if (params.route.kind === 'onboarding') {
      return this.onboardingStrategy.handleConversation({
        companyId: params.companyId,
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        message: params.message,
        userId: params.route.userId,
      });
    }

    return this.ownerStrategy.handleConversation({
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message: params.message,
      userId: params.route.userId,
    });
  }
}
