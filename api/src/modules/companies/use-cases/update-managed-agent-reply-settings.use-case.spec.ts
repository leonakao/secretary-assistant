import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UpdateManagedAgentReplySettingsUseCase } from './update-managed-agent-reply-settings.use-case';

function makeUser() {
  return { id: 'user-1' } as any;
}

describe('UpdateManagedAgentReplySettingsUseCase', () => {
  it('updates company reply filters and returns managed settings', async () => {
    const company = {
      id: 'company-1',
      evolutionInstanceName: 'sa-company-company-1',
      isClientsSupportEnabled: false,
      agentReplyScope: 'all',
      agentReplyNamePattern: null,
      agentReplyListMode: null,
      agentReplyListEntries: [],
    };
    const save = vi.fn().mockResolvedValue(undefined);
    const getManagedWhatsAppSettings = {
      execute: vi.fn().mockResolvedValue({
        settings: {
          agentReplyScope: 'specific',
        },
      }),
    };
    const useCase = new UpdateManagedAgentReplySettingsUseCase(
      {
        findOne: vi.fn().mockResolvedValue({
          company,
        }),
        manager: { save },
      } as any,
      getManagedWhatsAppSettings as any,
    );

    const result = await useCase.execute(makeUser(), {
      scope: 'specific',
      namePattern: 'cliente',
      listMode: 'whitelist',
      listEntries: ['vip', 'orcamento'],
    });

    expect(company.agentReplyScope).toBe('specific');
    expect(company.agentReplyNamePattern).toBe('cliente');
    expect(company.agentReplyListMode).toBe('whitelist');
    expect(company.agentReplyListEntries).toEqual(['vip', 'orcamento']);
    expect(company.evolutionInstanceName).toBe('sa-company-company-1');
    expect(company.isClientsSupportEnabled).toBe(false);
    expect(save).toHaveBeenCalledWith(company);
    expect(result).toEqual({
      settings: {
        agentReplyScope: 'specific',
      },
    });
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new UpdateManagedAgentReplySettingsUseCase(
      {
        findOne: vi.fn().mockResolvedValue(null),
      } as any,
      { execute: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), {
        scope: 'specific',
        namePattern: null,
        listMode: null,
        listEntries: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
