import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationResponse,
  ConversationStrategy,
} from './conversation-strategy.interface';
import { Contact } from '../../contacts/entities/contact.entity';
import { Company } from '../../companies/entities/company.entity';
import { ClientAssistantAgent } from '../../ai/agents/client-assistant.agent';
import { ChatService } from '../services/chat.service';
import { ExtractAiMessageService } from '../../ai/services/extract-ai-message.service';
import { MediationService } from 'src/modules/service-requests/services/mediation.service';
import { ClientAgentContext } from 'src/modules/ai/agents/agent.state';

@Injectable()
export class ClientConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(ClientConversationStrategy.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly chatService: ChatService,
    private readonly clientAssistantAgent: ClientAssistantAgent,
    private readonly extractAiMessageService: ExtractAiMessageService,
    private readonly mediationService: MediationService,
  ) {}

  async handleConversation(params: {
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    contactId?: string;
  }): Promise<ConversationResponse> {
    if (!params.contactId) {
      throw new Error('contactId is required for client conversation');
    }
    const contact = await this.contactRepository.findOneByOrFail({
      id: params.contactId,
    });

    const company = await this.companyRepository.findOneByOrFail({
      id: params.companyId,
    });

    await this.chatService.addMessageToMemory({
      sessionId: params.contactId,
      companyId: params.companyId,
      role: 'user',
      content: params.message,
    });

    const agentContext: ClientAgentContext = {
      companyId: params.companyId,
      instanceName: params.instanceName,
      contactId: params.contactId,
      contactName: contact.name,
      contactPhone: contact.phone ?? undefined,
      companyDescription: company.description,
      mediations: await this.mediationService.findPendingMediations({
        companyId: params.companyId,
        contactId: params.contactId,
      }),
    };

    await this.chatService.sendPresenceNotification({
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      presence: 'composing',
    });

    const messages: string[] = [];

    const stream = await this.clientAssistantAgent.streamConversation(
      params.message,
      agentContext,
      params.contactId,
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

    const finalMessage = messages.join('\n');

    if (!finalMessage) {
      return { message: '' };
    }

    await this.chatService.sendMessageAndSaveToMemory({
      sessionId: params.contactId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message: finalMessage,
    });

    return {
      message: finalMessage,
    };
  }
}
