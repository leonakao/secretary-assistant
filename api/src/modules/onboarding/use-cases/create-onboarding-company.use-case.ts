import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from 'src/modules/companies/entities/company.entity';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import {
  mapOnboardingState,
  type OnboardingCompanyResult,
  type OnboardingStateResult,
} from '../utils/map-onboarding-state';
import type { CreateOnboardingCompanyDto } from '../dto/create-onboarding-company.dto';
import type { User } from 'src/modules/users/entities/user.entity';

export interface CreateOnboardingCompanyResult {
  company: OnboardingCompanyResult | null;
  onboarding: OnboardingStateResult['onboarding'];
}

@Injectable()
export class CreateOnboardingCompanyUseCase {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
  ) {}

  async execute(
    user: User,
    dto: CreateOnboardingCompanyDto,
  ): Promise<CreateOnboardingCompanyResult> {
    const existing = await this.userCompanyRepository.findOne({
      where: { userId: user.id },
      relations: ['company'],
      order: { createdAt: 'ASC' },
    });

    if (existing) {
      const { company, onboarding } = mapOnboardingState(
        existing as UserCompany & { company: Company },
      );
      return { company, onboarding };
    }

    const company = await this.companyRepository.save(
      this.companyRepository.create({
        name: dto.name,
        step: 'onboarding',
      }),
    );

    const userCompany = await this.userCompanyRepository.save(
      this.userCompanyRepository.create({
        userId: user.id,
        companyId: company.id,
        role: 'owner',
      }),
    );

    userCompany.company = company;

    const { company: companyResult, onboarding } = mapOnboardingState(
      userCompany as UserCompany & { company: Company },
    );

    return { company: companyResult, onboarding };
  }
}
