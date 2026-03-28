import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from 'src/modules/users/entities/user.entity';
import { UserCompany } from '../entities/user-company.entity';
import { findManagedUserCompany } from '../utils/find-managed-user-company';
import type {
  ManagedCompanyResponse,
  ManagedCompanyResult,
} from './company-management.types';

@Injectable()
export class GetManagedCompanyUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
  ) {}

  async execute(user: User): Promise<ManagedCompanyResponse> {
    const userCompany = await findManagedUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No managed company found for this user');
    }

    return { company: this.toManagedCompanyResult(userCompany.company) };
  }

  private toManagedCompanyResult(
    company: UserCompany['company'],
  ): ManagedCompanyResult {
    return {
      id: company.id,
      name: company.name,
      businessType: company.businessType ?? null,
      description: company.description ?? null,
      step: company.step,
      updatedAt: company.updatedAt,
    };
  }
}
