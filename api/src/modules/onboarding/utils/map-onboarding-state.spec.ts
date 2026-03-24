import { describe, it, expect } from 'vitest';
import { mapOnboardingState } from './map-onboarding-state';
import type { Company } from 'src/modules/companies/entities/company.entity';
import type { UserCompany } from 'src/modules/companies/entities/user-company.entity';

function makeUserCompany(
  companyStep: 'onboarding' | 'running',
  role: 'owner' | 'admin' | 'employee' = 'owner',
): UserCompany & { company: Company } {
  return {
    id: 'uc-1',
    userId: 'user-1',
    companyId: 'company-1',
    role,
    company: {
      id: 'company-1',
      name: 'Acme',
      step: companyStep,
      description: null,
      isClientsSupportEnabled: false,
      userCompanies: [],
      contacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as Company,
    user: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as UserCompany & { company: Company };
}

describe('mapOnboardingState', () => {
  it('returns company-bootstrap when user has no company relation', () => {
    const result = mapOnboardingState(null);

    expect(result).toEqual({
      company: null,
      onboarding: {
        requiresOnboarding: true,
        step: 'company-bootstrap',
      },
    });
  });

  it('returns assistant-chat when user has an onboarding company', () => {
    const result = mapOnboardingState(makeUserCompany('onboarding'));

    expect(result).toEqual({
      company: {
        id: 'company-1',
        name: 'Acme',
        step: 'onboarding',
        role: 'owner',
      },
      onboarding: {
        requiresOnboarding: true,
        step: 'assistant-chat',
      },
    });
  });

  it('returns complete when user has a running company', () => {
    const result = mapOnboardingState(makeUserCompany('running'));

    expect(result).toEqual({
      company: {
        id: 'company-1',
        name: 'Acme',
        step: 'running',
        role: 'owner',
      },
      onboarding: {
        requiresOnboarding: false,
        step: 'complete',
      },
    });
  });

  it('preserves the role from the user-company relation', () => {
    const result = mapOnboardingState(makeUserCompany('running', 'admin'));

    expect(result.company?.role).toBe('admin');
  });
});
