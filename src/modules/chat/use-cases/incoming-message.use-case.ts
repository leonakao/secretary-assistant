import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from '../services/chat.service';
import type {
  EvolutionMessagesUpsertPayload,
  EvolutionMessage,
} from '../dto/evolution-message.dto';

@Injectable()
export class IncomingMessageUseCase {
  private readonly logger = new Logger(IncomingMessageUseCase.name);

  constructor(private chatService: ChatService) {}

  async execute(
    instanceName: string,
    payload: EvolutionMessagesUpsertPayload,
  ): Promise<void> {
    const messages = payload.messages || [];

    for (const message of messages) {
      await this.processMessage(instanceName, message);
    }
  }

  private async processMessage(
    instanceName: string,
    message: EvolutionMessage,
  ): Promise<void> {
    const { key, message: messageContent } = message;

    // Skip messages from yourself
    if (key.fromMe) {
      this.logger.debug('Skipping message from self');
      return;
    }

    const remoteJid = key.remoteJid;
    const messageText = this.extractMessageText(messageContent);

    // Skip empty messages
    if (!messageText) {
      this.logger.debug('Skipping empty message');
      return;
    }

    this.logger.log(`New message from ${remoteJid}: ${messageText}`);

    try {
      // Process message with AI and send response
      await this.chatService.processAndReply({
        provider: 'evolution',
        instanceName,
        remoteJid,
        message: messageText,
        systemPrompt:
          'You are a helpful secretary assistant for a small company. Be professional, friendly, and concise in your responses.',
      });

      this.logger.log(`AI response sent to ${remoteJid}`);
    } catch (error) {
      this.logger.error('Error processing message:', error);
      // Send error message to user
      await this.chatService.sendReply({
        provider: 'evolution',
        instanceName,
        remoteJid,
        text: 'Sorry, I encountered an error processing your message. Please try again.',
      });
    }
  }

  private extractMessageText(
    messageContent: EvolutionMessage['message'],
  ): string {
    return (
      messageContent?.conversation ||
      messageContent?.extendedTextMessage?.text ||
      ''
    );
  }
}
