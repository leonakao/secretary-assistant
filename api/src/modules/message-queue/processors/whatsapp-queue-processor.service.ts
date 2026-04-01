import { Injectable, Logger } from '@nestjs/common';
import {
  MessageQueue,
  QueuedWhatsappMessage,
} from '../entities/message-queue.entity';
import { MessageTextExtractorService } from '../services/message-text-extractor.service';
import { IncomingMessageUseCase } from '../../chat/use-cases/incoming-message.use-case';
import { EvolutionService } from '../../evolution/services/evolution.service';
import type { EvolutionMessagesUpsertPayload } from '../../chat/dto/evolution-message.dto';

@Injectable()
export class WhatsappQueueProcessorService {
  private readonly logger = new Logger(WhatsappQueueProcessorService.name);

  constructor(
    private messageTextExtractorService: MessageTextExtractorService,
    private incomingMessageUseCase: IncomingMessageUseCase,
    private evolutionService: EvolutionService,
  ) {}

  async process(item: MessageQueue): Promise<void> {
    // Parse conversationKey → { companyId, phone }
    // Format: whatsapp:{companyId}:{phone}
    const [, companyId] = item.conversationKey.split(':');

    // Cast messages to QueuedWhatsappMessage[]
    const messages = item.messages as QueuedWhatsappMessage[];

    // Extract text from each message and collect
    const texts: string[] = [];
    for (const queuedMsg of messages) {
      try {
        const text = await this.messageTextExtractorService.extract(
          queuedMsg.payload as EvolutionMessagesUpsertPayload,
        );
        if (text.trim()) {
          texts.push(text);
        }
      } catch (error) {
        this.logger.error(
          `Failed to extract text from queued message: ${error}`,
        );
      }
    }

    if (texts.length === 0) {
      this.logger.warn(
        `No valid messages found to process for queue item ${item.id}`,
      );
      return;
    }

    const joinedText = texts.join('\n\n');
    const firstMessage = messages[0];
    const instanceName = firstMessage.instanceName;
    const remoteJid = (firstMessage.payload as EvolutionMessagesUpsertPayload)
      .key.remoteJid;

    // Send "composing" presence to indicate typing
    await this.evolutionService.sendPresence({
      instanceName,
      remoteJid,
      presence: 'composing',
    });

    try {
      // Call IncomingMessageUseCase with pre-extracted text
      await this.incomingMessageUseCase.execute(
        companyId,
        instanceName,
        firstMessage.payload as EvolutionMessagesUpsertPayload,
        joinedText,
      );
    } finally {
      // Always clear composing indicator, even on error
      await this.evolutionService.sendPresence({
        instanceName,
        remoteJid,
        presence: 'paused',
      });
    }
  }
}
