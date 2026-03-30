import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetManagedWhatsAppSettingsUseCase } from './get-managed-whatsapp-settings.use-case';

function makeUser() {
  return { id: 'user-1' } as any;
}

function makeUserCompany(overrides?: Partial<any>) {
  return {
    userId: 'user-1',
    companyId: 'company-1',
    company: {
      id: 'company-1',
      evolutionInstanceName: 'sa-company-company-1',
      isClientsSupportEnabled: true,
      ...overrides,
    },
  };
}

describe('GetManagedWhatsAppSettingsUseCase', () => {
  it('returns not-provisioned without calling Evolution when linkage is missing', async () => {
    const evolutionService = {
      getInstanceStatus: vi.fn(),
    } as any;
    const useCase = new GetManagedWhatsAppSettingsUseCase(
      {
        findOne: vi
          .fn()
          .mockResolvedValue(makeUserCompany({ evolutionInstanceName: null })),
      } as any,
      evolutionService,
    );

    const result = await useCase.execute(makeUser());

    expect(evolutionService.getInstanceStatus).not.toHaveBeenCalled();
    expect(result).toEqual({
      settings: {
        companyId: 'company-1',
        evolutionInstanceName: null,
        hasProvisionedInstance: false,
        connectionStatus: 'not-provisioned',
        agentEnabled: true,
      },
    });
  });

  it('returns connected when Evolution reports an open instance', async () => {
    const evolutionService = {
      getInstanceStatus: vi
        .fn()
        .mockResolvedValue({ instance: { state: 'open' } }),
    } as any;
    const useCase = new GetManagedWhatsAppSettingsUseCase(
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      evolutionService,
    );

    const result = await useCase.execute(makeUser());

    expect(evolutionService.getInstanceStatus).toHaveBeenCalledWith(
      'sa-company-company-1',
    );
    expect(result.settings.connectionStatus).toBe('connected');
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new GetManagedWhatsAppSettingsUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { getInstanceStatus: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when the user is linked only as employee', async () => {
    const useCase = new GetManagedWhatsAppSettingsUseCase(
      {
        findOne: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 'relation-employee',
            userId: 'user-1',
            companyId: 'company-1',
            role: 'employee',
          }),
      } as any,
      { getInstanceStatus: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
