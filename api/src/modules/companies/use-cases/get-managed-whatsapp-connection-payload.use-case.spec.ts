import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GetManagedWhatsAppConnectionPayloadUseCase } from './get-managed-whatsapp-connection-payload.use-case';

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
      evolutionInstanceName: 'sa-company-company-1',
      isClientsSupportEnabled: true,
      ...overrides,
    },
  };
}

describe('GetManagedWhatsAppConnectionPayloadUseCase', () => {
  it('returns managed settings plus connection payload for a provisioned instance', async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValue(makeManagedCompany()),
    } as any;
    const evolutionService = {
      getConnectionPayload: vi.fn().mockResolvedValue({
        qrcode: { base64: 'qr-base64' },
        pairingCode: '123-456',
        expiresAt: '2026-03-29T19:30:00.000Z',
      }),
    } as any;
    const getManagedWhatsAppSettings = {
      execute: vi.fn().mockResolvedValue({
        settings: {
          companyId: 'company-1',
          evolutionInstanceName: 'sa-company-company-1',
          hasProvisionedInstance: true,
          connectionStatus: 'connecting',
          agentEnabled: true,
        },
      }),
    } as any;
    const useCase = new GetManagedWhatsAppConnectionPayloadUseCase(
      repository,
      evolutionService,
      getManagedWhatsAppSettings,
    );

    const result = await useCase.execute(makeUser());

    expect(evolutionService.getConnectionPayload).toHaveBeenCalledWith(
      'sa-company-company-1',
    );
    expect(result).toEqual({
      settings: {
        companyId: 'company-1',
        evolutionInstanceName: 'sa-company-company-1',
        hasProvisionedInstance: true,
        connectionStatus: 'connecting',
        agentEnabled: true,
      },
      connectionPayload: {
        qrCodeBase64: 'qr-base64',
        pairingCode: '123-456',
        expiresAt: '2026-03-29T19:30:00.000Z',
      },
    });
  });

  it('fails predictably when the company has no provisioned instance', async () => {
    const useCase = new GetManagedWhatsAppConnectionPayloadUseCase(
      {
        findOne: vi
          .fn()
          .mockResolvedValue(
            makeManagedCompany({ evolutionInstanceName: null }),
          ),
      } as any,
      { getConnectionPayload: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new GetManagedWhatsAppConnectionPayloadUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { getConnectionPayload: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
