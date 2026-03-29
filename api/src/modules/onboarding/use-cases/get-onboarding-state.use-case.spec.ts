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
  it('returns company bootstrap state when user has no company', async () => {
    const useCase = new GetOnboardingStateUseCase({
      findOne: vi.fn().mockResolvedValue(null),
    } as any);

    const result = await useCase.execute(makeUser());

    expect(result.company).toBeNull();
    expect(result.onboarding.step).toBe('company-bootstrap');
  });

  it('returns assistant-chat when an onboarding company exists', async () => {
    const useCase = new GetOnboardingStateUseCase({
      findOne: vi.fn().mockResolvedValue(makeUserCompany()),
    } as any);

    const result = await useCase.execute(makeUser());

    expect(result.company?.id).toBe('company-1');
    expect(result.onboarding.step).toBe('assistant-chat');
  });

  it('prefers the active onboarding company over older company relations', async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce(makeUserCompany('onboarding'))
      .mockResolvedValueOnce(makeUserCompany('running'));
    const useCase = new GetOnboardingStateUseCase({ findOne } as any);

    const result = await useCase.execute(makeUser());

    expect(findOne).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { userId: 'user-1', company: { step: 'onboarding' } },
      }),
    );
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(result.onboarding.step).toBe('assistant-chat');
  });
});
