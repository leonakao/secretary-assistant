import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { SessionGuard } from 'src/modules/auth/guards/session.guard';
import { normalizeAudioMimeType } from 'src/modules/ai/services/audio-mime-type';
import { SendOnboardingMessageDto } from '../dto/send-onboarding-message.dto';
import { GetOnboardingMessagesUseCase } from '../use-cases/get-onboarding-messages.use-case';
import { InitializeOnboardingConversationUseCase } from '../use-cases/initialize-onboarding-conversation.use-case';
import { SendOnboardingMessageUseCase } from '../use-cases/send-onboarding-message.use-case';
import type { User } from 'src/modules/users/entities/user.entity';

@Controller('onboarding/messages')
export class OnboardingMessagesController {
  constructor(
    private readonly getOnboardingMessages: GetOnboardingMessagesUseCase,
    private readonly initializeOnboardingConversation: InitializeOnboardingConversationUseCase,
    private readonly sendOnboardingMessage: SendOnboardingMessageUseCase,
  ) {}

  @Get()
  @UseGuards(SessionGuard)
  async getMessages(@CurrentUser() user: User) {
    return this.getOnboardingMessages.execute(user);
  }

  @Post('initialize')
  @UseGuards(SessionGuard)
  async initialize(@CurrentUser() user: User) {
    return this.initializeOnboardingConversation.execute(user);
  }

  @Post()
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor('audio'))
  async sendMessage(
    @CurrentUser() user: User,
    @Body() dto: SendOnboardingMessageDto,
    @UploadedFile() audio?: { buffer: Buffer; mimetype: string },
  ) {
    if (dto.kind === 'audio' || audio) {
      if (!audio) {
        throw new BadRequestException('Audio file is required');
      }

      const declaredMimeType = dto.mimeType
        ? normalizeAudioMimeType(dto.mimeType)
        : undefined;
      const actualMimeType = normalizeAudioMimeType(audio.mimetype);

      if (declaredMimeType && declaredMimeType !== actualMimeType) {
        throw new BadRequestException('Audio mime type does not match upload');
      }

      return this.sendOnboardingMessage.execute(user, {
        kind: 'audio',
        audioBuffer: audio.buffer,
        mimeType: actualMimeType,
        durationMs: dto.durationMs ? Number(dto.durationMs) : undefined,
      });
    }

    if (!dto.message?.trim()) {
      throw new BadRequestException('Message is required');
    }

    return this.sendOnboardingMessage.execute(user, {
      kind: 'text',
      message: dto.message.trim(),
    });
  }
}
