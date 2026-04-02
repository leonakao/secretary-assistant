import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AudioTranscriptionService } from 'src/modules/ai/services/audio-transcription.service';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { OnboardingConversationService } from '../services/onboarding-conversation.service';
import { findActiveOnboardingUserCompany } from '../utils/find-active-user-company';

export type SendOnboardingMessageInput =
  | {
      kind: 'text';
      message: string;
    }
  | {
      kind: 'audio';
      audioBuffer: Buffer;
      mimeType: string;
      durationMs?: number;
    };

export interface SendOnboardingMessageResult {
  status: 'pending';
  userMessageId: string;
}

@Injectable()
export class SendOnboardingMessageUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly onboardingConversationService: OnboardingConversationService,
    private readonly audioTranscriptionService: AudioTranscriptionService,
  ) {}

  async execute(
    user: User,
    input: SendOnboardingMessageInput,
  ): Promise<SendOnboardingMessageResult> {
    const userCompany = await findActiveOnboardingUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No onboarding company found for this user');
    }

    // Resolve message text (transcription still happens sync for audio)
    const message = await this.resolveMessage(input);

    // Save user message
    const userMessage =
      await this.onboardingConversationService.saveUserMessage(
        user.id,
        userCompany.companyId,
        message,
      );

    // Fire assistant reply generation asynchronously (no await)
    void this.onboardingConversationService.generateAndSaveAssistantReplyAsync(
      user.id,
      userCompany.companyId,
    );

    return {
      status: 'pending',
      userMessageId: userMessage.id,
    };
  }

  private async resolveMessage(
    input: SendOnboardingMessageInput,
  ): Promise<string> {
    if (input.kind === 'text') {
      return input.message.trim();
    }

    if (!input.audioBuffer.length) {
      throw new BadRequestException('Audio file is empty');
    }

    const transcription = await this.audioTranscriptionService.transcribeAudio(
      input.audioBuffer,
      input.mimeType,
    );

    if (!transcription.trim()) {
      throw new BadRequestException(
        'Audio transcription returned empty content',
      );
    }

    return transcription.trim();
  }
}
