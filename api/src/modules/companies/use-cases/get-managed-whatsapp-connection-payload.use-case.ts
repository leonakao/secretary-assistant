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
import type { ManagedWhatsAppConnectionPayloadResponse } from './company-management.types';
import { GetManagedWhatsAppSettingsUseCase } from './get-managed-whatsapp-settings.use-case';

@Injectable()
export class GetManagedWhatsAppConnectionPayloadUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly evolutionService: EvolutionService,
    private readonly getManagedWhatsAppSettings: GetManagedWhatsAppSettingsUseCase,
  ) {}

  async execute(user: User): Promise<ManagedWhatsAppConnectionPayloadResponse> {
    const userCompany = await findManagedUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No managed company found for this user');
    }

    const instanceName = userCompany.company.evolutionInstanceName;

    if (!instanceName) {
      throw new ConflictException(
        'Company does not have a provisioned WhatsApp instance yet',
      );
    }

    const [settingsResponse, payload] = await Promise.all([
      this.getManagedWhatsAppSettings.execute(user),
      this.evolutionService.getConnectionPayload(instanceName),
    ]);

    return {
      settings: settingsResponse.settings,
      connectionPayload: {
        qrCodeBase64:
          this.readString(
            payload?.base64,
            payload?.qrcode?.base64,
            payload?.qrcode,
            payload?.qrCode,
            payload?.response?.base64,
            payload?.response?.qrcode?.base64,
            payload?.response?.qrcode,
            payload?.response?.qrCode,
          ) ?? null,
        pairingCode:
          this.readString(
            payload?.pairingCode,
            payload?.code,
            payload?.response?.pairingCode,
            payload?.response?.code,
          ) ?? null,
        expiresAt:
          this.readString(
            payload?.expiresAt,
            payload?.expiration,
            payload?.response?.expiresAt,
            payload?.response?.expiration,
          ) ?? null,
      },
    };
  }

  private readString(...values: unknown[]): string | undefined {
    return values.find((value): value is string => typeof value === 'string');
  }
}
