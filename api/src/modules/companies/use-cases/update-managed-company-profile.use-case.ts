import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from 'src/modules/users/entities/user.entity';
import { Company } from '../entities/company.entity';
import { UserCompany } from '../entities/user-company.entity';
import { findManagedUserCompany } from '../utils/find-managed-user-company';
import type { UpdateManagedCompanyProfileDto } from '../dto/update-managed-company-profile.dto';
import type {
  ManagedCompanyResponse,
  ManagedCompanyResult,
} from './company-management.types';

@Injectable()
export class UpdateManagedCompanyProfileUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async execute(
    user: User,
    dto: UpdateManagedCompanyProfileDto,
  ): Promise<ManagedCompanyResponse> {
    const userCompany = await findManagedUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No managed company found for this user');
    }

    const company = await this.companyRepository.save({
      ...userCompany.company,
      name: dto.name.trim(),
      businessType: dto.businessType ?? null,
    });

    return { company: this.toManagedCompanyResult(company) };
  }

  private toManagedCompanyResult(company: Company): ManagedCompanyResult {
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
