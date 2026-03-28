import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AudioTranscriptionService } from 'src/modules/ai/services/audio-transcription.service';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { OnboardingConversationService } from '../services/onboarding-conversation.service';
import type {
  OnboardingCompanyResult,
  OnboardingStateResult,
} from '../utils/map-onboarding-state';
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
  company: OnboardingCompanyResult | null;
  onboarding: OnboardingStateResult['onboarding'];
  userMessage: {
    id: string;
    role: 'user';
    content: string;
    createdAt: string;
  };
  assistantMessage: {
    id: string;
    role: 'assistant';
    content: string;
    createdAt: string;
  };
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

    const message = await this.resolveMessage(input);

    const result = await this.onboardingConversationService.run({
      userId: user.id,
      companyId: userCompany.companyId,
      message,
    });

    if (!result.assistantMessage) {
      throw new InternalServerErrorException(
        'Onboarding assistant did not return a reply',
      );
    }

    return {
      company: result.onboardingState.company,
      onboarding: result.onboardingState.onboarding,
      userMessage: {
        ...result.userMessage,
        role: 'user',
      },
      assistantMessage: {
        ...result.assistantMessage,
        role: 'assistant',
      },
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
