import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProvisionManagedWhatsAppInstanceUseCase } from './provision-managed-whatsapp-instance.use-case';

function makeUser() {
  return { id: 'user-1' } as any;
}

function makeManagedCompany(overrides?: Partial<any>) {
  return {
    id: 'relation-1',
    userId: 'user-1',
    role: 'owner',
    company: {
      id: 'company-1',
      evolutionInstanceName: null,
      isClientsSupportEnabled: false,
      ...overrides,
    },
  };
}

describe('ProvisionManagedWhatsAppInstanceUseCase', () => {
  it('provisions a missing instance and returns managed settings', async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValue(makeManagedCompany()),
    } as any;
    const provisionCompanyWhatsAppInstance = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as any;
    const getManagedWhatsAppSettings = {
      execute: vi.fn().mockResolvedValue({
        settings: { hasProvisionedInstance: true },
      }),
    } as any;
    const useCase = new ProvisionManagedWhatsAppInstanceUseCase(
      repository,
      provisionCompanyWhatsAppInstance,
      getManagedWhatsAppSettings,
    );

    const result = await useCase.execute(makeUser());

    expect(provisionCompanyWhatsAppInstance.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'company-1' }),
    );
    expect(getManagedWhatsAppSettings.execute).toHaveBeenCalledWith(makeUser());
    expect(result).toEqual({
      settings: { hasProvisionedInstance: true },
    });
  });

  it('surfaces a predictable failure when the company already has an instance', async () => {
    const repository = {
      findOne: vi
        .fn()
        .mockResolvedValue(
          makeManagedCompany({ evolutionInstanceName: 'sa-company-company-1' }),
        ),
    } as any;
    const useCase = new ProvisionManagedWhatsAppInstanceUseCase(
      repository,
      {
        execute: vi
          .fn()
          .mockRejectedValue(
            new ConflictException(
              'Company already has a provisioned WhatsApp instance',
            ),
          ),
      } as any,
      { execute: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
