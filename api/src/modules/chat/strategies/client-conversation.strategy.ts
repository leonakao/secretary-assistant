import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { AgentContext } from 'src/modules/ai/agents/agent.state';
import { FindPendingConfirmationsService } from 'src/modules/service-requests/services/find-pending-confirmations.service';
import { ContactSessionService } from '../services/contact-session.service';
import {
  buildLangWatchAttributes,
  langWatchTracer,
} from 'src/observability/langwatch';

@Injectable()
export class ClientConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(ClientConversationStrategy.name);
  private readonly deterministicE2eRepliesEnabled: boolean;

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly contactSessionService: ContactSessionService,
    private readonly clientAssistantAgent: ClientAssistantAgent,
    private readonly extractAiMessageService: ExtractAiMessageService,
    private readonly findPendingConfirmations: FindPendingConfirmationsService,
  ) {
    this.deterministicE2eRepliesEnabled =
      this.configService.get<string>('E2E_AUTH_MODE', 'false') === 'true' &&
      this.configService.get<string>('NODE_ENV', 'development') !==
        'production';
  }

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

    const sessionId = await this.contactSessionService.resolveActiveSessionId({
      companyId: params.companyId,
      contactId: params.contactId,
    });

    await this.chatService.addMessageToMemory({
      sessionId,
      companyId: params.companyId,
      role: 'user',
      content: params.message,
    });

    return langWatchTracer.withActiveSpan(
      'conversation.client',
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
              contactId: params.contactId,
              instanceName: params.instanceName,
              operation: 'client_conversation',
              routeKind: 'client',
              threadId: sessionId,
            }),
          );

        if (this.deterministicE2eRepliesEnabled) {
          const message = this.buildDeterministicReply(
            contact,
            company,
            params,
          );

          await this.chatService.addMessageToMemory({
            sessionId,
            companyId: params.companyId,
            role: 'assistant',
            content: message,
          });

          span.setOutput('chat_messages', [
            {
              role: 'assistant',
              content: message,
            },
          ]);

          return {
            message,
          };
        }

        this.logger.log(`Processing owner message: ${params.message}`);

        const agentContext: AgentContext = {
          companyId: params.companyId,
          instanceName: params.instanceName,
          contactId: params.contactId,
          contactName: contact.name,
          contactPhone: contact.phone ?? undefined,
          companyDescription: company.description,
          confirmations: await this.findPendingConfirmations.execute({
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
          sessionId,
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
          sessionId,
          companyId: params.companyId,
          instanceName: params.instanceName,
          remoteJid: params.remoteJid,
          message: finalMessage,
        });

        span.setOutput('chat_messages', [
          {
            role: 'assistant',
            content: finalMessage,
          },
        ]);

        return {
          message: finalMessage,
        };
      },
    );
  }

  private buildDeterministicReply(
    contact: Contact,
    company: Company,
    params: {
      message: string;
    },
  ): string {
    const firstName = contact.name.trim().split(/\s+/)[0] || 'cliente';
    const companyName = company.name.trim() || 'atendimento';
    const normalizedMessage = params.message.replace(/\s+/g, ' ').trim();
    const summarizedMessage =
      normalizedMessage.length > 96
        ? `${normalizedMessage.slice(0, 93).trimEnd()}...`
        : normalizedMessage;

    if (!summarizedMessage) {
      return `Oi, ${firstName}! Recebi sua mensagem para ${companyName} e vou continuar por aqui.`;
    }

    return `Oi, ${firstName}! Recebi sua mensagem para ${companyName}: "${summarizedMessage}".`;
  }
}
