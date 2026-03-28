import { ForbiddenException } from '@nestjs/common';
import { In, type Repository } from 'typeorm';
import type { Company } from '../entities/company.entity';
import type { UserCompany } from '../entities/user-company.entity';

export type UserCompanyWithCompany = UserCompany & { company: Company };
const MANAGED_COMPANY_ROLES = ['owner', 'admin'] as const;

export async function findManagedUserCompany(
  userCompanyRepository: Repository<UserCompany>,
  userId: string,
): Promise<UserCompanyWithCompany | null> {
  const runningUserCompany = (await userCompanyRepository.findOne({
    where: {
      userId,
      role: In([...MANAGED_COMPANY_ROLES]),
      company: { step: 'running' },
    },
    relations: ['company'],
    order: { createdAt: 'DESC' },
  })) as UserCompanyWithCompany | null;

  if (runningUserCompany) {
    return runningUserCompany;
  }

  const latestManagedUserCompany = (await userCompanyRepository.findOne({
    where: {
      userId,
      role: In([...MANAGED_COMPANY_ROLES]),
    },
    relations: ['company'],
    order: { createdAt: 'DESC' },
  })) as UserCompanyWithCompany | null;

  if (latestManagedUserCompany) {
    return latestManagedUserCompany;
  }

  const latestLinkedUserCompany = await userCompanyRepository.findOne({
    where: { userId },
    order: { createdAt: 'DESC' },
  });

  if (latestLinkedUserCompany) {
    throw new ForbiddenException(
      'Only company owners and admins can manage company data',
    );
  }

  return null;
}

export { MANAGED_COMPANY_ROLES };
