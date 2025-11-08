import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationStrategy } from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { ActionDetectionService } from '../../actions/services/action-detection.service';
import { ActionExecutorService } from '../../actions/services/action-executor.service';
import { Contact } from '../../contacts/entities/contact.entity';
import { assistantClientPrompt } from '../../ai/agent-prompts/assistant-client';

@Injectable()
export class ClientConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(ClientConversationStrategy.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    private chatService: ChatService,
    private actionDetectionService: ActionDetectionService,
    private actionExecutorService: ActionExecutorService,
  ) {}

  async handleConversation(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
  }): Promise<void> {
    // Get contact to build prompt
    const contact = await this.contactRepository.findOneByOrFail({
      id: params.sessionId,
    });

    const systemPrompt = assistantClientPrompt(contact);

    // Process and reply to client
    await this.chatService.processAndReply({
      sessionId: params.sessionId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message: params.message,
      systemPrompt,
    });

    // Detect client actions (e.g., request human contact)
    await this.detectAndExecuteClientActions({
      sessionId: params.sessionId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      contactId: params.sessionId,
    });
  }

  private async detectAndExecuteClientActions(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    contactId: string;
  }): Promise<void> {
    try {
      const detectionResult =
        await this.actionDetectionService.detectActionsFromSession(
          params.sessionId,
          'client',
        );

      this.logger.debug('Client action detection result:', detectionResult);

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
  }
}
