import type { Company } from 'src/modules/companies/entities/company.entity';
import type { UserCompany } from 'src/modules/companies/entities/user-company.entity';

export interface OnboardingCompanyResult {
  id: string;
  name: string;
  businessType: string | null;
  step: 'onboarding' | 'running';
  role: 'owner' | 'admin' | 'employee';
}

export interface OnboardingStateResult {
  company: OnboardingCompanyResult | null;
  onboarding: {
    requiresOnboarding: boolean;
    step: 'company-bootstrap' | 'assistant-chat' | 'complete';
  };
}

export function mapOnboardingState(
  userCompany: (UserCompany & { company: Company }) | null,
): OnboardingStateResult {
  if (!userCompany) {
    return {
      company: null,
      onboarding: {
        requiresOnboarding: true,
        step: 'company-bootstrap',
      },
    };
  }

  const { company, role } = userCompany;

  if (company.step === 'onboarding') {
    return {
      company: {
        id: company.id,
        name: company.name,
        businessType: company.businessType ?? null,
        step: 'onboarding',
        role,
      },
      onboarding: {
        requiresOnboarding: true,
        step: 'assistant-chat',
      },
    };
  }

  return {
    company: {
      id: company.id,
      name: company.name,
      businessType: company.businessType ?? null,
      step: 'running',
      role,
    },
    onboarding: {
      requiresOnboarding: false,
      step: 'complete',
    },
  };
}
