import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import {
  mapOnboardingState,
  type OnboardingCompanyResult,
  type OnboardingStateResult,
} from 'src/modules/onboarding/utils/map-onboarding-state';
import type { User } from '../entities/user.entity';

export interface GetUsersMeResult {
  id: string;
  authProviderId: string | null;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  company: OnboardingCompanyResult | null;
  onboarding: OnboardingStateResult['onboarding'];
}

@Injectable()
export class GetUsersMeUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
  ) {}

  async execute(user: User): Promise<GetUsersMeResult> {
    const userCompany = await this.userCompanyRepository.findOne({
      where: { userId: user.id },
      relations: ['company'],
      order: { createdAt: 'ASC' },
    });

    const { company, onboarding } = mapOnboardingState(
      userCompany as (UserCompany & { company: any }) | null,
    );

    return {
      id: user.id,
      authProviderId: user.authProviderId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      company,
      onboarding,
    };
  }
}
