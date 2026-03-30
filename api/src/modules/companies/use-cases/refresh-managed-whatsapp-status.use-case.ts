import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from 'src/modules/users/entities/user.entity';
import { UserCompany } from '../entities/user-company.entity';
import { findManagedUserCompany } from '../utils/find-managed-user-company';
import type { ManagedWhatsAppSettingsResponse } from './company-management.types';
import { GetManagedWhatsAppSettingsUseCase } from './get-managed-whatsapp-settings.use-case';

@Injectable()
export class RefreshManagedWhatsAppStatusUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly getManagedWhatsAppSettings: GetManagedWhatsAppSettingsUseCase,
  ) {}

  async execute(user: User): Promise<ManagedWhatsAppSettingsResponse> {
    const userCompany = await findManagedUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No managed company found for this user');
    }

    if (!userCompany.company.evolutionInstanceName) {
      throw new ConflictException(
        'Company does not have a provisioned WhatsApp instance yet',
      );
    }

    return this.getManagedWhatsAppSettings.execute(user);
  }
}
