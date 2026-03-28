import { describe, expect, it, vi } from 'vitest';
import { GetOnboardingStateUseCase } from './get-onboarding-state.use-case';

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

describe('GetOnboardingStateUseCase', () => {
  it('returns null conversation when user has no company', async () => {
    const useCase = new GetOnboardingStateUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { getConversationMessages: vi.fn() } as any,
    );

    const result = await useCase.execute(makeUser());

    expect(result.conversation).toBeNull();
    expect(result.onboarding.step).toBe('company-bootstrap');
  });

  it('marks conversation as uninitialized when transcript is empty', async () => {
    const useCase = new GetOnboardingStateUseCase(
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      { getConversationMessages: vi.fn().mockResolvedValue([]) } as any,
    );

    const result = await useCase.execute(makeUser());

    expect(result.conversation).toMatchObject({
      threadId: 'onboarding:company-1:user-1',
      isInitialized: false,
      messages: [],
    });
  });

  it('marks conversation as initialized when messages exist', async () => {
    const useCase = new GetOnboardingStateUseCase(
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

    expect(result.conversation).toMatchObject({
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

  it('prefers the active onboarding company over older company relations', async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce(makeUserCompany('onboarding'))
      .mockResolvedValueOnce(makeUserCompany('running'));
    const getConversationMessages = vi.fn().mockResolvedValue([]);
    const useCase = new GetOnboardingStateUseCase(
      { findOne } as any,
      { getConversationMessages } as any,
    );

    const result = await useCase.execute(makeUser());

    expect(findOne).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { userId: 'user-1', company: { step: 'onboarding' } },
      }),
    );
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(getConversationMessages).toHaveBeenCalledWith('user-1', 'company-1');
    expect(result.onboarding.step).toBe('assistant-chat');
  });
});
