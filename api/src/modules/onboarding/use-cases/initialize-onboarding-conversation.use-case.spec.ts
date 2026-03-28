import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InitializeOnboardingConversationUseCase } from './initialize-onboarding-conversation.use-case';

function makeUser() {
  return {
    id: 'user-1',
    name: 'Alice',
  } as any;
}

describe('InitializeOnboardingConversationUseCase', () => {
  it('returns the assistant bootstrap message and onboarding state', async () => {
    const findOne = vi.fn().mockResolvedValue({
      companyId: 'company-1',
      company: { step: 'onboarding' },
    });
    const useCase = new InitializeOnboardingConversationUseCase(
      {
        findOne,
      } as any,
      {
        initializeThread: vi.fn().mockResolvedValue({
          initialized: true,
          assistantMessage: {
            id: 'mem-1',
            role: 'assistant',
            content: 'Olá! Meu nome é Julia.',
            createdAt: '2026-03-27T10:00:00.000Z',
          },
          onboardingState: {
            company: {
              id: 'company-1',
              name: 'Acme',
              businessType: 'Clínica odontológica',
              step: 'onboarding',
              role: 'owner',
            },
            onboarding: {
              requiresOnboarding: true,
              step: 'assistant-chat',
            },
          },
        }),
      } as any,
    );

    const result = await useCase.execute(makeUser());

    expect(result).toEqual({
      company: {
        id: 'company-1',
        name: 'Acme',
        businessType: 'Clínica odontológica',
        step: 'onboarding',
        role: 'owner',
      },
      onboarding: {
        requiresOnboarding: true,
        step: 'assistant-chat',
      },
      initialized: true,
      assistantMessage: {
        id: 'mem-1',
        role: 'assistant',
        content: 'Olá! Meu nome é Julia.',
        createdAt: '2026-03-27T10:00:00.000Z',
      },
    });
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', company: { step: 'onboarding' } },
      }),
    );
  });

  it('throws when the user has no onboarding company', async () => {
    const useCase = new InitializeOnboardingConversationUseCase(
      {
        findOne: vi.fn().mockResolvedValue(null),
      } as any,
      {
        initializeThread: vi.fn(),
      } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
