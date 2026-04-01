import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { UpdateManagedAgentStateUseCase } from './update-managed-agent-state.use-case';

function makeUser() {
  return { id: 'user-1' } as any;
}

function makeManagedUserCompany() {
  return {
    id: 'relation-1',
    userId: 'user-1',
    companyId: 'company-1',
    role: 'owner',
    company: {
      id: 'company-1',
      evolutionInstanceName: 'sa-company-company-1',
      isClientsSupportEnabled: true,
      agentReplyScope: 'specific',
      agentReplyNamePattern: 'vip',
      agentReplyListMode: 'blacklist',
      agentReplyListEntries: ['spam'],
    },
  };
}

describe('UpdateManagedAgentStateUseCase', () => {
  it('updates isClientsSupportEnabled and returns managed settings', async () => {
    const company = makeManagedUserCompany().company;
    const repository = {
      findOne: vi.fn().mockResolvedValue({
        ...makeManagedUserCompany(),
        company,
      }),
      manager: {
        save: vi.fn().mockResolvedValue(undefined),
      },
    } as any;
    const getManagedWhatsAppSettings = {
      execute: vi.fn().mockResolvedValue({
        settings: {
          agentEnabled: false,
        },
      }),
    } as any;
    const useCase = new UpdateManagedAgentStateUseCase(
      repository,
      getManagedWhatsAppSettings,
    );

    const result = await useCase.execute(makeUser(), false);

    expect(company.isClientsSupportEnabled).toBe(false);
    expect(company.evolutionInstanceName).toBe('sa-company-company-1');
    expect(company.agentReplyScope).toBe('specific');
    expect(company.agentReplyNamePattern).toBe('vip');
    expect(company.agentReplyListMode).toBe('blacklist');
    expect(company.agentReplyListEntries).toEqual(['spam']);
    expect(repository.manager.save).toHaveBeenCalledWith(company);
    expect(getManagedWhatsAppSettings.execute).toHaveBeenCalledWith(makeUser());
    expect(result).toEqual({
      settings: {
        agentEnabled: false,
      },
    });
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new UpdateManagedAgentStateUseCase(
      {
        findOne: vi.fn().mockResolvedValue(null),
        manager: { save: vi.fn() },
      } as any,
      { execute: vi.fn() } as any,
    );

    await expect(useCase.execute(makeUser(), true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
