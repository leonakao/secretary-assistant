import { describe, expect, it, vi } from 'vitest';
import { CreateOnboardingCompanyUseCase } from './create-onboarding-company.use-case';

function makeUser() {
  return {
    id: 'user-1',
    name: 'Alice',
  } as any;
}

describe('CreateOnboardingCompanyUseCase', () => {
  it('persists businessType during bootstrap', async () => {
    const companyRepo = {
      create: vi.fn().mockImplementation((value) => value),
      save: vi.fn().mockResolvedValue({
        id: 'company-1',
        name: 'Acme',
        businessType: 'Clínica odontológica',
        step: 'onboarding',
      }),
    };
    const userCompanyRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((value) => value),
      save: vi.fn().mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-1',
        role: 'owner',
      }),
    };
    const useCase = new CreateOnboardingCompanyUseCase(
      companyRepo as any,
      userCompanyRepo as any,
    );

    await useCase.execute(makeUser(), {
      name: 'Acme',
      businessType: 'Clínica odontológica',
    });

    expect(companyRepo.create).toHaveBeenCalledWith({
      name: 'Acme',
      businessType: 'Clínica odontológica',
      step: 'onboarding',
    });
  });
});
