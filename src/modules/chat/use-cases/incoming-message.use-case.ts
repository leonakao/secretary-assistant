import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from '../services/chat.service';
import { Contact } from '../../contacts/entities/contact.entity';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';
import { assistantClientPrompt } from 'src/modules/ai/agent-prompts/assistant-client';

@Injectable()
export class IncomingMessageUseCase {
  private readonly logger = new Logger(IncomingMessageUseCase.name);

  constructor(
    private chatService: ChatService,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async execute(
    companyId: string,
    instanceName: string,
    payload: EvolutionMessagesUpsertPayload,
  ): Promise<void> {
    const { key, message: messageContent } = payload;

    if (key.fromMe) {
      return;
    }

    const remoteJid = key.remoteJid;
    const phone = this.extractPhoneFromJid(remoteJid);
    const messageText = this.extractMessageText(messageContent);

    if (!messageText) {
      return;
    }

    const contact = await this.contactRepository.findOne({
      where: {
        companyId,
        phone,
      },
    });

    if (!contact) {
      this.logger.warn(
        `Contact not found for phone ${phone} in company ${companyId}`,
      );
      return;
    }

    await this.chatService.processAndReply({
      sessionId: contact.id,
      companyId,
      instanceName,
      remoteJid,
      message: messageText,
      systemPrompt: assistantClientPrompt(contact),
    });
  }

  private extractPhoneFromJid(remoteJid: string): string {
    return '+' + remoteJid.split('@')[0];
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
