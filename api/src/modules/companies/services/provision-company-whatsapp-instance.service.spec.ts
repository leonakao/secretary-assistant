import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { ProvisionCompanyWhatsAppInstanceService } from './provision-company-whatsapp-instance.service';
import { BuildCompanyEvolutionInstanceNameService } from './build-company-evolution-instance-name.service';

describe('ProvisionCompanyWhatsAppInstanceService', () => {
  it('prefers EVOLUTION_WEBHOOK_BASE_URL when provisioning webhooks', async () => {
    const companyRepository = {
      save: vi.fn(async (company) => company),
    } as any;
    const evolutionService = {
      createInstance: vi.fn().mockResolvedValue({}),
    } as any;
    const configService = {
      get: vi.fn((key: string) => {
        if (key === 'EVOLUTION_WEBHOOK_BASE_URL') {
          return 'http://api:3000/';
        }

        if (key === 'EVOLUTION_API_TOKEN') {
          return 'secret-token';
        }

        return undefined;
      }),
    } as unknown as ConfigService;
    const service = new ProvisionCompanyWhatsAppInstanceService(
      companyRepository,
      evolutionService,
      new BuildCompanyEvolutionInstanceNameService(),
      configService,
    );

    await service.execute({
      id: 'company-1',
      name: 'Clínica São José',
      evolutionInstanceName: null,
    } as any);

    expect(evolutionService.createInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceName: 'sa-company-clinica-sao-jose',
        webhook: expect.objectContaining({
          url: 'http://api:3000/webhooks/evolution/company-1/messages-upsert',
          headers: {
            'x-evolution-token': 'secret-token',
          },
        }),
      }),
    );
  });
});
