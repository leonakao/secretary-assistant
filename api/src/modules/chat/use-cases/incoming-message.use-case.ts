import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { User } from '../../users/entities/user.entity';
import { UserCompany } from '../../companies/entities/user-company.entity';
import { Company } from '../../companies/entities/company.entity';
import { Memory } from '../entities/memory.entity';
import type { EvolutionMessagesUpsertPayload } from '../dto/evolution-message.dto';
import { ClientConversationStrategy } from '../strategies/client-conversation.strategy';
import { OwnerConversationStrategy } from '../strategies/owner-conversation.strategy';
import { OnboardingConversationStrategy } from '../strategies/onboarding-conversation.strategy';
import { ConversationResponse } from '../strategies';
import { AudioTranscriptionService } from '../../ai/services/audio-transcription.service';

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
    @InjectRepository(Memory)
    private memoryRepository: Repository<Memory>,
    private clientStrategy: ClientConversationStrategy,
    private ownerStrategy: OwnerConversationStrategy,
    private onboardingStrategy: OnboardingConversationStrategy,
    private audioTranscriptionService: AudioTranscriptionService,
  ) {}

  async execute(
    companyId: string,
    instanceName: string,
    payload: EvolutionMessagesUpsertPayload,
  ): Promise<ConversationResponse> {
    const { key, message: messageContent } = payload;

    const remoteJid = key.remoteJid;
    const phone = this.extractPhoneFromJid(remoteJid);
    const messageText = await this.extractOrTranscribeMessage(messageContent);

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    const userCompany = await this.userCompanyRepository.findOne({
      where: {
        companyId,
        user: { phone },
      },
      relations: ['user'],
    });

    if (userCompany) {
      const user = userCompany.user;

      if (company?.step === 'onboarding') {
        const { message } = await this.onboardingStrategy.handleConversation({
          companyId,
          instanceName,
          remoteJid,
          message: messageText,
          userId: user.id,
        });

        return {
          message,
        };
      }

      const { message } = await this.ownerStrategy.handleConversation({
        companyId,
        instanceName,
        remoteJid,
        message: messageText,
        userId: user.id,
      });

      return {
        message,
      };
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
      return {
        message: '',
      };
    }

    if (!this.shouldRespondToClient(company, contact)) {
      this.logger.log(
        `Clients support is disabled or filtered out for company ${companyId}. Ignoring message from contact ${phone}`,
      );
      return {
        message: '',
      };
    }

    if (key.fromMe) {
      await this.handleFromMeMessage(companyId, contact, messageText);
      return {
        message: '',
      };
    }

    if (contact.ignoreUntil && contact.ignoreUntil > new Date()) {
      this.logger.log(
        `Ignoring message from contact ${contact.id} until ${contact.ignoreUntil.toISOString()}`,
      );
      return {
        message: '',
      };
    }

    const { message } = await this.clientStrategy.handleConversation({
      companyId,
      instanceName,
      remoteJid,
      message: messageText,
      contactId: contact.id,
    });

    return {
      message,
    };
  }

  private extractPhoneFromJid(remoteJid: string): string {
    return '+' + remoteJid.split('@')[0];
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

  /**
   * Extract text from message or transcribe audio if it's an audio message
   */
  private async extractOrTranscribeMessage(
    messageContent: EvolutionMessagesUpsertPayload['message'],
  ): Promise<string> {
    // Check for text messages first
    const textMessage =
      messageContent?.conversation || messageContent?.extendedTextMessage?.text;

    if (textMessage) {
      return textMessage;
    }

    // Check for audio message
    if (messageContent?.audioMessage?.url) {
      this.logger.log('🎤 Audio message detected, transcribing...');

      const transcription =
        await this.audioTranscriptionService.transcribeAudio(
          messageContent.base64!,
          messageContent.audioMessage.mimetype,
        );

      if (transcription) {
        this.logger.log(`✅ Audio transcribed: "${transcription}"`);
        return transcription;
      } else {
        this.logger.warn('⚠️ Audio transcription returned empty result');
        return '';
      }
    }

    // No text or audio found
    throw new BadRequestException('No text or audio found in message');
  }

  /**
   * Handle fromMe messages - detect if a human is responding to a client
   * If the message doesn't exist in our conversation memory, it means
   * a human user is manually responding, so we update ignoreUntil
   */
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
      // Message doesn't exist in memory - a human is responding
      this.logger.log(
        `🧑 Human detected responding to contact ${contact.name}. Setting ignoreUntil to 6 hours.`,
      );

      const ignoreUntil = new Date();
      ignoreUntil.setHours(ignoreUntil.getHours() + 6);

      await this.contactRepository.update(
        { id: contact.id },
        { ignoreUntil: ignoreUntil },
      );
    }
  }
}
