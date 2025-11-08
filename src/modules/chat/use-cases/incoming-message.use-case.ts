import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { User } from '../../users/entities/user.entity';
import { UserCompany } from '../../companies/entities/user-company.entity';
import { Company } from '../../companies/entities/company.entity';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';
import { ClientConversationStrategy } from '../strategies/client-conversation.strategy';
import { OwnerConversationStrategy } from '../strategies/owner-conversation.strategy';
import { OnboardingConversationStrategy } from '../strategies/onboarding-conversation.strategy';

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
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private clientStrategy: ClientConversationStrategy,
    private ownerStrategy: OwnerConversationStrategy,
    private onboardingStrategy: OnboardingConversationStrategy,
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
        const company = await this.companyRepository.findOne({
          where: { id: companyId },
        });

        // Route to onboarding strategy if company is in onboarding step
        if (company?.step === 'onboarding') {
          await this.onboardingStrategy.handleConversation({
            sessionId: user.id,
            companyId,
            instanceName,
            remoteJid,
            message: messageText,
            userId: user.id,
          });
          return;
        }

        await this.ownerStrategy.handleConversation({
          sessionId: user.id,
          companyId,
          instanceName,
          remoteJid,
          message: messageText,
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

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company?.isClientsSupportEnabled) {
      this.logger.log(
        `Clients support is disabled for company ${companyId}. Ignoring message from contact ${contact.id}`,
      );
      return;
    }

    // Check if conversation is paused (ignoreUntil)
    if (contact.ignoreUntil && contact.ignoreUntil > new Date()) {
      this.logger.log(
        `Ignoring message from contact ${contact.id} until ${contact.ignoreUntil.toISOString()}`,
      );
      return;
    }

    await this.clientStrategy.handleConversation({
      sessionId: contact.id,
      companyId,
      instanceName,
      remoteJid,
      message: messageText,
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
