import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from '../services/chat.service';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';

@Injectable()
export class IncomingMessageUseCase {
  private readonly logger = new Logger(IncomingMessageUseCase.name);

  constructor(private chatService: ChatService) {}

  async execute(
    instanceName: string,
    payload: EvolutionMessagesUpsertPayload,
  ): Promise<void> {
    const { key, message: messageContent } = payload;

    if (key.fromMe) {
      return;
    }

    const remoteJid = key.remoteJid;
    const messageText = this.extractMessageText(messageContent);

    if (!messageText) {
      return;
    }

    await this.chatService.processAndReply({
      provider: 'evolution',
      instanceName,
      remoteJid,
      message: messageText,
      systemPrompt:
        'You are a helpful secretary assistant for a small company. Be professional, friendly, and concise in your responses.',
    });
  }

  private extractMessageText(
    messageContent: EvolutionMessagesUpsertPayload['message'],
  ): string {
    return (
      messageContent?.conversation ||
      messageContent?.extendedTextMessage?.text ||
      ''
    );
  }
}
