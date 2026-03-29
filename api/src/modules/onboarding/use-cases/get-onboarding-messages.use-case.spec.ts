import { describe, expect, it, vi } from 'vitest';
import { GetOnboardingMessagesUseCase } from './get-onboarding-messages.use-case';

function makeUser() {
  return {
    id: 'user-1',
    name: 'Alice',
  } as any;
}

function makeUserCompany(step: 'onboarding' | 'running' = 'onboarding') {
  return {
    userId: 'user-1',
    companyId: 'company-1',
    role: 'owner',
    company: {
      id: 'company-1',
      name: 'Acme',
      description: null,
      businessType: 'Clínica odontológica',
      isClientsSupportEnabled: false,
      step,
    },
  };
}

describe('GetOnboardingMessagesUseCase', () => {
  it('returns null when user has no company', async () => {
    const useCase = new GetOnboardingMessagesUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { getConversationMessages: vi.fn() } as any,
    );

    const result = await useCase.execute(makeUser());

    expect(result).toBeNull();
  });

  it('marks conversation as uninitialized when transcript is empty', async () => {
    const useCase = new GetOnboardingMessagesUseCase(
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      { getConversationMessages: vi.fn().mockResolvedValue([]) } as any,
    );

    const result = await useCase.execute(makeUser());

    expect(result).toMatchObject({
      threadId: 'onboarding:company-1:user-1',
      isInitialized: false,
      messages: [],
    });
  });

  it('marks conversation as initialized when messages exist', async () => {
    const useCase = new GetOnboardingMessagesUseCase(
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      {
        getConversationMessages: vi.fn().mockResolvedValue([
          {
            id: 'mem-1',
            role: 'assistant',
            content: 'Olá',
            createdAt: new Date('2026-03-27T10:00:00.000Z'),
          },
        ]),
      } as any,
    );

    const result = await useCase.execute(makeUser());

    expect(result).toMatchObject({
      isInitialized: true,
      messages: [
        {
          id: 'mem-1',
          role: 'assistant',
          content: 'Olá',
          createdAt: '2026-03-27T10:00:00.000Z',
        },
      ],
    });
  });
});
