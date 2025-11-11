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

      const actions = await this.detectAndExecuteClientActions({
        sessionId: params.contactId,
        companyId: params.companyId,
        instanceName: params.instanceName,
        contactId: params.contactId,
      });

      return {
        message: agentResponse,
        actions,
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
        actions: [],
      };
    }
  }

  private async detectAndExecuteClientActions(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    contactId: string;
  }): Promise<string[]> {
    const actions: string[] = [];

    try {
      const detectionResult =
        await this.actionDetectionService.detectActionsFromSession(
          params.sessionId,
          'client',
        );

      this.logger.debug('Client action detection result:', detectionResult);

      actions.push(
        ...detectionResult.actions.map((action): string => action.type),
      );

      if (
        detectionResult.requiresAction &&
        detectionResult.actions.length > 0
      ) {
        const results = await this.actionExecutorService.executeActions(
          detectionResult.actions,
          {
            companyId: params.companyId,
            instanceName: params.instanceName,
            contactId: params.contactId,
          },
        );

        this.logger.log(
          `Executed ${results.length} client actions. Success: ${results.filter((r) => r.success).length}`,
        );
      }
    } catch (error) {
      this.logger.error('Error detecting/executing client actions:', error);
    }

    return actions;
  }
}
