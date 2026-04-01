import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvolutionService } from 'src/modules/evolution/services/evolution.service';
import type { User } from 'src/modules/users/entities/user.entity';
import { UserCompany } from '../entities/user-company.entity';
import { findManagedUserCompany } from '../utils/find-managed-user-company';
import type { ManagedWhatsAppSettingsResponse } from './company-management.types';

@Injectable()
export class DisconnectManagedWhatsAppUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly evolutionService: EvolutionService,
  ) {}

  async execute(user: User): Promise<ManagedWhatsAppSettingsResponse> {
    const userCompany = await findManagedUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No managed company found for this user');
    }

    const company = userCompany.company;
    const instanceName = company.evolutionInstanceName;

    if (!instanceName) {
      throw new ConflictException(
        'Company does not have a provisioned WhatsApp instance yet',
      );
    }

    await this.evolutionService.logoutInstance(instanceName);

    return {
      settings: {
        companyId: company.id,
        evolutionInstanceName: instanceName,
        hasProvisionedInstance: true,
        connectionStatus: 'disconnected',
        agentEnabled: company.isClientsSupportEnabled,
        agentReplyScope: company.agentReplyScope ?? 'all',
        agentReplyNamePattern: company.agentReplyNamePattern ?? null,
        agentReplyListMode: company.agentReplyListMode ?? null,
        agentReplyListEntries: Array.isArray(company.agentReplyListEntries)
          ? company.agentReplyListEntries
          : [],
      },
    };
  }
}
