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

    if (key.fromMe) {
      return {
        message: '',
        actions: [],
      };
    }

    const remoteJid = key.remoteJid;
    const phone = this.extractPhoneFromJid(remoteJid);

    // Extract or transcribe message text
    const messageText = await this.extractOrTranscribeMessage(messageContent);

    if (!messageText) {
      return {
        message: '',
        actions: [],
      };
    }

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
        const { message, actions } =
          await this.onboardingStrategy.handleConversation({
            companyId,
            instanceName,
            remoteJid,
            message: messageText,
            userId: user.id,
          });

        return {
          message,
          actions,
        };
      }

      const { message, actions } = await this.ownerStrategy.handleConversation({
        companyId,
        instanceName,
        remoteJid,
        message: messageText,
        userId: user.id,
      });

      return {
        message,
        actions,
      };
    }

    if (!company?.isClientsSupportEnabled) {
      this.logger.log(
        `Clients support is disabled for company ${companyId}. Ignoring message from contact ${phone}`,
      );
      return {
        message: '',
        actions: [],
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
        actions: [],
      };
    }

    if (contact.ignoreUntil && contact.ignoreUntil > new Date()) {
      this.logger.log(
        `Ignoring message from contact ${contact.id} until ${contact.ignoreUntil.toISOString()}`,
      );
      return {
        message: '',
        actions: [],
      };
    }

    const { message, actions } = await this.clientStrategy.handleConversation({
      companyId,
      instanceName,
      remoteJid,
      message: messageText,
      contactId: contact.id,
    });

    return {
      message,
      actions,
    };
  }

  private extractPhoneFromJid(remoteJid: string): string {
    return '+' + remoteJid.split('@')[0];
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
      try {
        this.logger.log('🎤 Audio message detected, transcribing...');

        const transcription =
          await this.audioTranscriptionService.transcribeAudioFromBase64(
            messageContent.base64!,
          );

        if (transcription) {
          this.logger.log(`✅ Audio transcribed: "${transcription}"`);
          return transcription;
        } else {
          this.logger.warn('⚠️ Audio transcription returned empty result');
          return '';
        }
      } catch (error) {
        this.logger.error('❌ Failed to transcribe audio:', error);
        // Return empty string if transcription fails
        return '';
      }
    }

    // No text or audio found
    return '';
  }
}
