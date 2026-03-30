import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DisconnectManagedWhatsAppUseCase } from './disconnect-managed-whatsapp.use-case';

function makeUser() {
  return { id: 'user-1' } as any;
}

function makeManagedUserCompany(overrides?: Partial<any>) {
  return {
    id: 'relation-1',
    userId: 'user-1',
    companyId: 'company-1',
    role: 'owner',
    company: {
      id: 'company-1',
      evolutionInstanceName: 'sa-company-company-1',
      isClientsSupportEnabled: false,
      ...overrides,
    },
  };
}

describe('DisconnectManagedWhatsAppUseCase', () => {
  it('logs out the provisioned instance and returns managed settings', async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValue(makeManagedUserCompany()),
    } as any;
    const evolutionService = {
      logoutInstance: vi.fn().mockResolvedValue({}),
    } as any;
    const useCase = new DisconnectManagedWhatsAppUseCase(
      repository,
      evolutionService,
    );

    const result = await useCase.execute(makeUser());

    expect(evolutionService.logoutInstance).toHaveBeenCalledWith(
      'sa-company-company-1',
    );
    expect(result).toEqual({
      settings: {
        companyId: 'company-1',
        hasProvisionedInstance: true,
        connectionStatus: 'disconnected',
        evolutionInstanceName: 'sa-company-company-1',
        agentEnabled: false,
      },
    });
  });

  it('preserves instance linkage and disabled agent state after disconnect', async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValue(
        makeManagedUserCompany({
          evolutionInstanceName: 'sa-company-company-1',
          isClientsSupportEnabled: false,
        }),
      ),
    } as any;
    const evolutionService = {
      logoutInstance: vi.fn().mockResolvedValue({}),
    } as any;
    const useCase = new DisconnectManagedWhatsAppUseCase(
      repository,
      evolutionService,
    );

    const result = await useCase.execute(makeUser());

    expect(result).toEqual({
      settings: {
        companyId: 'company-1',
        hasProvisionedInstance: true,
        connectionStatus: 'disconnected',
        evolutionInstanceName: 'sa-company-company-1',
        agentEnabled: false,
      },
    });
  });

  it('fails predictably when the company has no provisioned instance', async () => {
    const useCase = new DisconnectManagedWhatsAppUseCase(
      {
        findOne: vi
          .fn()
          .mockResolvedValue(
            makeManagedUserCompany({ evolutionInstanceName: null }),
          ),
      } as any,
      { logoutInstance: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new DisconnectManagedWhatsAppUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { logoutInstance: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
