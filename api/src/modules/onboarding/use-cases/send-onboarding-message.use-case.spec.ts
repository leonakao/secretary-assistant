import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SendOnboardingMessageUseCase } from './send-onboarding-message.use-case';

function makeUser() {
  return {
    id: 'user-1',
    name: 'Alice',
  } as any;
}

describe('SendOnboardingMessageUseCase', () => {
  it('returns canonical persisted messages for text sends', async () => {
    const findOne = vi.fn().mockResolvedValue({
      companyId: 'company-1',
      company: { step: 'onboarding' },
    });
    const userCompanyRepo = { findOne };
    const saveUserMessage = vi.fn().mockResolvedValue({
      id: 'mem-user',
      role: 'user' as const,
      content: 'texto',
      createdAt: '2026-03-27T10:00:00.000Z',
    });
    const generateAndSaveAssistantReplyAsync = vi.fn();
    const onboardingConversationService = {
      saveUserMessage,
      generateAndSaveAssistantReplyAsync,
    };
    const audioTranscriptionService = {
      transcribeAudio: vi.fn(),
    };
    const useCase = new SendOnboardingMessageUseCase(
      userCompanyRepo as any,
      onboardingConversationService as any,
      audioTranscriptionService as any,
    );

    const result = await useCase.execute(makeUser(), {
      kind: 'text',
      message: '  texto  ',
    });

    expect(saveUserMessage).toHaveBeenCalledWith(
      'user-1',
      'company-1',
      'texto',
    );
    expect(generateAndSaveAssistantReplyAsync).toHaveBeenCalledWith(
      'user-1',
      'company-1',
    );
    expect(result.status).toBe('pending');
    expect(result.userMessageId).toBe('mem-user');
  });

  it('transcribes audio and persists only the transcribed text', async () => {
    const userCompanyRepo = {
      findOne: vi.fn().mockResolvedValue({ companyId: 'company-1' }),
    };
    const saveUserMessage = vi.fn().mockResolvedValue({
      id: 'mem-user',
      role: 'user' as const,
      content: 'preciso agendar',
      createdAt: '2026-03-27T10:00:00.000Z',
    });
    const generateAndSaveAssistantReplyAsync = vi.fn();
    const onboardingConversationService = {
      saveUserMessage,
      generateAndSaveAssistantReplyAsync,
    };
    const audioTranscriptionService = {
      transcribeAudio: vi.fn().mockResolvedValue('preciso agendar'),
    };
    const useCase = new SendOnboardingMessageUseCase(
      userCompanyRepo as any,
      onboardingConversationService as any,
      audioTranscriptionService as any,
    );

    const result = await useCase.execute(makeUser(), {
      kind: 'audio',
      audioBuffer: Buffer.from('audio'),
      mimeType: 'audio/webm',
    });

    expect(audioTranscriptionService.transcribeAudio).toHaveBeenCalledWith(
      Buffer.from('audio'),
      'audio/webm',
    );
    expect(saveUserMessage).toHaveBeenCalledWith(
      'user-1',
      'company-1',
      'preciso agendar',
    );
    expect(result.status).toBe('pending');
    expect(result.userMessageId).toBe('mem-user');
  });

  it('leaves the thread unchanged when transcription is empty', async () => {
    const userCompanyRepo = {
      findOne: vi.fn().mockResolvedValue({ companyId: 'company-1' }),
    };
    const onboardingConversationService = {
      run: vi.fn(),
    };
    const audioTranscriptionService = {
      transcribeAudio: vi.fn().mockResolvedValue('   '),
    };
    const useCase = new SendOnboardingMessageUseCase(
      userCompanyRepo as any,
      onboardingConversationService as any,
      audioTranscriptionService as any,
    );

    await expect(
      useCase.execute(makeUser(), {
        kind: 'audio',
        audioBuffer: Buffer.from('audio'),
        mimeType: 'audio/webm',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(onboardingConversationService.run).not.toHaveBeenCalled();
  });

  it('throws when the user has no onboarding company', async () => {
    const useCase = new SendOnboardingMessageUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { run: vi.fn() } as any,
      { transcribeAudio: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), {
        kind: 'text',
        message: 'texto',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
