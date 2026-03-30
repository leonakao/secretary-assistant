import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from 'src/modules/users/entities/user.entity';
import { EvolutionService } from 'src/modules/evolution/services/evolution.service';
import { UserCompany } from '../entities/user-company.entity';
import { findManagedUserCompany } from '../utils/find-managed-user-company';
import type {
  ManagedWhatsAppConnectionStatus,
  ManagedWhatsAppSettingsResponse,
} from './company-management.types';

@Injectable()
export class GetManagedWhatsAppSettingsUseCase {
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

    const { company } = userCompany;
    const instanceName = company.evolutionInstanceName ?? null;

    if (!instanceName) {
      return {
        settings: {
          companyId: company.id,
          evolutionInstanceName: null,
          hasProvisionedInstance: false,
          connectionStatus: 'not-provisioned',
          agentEnabled: company.isClientsSupportEnabled,
        },
      };
    }

    const status = await this.evolutionService.getInstanceStatus(instanceName);

    return {
      settings: {
        companyId: company.id,
        evolutionInstanceName: instanceName,
        hasProvisionedInstance: true,
        connectionStatus: this.mapConnectionStatus(status),
        agentEnabled: company.isClientsSupportEnabled,
      },
    };
  }

  private mapConnectionStatus(payload: any): ManagedWhatsAppConnectionStatus {
    const candidates = [
      payload?.instance?.state,
      payload?.instance?.status,
      payload?.response?.instance?.state,
      payload?.response?.instance?.status,
      payload?.response?.state,
      payload?.response?.status,
      payload?.state,
      payload?.status,
    ]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.toLowerCase());

    if (
      candidates.some((value) =>
        ['open', 'connected', 'online'].includes(value),
      )
    ) {
      return 'connected';
    }

    if (
      candidates.some((value) =>
        ['connecting', 'qrcode', 'qr', 'pairing'].includes(value),
      )
    ) {
      return 'connecting';
    }

    if (
      candidates.some((value) =>
        ['close', 'closed', 'disconnected', 'logout'].includes(value),
      )
    ) {
      return 'disconnected';
    }

    return 'unknown';
  }
}
