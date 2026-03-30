import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RefreshManagedWhatsAppStatusUseCase } from './refresh-managed-whatsapp-status.use-case';

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

describe('RefreshManagedWhatsAppStatusUseCase', () => {
  it('reuses the managed settings read contract for provisioned instances', async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValue(makeManagedCompany()),
    } as any;
    const getManagedWhatsAppSettings = {
      execute: vi.fn().mockResolvedValue({
        settings: { connectionStatus: 'connected' },
      }),
    } as any;
    const useCase = new RefreshManagedWhatsAppStatusUseCase(
      repository,
      getManagedWhatsAppSettings,
    );

    const result = await useCase.execute(makeUser());

    expect(getManagedWhatsAppSettings.execute).toHaveBeenCalledWith(makeUser());
    expect(result).toEqual({
      settings: { connectionStatus: 'connected' },
    });
  });

  it('fails predictably when the company has no provisioned instance', async () => {
    const useCase = new RefreshManagedWhatsAppStatusUseCase(
      {
        findOne: vi
          .fn()
          .mockResolvedValue(
            makeManagedCompany({ evolutionInstanceName: null }),
          ),
      } as any,
      { execute: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new RefreshManagedWhatsAppStatusUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { execute: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
