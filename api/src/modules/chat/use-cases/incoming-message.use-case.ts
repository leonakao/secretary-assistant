import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { UserCompany } from '../../companies/entities/user-company.entity';
import { Company } from '../../companies/entities/company.entity';
import { Memory } from '../entities/memory.entity';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';
import { MessageQueueService } from '../../message-queue/services/message-queue.service';
import {
  MessageQueueChannel,
  type QueuedWhatsappRoute,
} from '../../message-queue/entities/message-queue.entity';

export interface IncomingMessageResult {
  success: true;
  ignored: boolean;
  ignoredReason: string | null;
}

@Injectable()
export class IncomingMessageUseCase {
  private readonly logger = new Logger(IncomingMessageUseCase.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async execute(
    companyId: string,
    instanceName: string,
    payload: EvolutionMessagesUpsertPayload,
  ): Promise<IncomingMessageResult> {
    const { key } = payload;
    const remoteJid = key.remoteJid;

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      return this.buildIgnoredResponse('company_not_found');
    }

    const ignoredReason = this.getIngressIgnoredReason(payload);
    if (ignoredReason) {
      return this.buildIgnoredResponse(ignoredReason);
    }

    const phone = this.extractPhoneFromJid(remoteJid);
    const displayName = this.buildContactDisplayName(payload.pushName);

    const userCompany = await this.userCompanyRepository.findOne({
      where: {
        companyId,
        user: { phone },
      },
      relations: ['user'],
    });

    if (userCompany) {
      const route: QueuedWhatsappRoute =
        company.step === 'onboarding'
          ? { kind: 'onboarding', userId: userCompany.user.id }
          : { kind: 'owner', userId: userCompany.user.id };

      await this.enqueueWhatsappMessage(
        companyId,
        phone,
        instanceName,
        payload,
        route,
      );

      return this.buildAcceptedResponse();
    }

    const existingContact = await this.contactRepository.findOne({
      where: {
        companyId,
        phone,
      },
    });

    if (key.fromMe) {
      if (!existingContact) {
        return this.buildIgnoredResponse('from_me_without_existing_contact');
      }

      const immediateText = this.extractImmediateText(payload);
      if (!immediateText) {
        return this.buildIgnoredResponse('from_me_without_supported_text');
      }

      await this.handleFromMeMessage(companyId, existingContact, immediateText);
      return this.buildIgnoredResponse('from_me_message');
    }

    const contact =
      existingContact ??
      (await this.findOrCreateContact(companyId, phone, displayName));

    if (!this.shouldRespondToClient(company, contact)) {
      this.logger.log(
        `Clients support is disabled or filtered out for company ${companyId}. Ignoring message from contact ${phone}`,
      );
      return this.buildIgnoredResponse('client_support_disabled_or_filtered');
    }

    if (contact.ignoreUntil && contact.ignoreUntil > new Date()) {
      this.logger.log(
        `Ignoring message from contact ${contact.id} until ${contact.ignoreUntil.toISOString()}`,
      );
      return this.buildIgnoredResponse('contact_ignored_until');
    }

    await this.enqueueWhatsappMessage(companyId, phone, instanceName, payload, {
      kind: 'client',
      contactId: contact.id,
    });

    return this.buildAcceptedResponse();
  }

  private extractPhoneFromJid(remoteJid: string): string {
    return '+' + remoteJid.split('@')[0];
  }

  private buildContactDisplayName(pushName: string | undefined): string | null {
    const normalizedName = pushName?.trim();
    return normalizedName ? normalizedName : null;
  }

  private buildAcceptedResponse(): IncomingMessageResult {
    return {
      success: true,
      ignored: false,
      ignoredReason: null,
    };
  }

  private buildIgnoredResponse(reason: string): IncomingMessageResult {
    return {
      success: true,
      ignored: true,
      ignoredReason: reason,
    };
  }

  private async enqueueWhatsappMessage(
    companyId: string,
    phone: string,
    instanceName: string,
    payload: EvolutionMessagesUpsertPayload,
    route: QueuedWhatsappRoute,
  ): Promise<void> {
    const conversationKey = `whatsapp:${companyId}:${phone}`;

    await this.messageQueueService.enqueueMessage({
      companyId,
      conversationKey,
      channel: MessageQueueChannel.WHATSAPP,
      message: {
        instanceName,
        payload,
        route,
      },
    });
  }

  private async findOrCreateContact(
    companyId: string,
    phone: string,
    name: string | null,
  ): Promise<Contact> {
    const existingContact = await this.contactRepository.findOne({
      where: {
        companyId,
        phone,
      },
    });

    if (!existingContact) {
      return this.contactRepository.save({
        companyId,
        phone,
        name: name ?? phone,
      });
    }

    if (name && existingContact.name !== name) {
      return this.contactRepository.save({
        ...existingContact,
        name,
      });
    }

    return existingContact;
  }

  private shouldRespondToClient(
    company: Company | null,
    contact: Contact,
  ): boolean {
    if (!company?.isClientsSupportEnabled) {
      return false;
    }

    const scope = company.agentReplyScope ?? 'all';
    if (scope === 'all') {
      return true;
    }

    const namePattern = this.normalizeOptionalValue(
      company.agentReplyNamePattern,
    );
    const listEntries = this.normalizeValues(company.agentReplyListEntries);
    const matchesNamePattern = namePattern
      ? contact.name.toLowerCase().includes(namePattern)
      : true;

    if (!matchesNamePattern) {
      return false;
    }

    if (!namePattern && listEntries.length === 0) {
      return false;
    }

    if (!company.agentReplyListMode || listEntries.length === 0) {
      return true;
    }

    const matchesList = this.buildContactSearchFields(contact).some((field) =>
      listEntries.some((entry) => field.includes(entry)),
    );

    if (company.agentReplyListMode === 'whitelist') {
      return matchesList;
    }

    return !matchesList;
  }

  private buildContactSearchFields(contact: Contact): string[] {
    return [contact.name, contact.phone, contact.instagram]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.toLowerCase());
  }

  private normalizeValues(values: unknown): string[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);
  }

  private normalizeOptionalValue(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private extractImmediateText(
    payload: EvolutionMessagesUpsertPayload,
  ): string | null {
    const textMessage =
      payload.message?.conversation ||
      payload.message?.extendedTextMessage?.text;

    if (typeof textMessage !== 'string') {
      return null;
    }

    const normalizedText = textMessage.trim();
    return normalizedText.length > 0 ? normalizedText : null;
  }

  private getIngressIgnoredReason(
    payload: EvolutionMessagesUpsertPayload,
  ): string | null {
    if (!this.isSupportedRemoteJid(payload.key.remoteJid)) {
      return 'unsupported_remote_jid';
    }

    if (this.extractImmediateText(payload)) {
      return null;
    }

    if (payload.message?.audioMessage?.url) {
      return null;
    }

    return 'unsupported_message_type';
  }

  private isSupportedRemoteJid(remoteJid: string | undefined): boolean {
    return (
      typeof remoteJid === 'string' && remoteJid.endsWith('@s.whatsapp.net')
    );
  }

  private async handleFromMeMessage(
    companyId: string,
    contact: Contact,
    messageText: string,
  ): Promise<void> {
    const existingMessage = await this.memoryRepository.findOne({
      where: {
        companyId,
        sessionId: contact.id,
        role: 'assistant',
        content: messageText,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!existingMessage) {
      this.logger.log(
        `Human detected responding to contact ${contact.name}. Setting ignoreUntil to 6 hours.`,
      );

      const ignoreUntil = new Date();
      ignoreUntil.setHours(ignoreUntil.getHours() + 6);

      await this.contactRepository.update({ id: contact.id }, { ignoreUntil });
    }
  }
}
