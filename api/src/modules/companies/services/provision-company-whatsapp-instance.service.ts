import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvolutionService } from 'src/modules/evolution/services/evolution.service';
import { Company } from '../entities/company.entity';
import { BuildCompanyEvolutionInstanceNameService } from './build-company-evolution-instance-name.service';

@Injectable()
export class ProvisionCompanyWhatsAppInstanceService {
  private readonly logger = new Logger(
    ProvisionCompanyWhatsAppInstanceService.name,
  );

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly evolutionService: EvolutionService,
    private readonly buildInstanceName: BuildCompanyEvolutionInstanceNameService,
    private readonly configService: ConfigService,
  ) {}

  async execute(company: Company): Promise<Company> {
    if (company.evolutionInstanceName) {
      throw new ConflictException(
        'Company already has a provisioned WhatsApp instance',
      );
    }

    const instanceName = this.buildInstanceName.execute(company.name);

    await this.evolutionService.createInstance({
      instanceName,
      rejectCall: false,
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
      webhook: {
        url: this.buildWebhookUrl(company.id),
        byEvents: true,
        base64: true,
        headers: this.buildWebhookHeaders(),
        events: ['MESSAGES_UPSERT'],
      },
    });

    company.evolutionInstanceName = instanceName;

    return this.companyRepository.save(company);
  }

  async tryProvision(company: Company): Promise<Company> {
    if (company.evolutionInstanceName) {
      return company;
    }

    try {
      return await this.execute(company);
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to provision WhatsApp instance for company ${company.id}: ${cause}`,
      );
      return company;
    }
  }

  private buildWebhookUrl(companyId: string): string {
    const webhookBaseUrl =
      this.configService.get<string>('EVOLUTION_WEBHOOK_BASE_URL')?.trim() ||
      this.configService.get<string>('API_PUBLIC_URL')?.trim() ||
      `http://localhost:${this.configService.get<string>('PORT') || '3000'}`;

    // Evolution appends the event path itself when byEvents=true.
    return `${webhookBaseUrl.replace(/\/$/, '')}/webhooks/evolution/${companyId}`;
  }

  private buildWebhookHeaders(): Record<string, string> | undefined {
    const token = this.configService.get<string>('EVOLUTION_API_TOKEN')?.trim();

    if (!token) {
      return undefined;
    }

    return {
      'x-evolution-token': token,
    };
  }
}
