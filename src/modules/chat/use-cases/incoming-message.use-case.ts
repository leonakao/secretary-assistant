import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { User } from '../../users/entities/user.entity';
import { UserCompany } from '../../companies/entities/user-company.entity';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';
import { assistantClientPrompt } from 'src/modules/ai/agent-prompts/assistant-client';
import { assistantOwnerPrompt } from 'src/modules/ai/agent-prompts/assistant-owner';
import { ClientConversationStrategy } from '../strategies/client-conversation.strategy';
import { OwnerConversationStrategy } from '../strategies/owner-conversation.strategy';

@Injectable()
export class IncomingMessageUseCase {
  private readonly logger = new Logger(IncomingMessageUseCase.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserCompany)
    private userCompanyRepository: Repository<UserCompany>,
    private clientStrategy: ClientConversationStrategy,
    private ownerStrategy: OwnerConversationStrategy,
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

    const user = await this.userRepository.findOne({
      where: { phone },
    });

    if (user) {
      const userCompany = await this.userCompanyRepository.findOne({
        where: {
          userId: user.id,
          companyId,
        },
      });

      if (userCompany) {
        await this.ownerStrategy.handleConversation({
          sessionId: user.id,
          companyId,
          instanceName,
          remoteJid,
          message: messageText,
          systemPrompt: assistantOwnerPrompt(user),
          userId: user.id,
        });

        return;
      }
    }

    const contact = await this.contactRepository.findOne({
      where: {
        companyId,
        phone,
      },
    });

    if (!contact) {
      this.logger.warn(
        `No user or contact found for phone ${phone} in company ${companyId}`,
      );
      return;
    }

    // await this.clientStrategy.handleConversation({
    //   sessionId: contact.id,
    //   companyId,
    //   instanceName,
    //   remoteJid,
    //   message: messageText,
    //   systemPrompt: assistantClientPrompt(contact),
    // });
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
