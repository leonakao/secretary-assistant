import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from 'src/modules/users/entities/user.entity';
import { UserCompany } from '../entities/user-company.entity';
import { findManagedUserCompany } from '../utils/find-managed-user-company';
import type { ManagedWhatsAppSettingsResponse } from './company-management.types';
import { GetManagedWhatsAppSettingsUseCase } from './get-managed-whatsapp-settings.use-case';
import { ProvisionCompanyWhatsAppInstanceService } from '../services/provision-company-whatsapp-instance.service';

@Injectable()
export class ProvisionManagedWhatsAppInstanceUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly provisionCompanyWhatsAppInstance: ProvisionCompanyWhatsAppInstanceService,
    private readonly getManagedWhatsAppSettings: GetManagedWhatsAppSettingsUseCase,
  ) {}

  async execute(user: User): Promise<ManagedWhatsAppSettingsResponse> {
    const userCompany = await findManagedUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      return this.getManagedWhatsAppSettings.execute(user);
    }

    await this.provisionCompanyWhatsAppInstance.execute(userCompany.company);

    return this.getManagedWhatsAppSettings.execute(user);
  }
}
