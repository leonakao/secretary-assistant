import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationResponse,
  ConversationStrategy,
} from './conversation-strategy.interface';
import { Contact } from '../../contacts/entities/contact.entity';
import { Company } from '../../companies/entities/company.entity';
import { ClientAssistantAgent } from '../../ai/agents/client-assistant/client-assistant.agent';
import { ChatService } from '../services/chat.service';
import { ActionDetectionService } from '../../actions/services/action-detection.service';
import { ActionExecutorService } from '../../actions/services/action-executor.service';

@Injectable()
export class ClientConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(ClientConversationStrategy.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private chatService: ChatService,
    private clientAssistantAgent: ClientAssistantAgent,
    private actionDetectionService: ActionDetectionService,
    private actionExecutorService: ActionExecutorService,
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

    this.logger.log(
      `Processing client message from ${contact.name}: ${params.message}`,
    );

    const agentContext = {
      companyId: params.companyId,
      instanceName: params.instanceName,
      contactId: params.contactId,
      contactName: contact.name,
      contactPhone: contact.phone ?? undefined,
      companyDescription: company.description,
    };

    try {
      const agentResponse = await this.clientAssistantAgent.execute(
        params.message,
        contact,
        agentContext,
        params.contactId,
      );

      await this.chatService.addMessageToMemory({
        sessionId: params.contactId,
        companyId: params.companyId,
        role: 'assistant',
        content: agentResponse,
      });

      await this.chatService.sendMessageAndSaveToMemory({
        sessionId: params.contactId,
        companyId: params.companyId,
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        message: agentResponse,
      });

      return {
        message: agentResponse,
      };
    } catch (error) {
      this.logger.error('Error executing client agent:', error);

      const errorMessage =
        'Desculpe, ocorreu um erro ao processar sua mensagem. Vou pedir ajuda humana e retornaremos em breve.';

      await this.chatService.addMessageToMemory({
        sessionId: params.contactId,
        companyId: params.companyId,
        role: 'assistant',
        content: errorMessage,
      });

      await this.chatService.sendMessageAndSaveToMemory({
        sessionId: params.contactId,
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
