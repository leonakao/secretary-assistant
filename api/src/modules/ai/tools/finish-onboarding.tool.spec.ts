import { describe, expect, it, vi } from 'vitest';
import { FinishOnboardingTool } from './finish-onboarding.tool';

describe('FinishOnboardingTool', () => {
  it('reads onboarding memories from the onboarding thread id instead of the raw user id', async () => {
    const companyRepository = {
      findOneByOrFail: vi.fn().mockResolvedValue({
        id: 'company-1',
        name: 'Luna Clean',
      }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const memoryRepository = {
      find: vi.fn().mockResolvedValue([
        {
          role: 'user',
          content: 'Atendemos de segunda a sexta.',
          createdAt: new Date('2026-03-28T12:00:00.000Z'),
        },
      ]),
    };
    const langchainService = {
      chat: vi
        .fn()
        .mockResolvedValue(
          '# Luna Clean\n\n## Horário de Atendimento\n- Segunda a sexta',
        ),
    };
    const tool = new FinishOnboardingTool(
      companyRepository as any,
      memoryRepository as any,
      langchainService as any,
    );

    const result = await tool.invoke({}, {
      context: {
        companyId: 'company-1',
        userId: 'user-1',
      },
      messages: [],
    } as any);

    expect(memoryRepository.find).toHaveBeenCalledWith({
      where: { sessionId: 'onboarding:company-1:user-1' },
      order: { createdAt: 'ASC' },
    });
    expect(companyRepository.update).toHaveBeenCalledWith(
      { id: 'company-1' },
      expect.objectContaining({
        description:
          '# Luna Clean\n\n## Horário de Atendimento\n- Segunda a sexta',
        step: 'running',
        isClientsSupportEnabled: false,
      }),
    );
    expect(result).toContain('Onboarding finalizado com sucesso');
  });

  it('falls back to the default description when the onboarding thread has no memories', async () => {
    const companyRepository = {
      findOneByOrFail: vi.fn().mockResolvedValue({
        id: 'company-1',
        name: 'Luna Clean',
      }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const memoryRepository = {
      find: vi.fn().mockResolvedValue([]),
    };
    const langchainService = {
      chat: vi.fn(),
    };
    const tool = new FinishOnboardingTool(
      companyRepository as any,
      memoryRepository as any,
      langchainService as any,
    );

    const result = await tool.invoke({}, {
      context: {
        companyId: 'company-1',
        userId: 'user-1',
      },
      messages: [],
    } as any);

    expect(memoryRepository.find).toHaveBeenCalledWith({
      where: { sessionId: 'onboarding:company-1:user-1' },
      order: { createdAt: 'ASC' },
    });
    expect(langchainService.chat).not.toHaveBeenCalled();
    expect(companyRepository.update).toHaveBeenCalledWith(
      { id: 'company-1' },
      {
        description: '# Luna Clean\n\nDescrição não disponível.',
        step: 'running',
      },
    );
    expect(result).toContain('nenhum histórico de conversa foi encontrado');
  });

  it('normalizes escaped markdown and strips serialized annotations before saving', async () => {
    const companyRepository = {
      findOneByOrFail: vi.fn().mockResolvedValue({
        id: 'company-1',
        name: 'Luna Clean',
      }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const memoryRepository = {
      find: vi.fn().mockResolvedValue([
        {
          role: 'user',
          content: 'Temos atendimento por WhatsApp.',
          createdAt: new Date('2026-03-28T12:00:00.000Z'),
        },
      ]),
    };
    const langchainService = {
      chat: vi
        .fn()
        .mockResolvedValue(
          '# Luna Clean\\n\\n## Sobre a Empresa\\n- Limpeza residencial","annotations":[]}]',
        ),
    };
    const tool = new FinishOnboardingTool(
      companyRepository as any,
      memoryRepository as any,
      langchainService as any,
    );

    await tool.invoke({}, {
      context: {
        companyId: 'company-1',
        userId: 'user-1',
      },
      messages: [],
    } as any);

    expect(companyRepository.update).toHaveBeenCalledWith(
      { id: 'company-1' },
      expect.objectContaining({
        description:
          '# Luna Clean\n\n## Sobre a Empresa\n- Limpeza residencial',
      }),
    );
  });
});
