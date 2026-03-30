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
      {
        tryProvision: vi.fn().mockImplementation(async (company) => company),
      } as any,
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

  it('tries to provision WhatsApp after creating the company and relation', async () => {
    const company = {
      id: 'company-1',
      name: 'Acme',
      businessType: 'Clínica odontológica',
      step: 'onboarding',
    };
    const companyRepo = {
      create: vi.fn().mockImplementation((value) => value),
      save: vi.fn().mockResolvedValue(company),
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
    const provisionCompanyWhatsAppInstance = {
      tryProvision: vi.fn().mockResolvedValue({
        ...company,
        evolutionInstanceName: 'sa-company-company-1',
      }),
    };
    const useCase = new CreateOnboardingCompanyUseCase(
      companyRepo as any,
      userCompanyRepo as any,
      provisionCompanyWhatsAppInstance as any,
    );

    await useCase.execute(makeUser(), {
      name: 'Acme',
      businessType: 'Clínica odontológica',
    });

    expect(provisionCompanyWhatsAppInstance.tryProvision).toHaveBeenCalledWith(
      company,
    );
  });

  it('keeps company creation successful when provisioning fails internally', async () => {
    const company = {
      id: 'company-1',
      name: 'Acme',
      businessType: 'Clínica odontológica',
      step: 'onboarding',
    };
    const companyRepo = {
      create: vi.fn().mockImplementation((value) => value),
      save: vi.fn().mockResolvedValue(company),
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
    const provisionCompanyWhatsAppInstance = {
      tryProvision: vi.fn().mockResolvedValue(company),
    };
    const useCase = new CreateOnboardingCompanyUseCase(
      companyRepo as any,
      userCompanyRepo as any,
      provisionCompanyWhatsAppInstance as any,
    );

    await expect(
      useCase.execute(makeUser(), {
        name: 'Acme',
        businessType: 'Clínica odontológica',
      }),
    ).resolves.toMatchObject({
      company: {
        id: 'company-1',
        name: 'Acme',
      },
      onboarding: {
        step: 'assistant-chat',
      },
    });
  });
});
