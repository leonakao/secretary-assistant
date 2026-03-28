import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SendOnboardingMessageUseCase } from './send-onboarding-message.use-case';

function makeUser() {
  return {
    id: 'user-1',
    name: 'Alice',
  } as any;
}

function makeRunResult() {
  return {
    userMessage: {
      id: 'mem-user',
      role: 'user' as const,
      content: 'texto',
      createdAt: '2026-03-27T10:00:00.000Z',
    },
    assistantMessage: {
      id: 'mem-assistant',
      role: 'assistant' as const,
      content: 'resposta',
      createdAt: '2026-03-27T10:00:01.000Z',
    },
    onboardingState: {
      company: {
        id: 'company-1',
        name: 'Acme',
        businessType: 'Clínica odontológica',
        step: 'onboarding' as const,
        role: 'owner' as const,
      },
      onboarding: {
        requiresOnboarding: true,
        step: 'assistant-chat' as const,
      },
    },
  };
}

describe('SendOnboardingMessageUseCase', () => {
  it('returns canonical persisted messages for text sends', async () => {
    const findOne = vi.fn().mockResolvedValue({
      companyId: 'company-1',
      company: { step: 'onboarding' },
    });
    const userCompanyRepo = { findOne };
    const onboardingConversationService = {
      run: vi.fn().mockResolvedValue(makeRunResult()),
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

    expect(onboardingConversationService.run).toHaveBeenCalledWith({
      userId: 'user-1',
      companyId: 'company-1',
      message: 'texto',
    });
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', company: { step: 'onboarding' } },
      }),
    );
    expect(result.userMessage.content).toBe('texto');
    expect(result.assistantMessage.content).toBe('resposta');
  });

  it('transcribes audio and persists only the transcribed text', async () => {
    const userCompanyRepo = {
      findOne: vi.fn().mockResolvedValue({ companyId: 'company-1' }),
    };
    const onboardingConversationService = {
      run: vi.fn().mockResolvedValue({
        ...makeRunResult(),
        userMessage: {
          id: 'mem-user',
          role: 'user' as const,
          content: 'preciso agendar',
          createdAt: '2026-03-27T10:00:00.000Z',
        },
      }),
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
    expect(onboardingConversationService.run).toHaveBeenCalledWith({
      userId: 'user-1',
      companyId: 'company-1',
      message: 'preciso agendar',
    });
    expect(result.userMessage.content).toBe('preciso agendar');
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
