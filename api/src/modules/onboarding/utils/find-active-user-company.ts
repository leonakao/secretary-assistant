import type { Repository } from 'typeorm';
import type { Company } from 'src/modules/companies/entities/company.entity';
import type { UserCompany } from 'src/modules/companies/entities/user-company.entity';

type UserCompanyWithCompany = UserCompany & { company: Company };

export async function findActiveOnboardingUserCompany(
  userCompanyRepository: Repository<UserCompany>,
  userId: string,
): Promise<UserCompanyWithCompany | null> {
  return userCompanyRepository.findOne({
    where: { userId, company: { step: 'onboarding' } },
    relations: ['company'],
    order: { createdAt: 'DESC' },
  }) as Promise<UserCompanyWithCompany | null>;
}

export async function findPreferredUserCompanyForOnboardingState(
  userCompanyRepository: Repository<UserCompany>,
  userId: string,
): Promise<UserCompanyWithCompany | null> {
  const onboardingUserCompany = await findActiveOnboardingUserCompany(
    userCompanyRepository,
    userId,
  );

  if (onboardingUserCompany) {
    return onboardingUserCompany;
  }

  return userCompanyRepository.findOne({
    where: { userId },
    relations: ['company'],
    order: { createdAt: 'DESC' },
  }) as Promise<UserCompanyWithCompany | null>;
}
