import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from 'src/modules/users/entities/user.entity';
import { UserCompany } from '../entities/user-company.entity';
import { findManagedUserCompany } from '../utils/find-managed-user-company';
import type { ManagedWhatsAppSettingsResponse } from './company-management.types';
import { GetManagedWhatsAppSettingsUseCase } from './get-managed-whatsapp-settings.use-case';

export interface UpdateManagedAgentReplySettingsInput {
  scope: 'all' | 'specific';
  namePattern: string | null;
  listMode: 'whitelist' | 'blacklist' | null;
  listEntries: string[];
}

@Injectable()
export class UpdateManagedAgentReplySettingsUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly getManagedWhatsAppSettings: GetManagedWhatsAppSettingsUseCase,
  ) {}

  async execute(
    user: User,
    input: UpdateManagedAgentReplySettingsInput,
  ): Promise<ManagedWhatsAppSettingsResponse> {
    const userCompany = await findManagedUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No managed company found for this user');
    }

    userCompany.company.agentReplyScope = input.scope;
    userCompany.company.agentReplyNamePattern = input.namePattern;
    userCompany.company.agentReplyListMode = input.listMode;
    userCompany.company.agentReplyListEntries = input.listEntries;
    await this.userCompanyRepository.manager.save(userCompany.company);

    return this.getManagedWhatsAppSettings.execute(user);
  }
}
