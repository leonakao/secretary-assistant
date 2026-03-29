import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import {
  mapOnboardingState,
  type OnboardingCompanyResult,
  type OnboardingStateResult,
} from '../utils/map-onboarding-state';
import type { User } from 'src/modules/users/entities/user.entity';
import { findPreferredUserCompanyForOnboardingState } from '../utils/find-active-user-company';

export interface GetOnboardingStateResult {
  company: OnboardingCompanyResult | null;
  onboarding: OnboardingStateResult['onboarding'];
}

@Injectable()
export class GetOnboardingStateUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
  ) {}

  async execute(user: User): Promise<GetOnboardingStateResult> {
    const userCompany = await findPreferredUserCompanyForOnboardingState(
      this.userCompanyRepository,
      user.id,
    );

    const { company, onboarding } = mapOnboardingState(
      userCompany as (UserCompany & { company: Company }) | null,
    );

    return { company, onboarding };
  }
}
