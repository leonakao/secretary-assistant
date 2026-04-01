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
      agentReplyScope: 'all',
      agentReplyNamePattern: null,
      agentReplyListMode: null,
      agentReplyListEntries: [],
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
        agentReplyScope: 'all',
        agentReplyNamePattern: null,
        agentReplyListMode: null,
        agentReplyListEntries: [],
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
    expect(result.settings.agentReplyScope).toBe('all');
  });

  it('returns persisted reply settings fields in the managed settings payload', async () => {
    const useCase = new GetManagedWhatsAppSettingsUseCase(
      {
        findOne: vi.fn().mockResolvedValue(
          makeUserCompany({
            agentReplyScope: 'specific',
            agentReplyNamePattern: 'cliente',
            agentReplyListMode: 'whitelist',
            agentReplyListEntries: ['vip', 'orcamento'],
          }),
        ),
      } as any,
      {
        getInstanceStatus: vi
          .fn()
          .mockResolvedValue({ instance: { state: 'connecting' } }),
      } as any,
    );

    const result = await useCase.execute(makeUser());

    expect(result).toEqual({
      settings: {
        companyId: 'company-1',
        evolutionInstanceName: 'sa-company-company-1',
        hasProvisionedInstance: true,
        connectionStatus: 'connecting',
        agentEnabled: true,
        agentReplyScope: 'specific',
        agentReplyNamePattern: 'cliente',
        agentReplyListMode: 'whitelist',
        agentReplyListEntries: ['vip', 'orcamento'],
      },
    });
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
