import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingConversationService } from './onboarding-conversation.service';

function makeUser(overrides = {}) {
  return { id: 'user-1', name: 'Alice', phone: null, ...overrides };
}

function makeUserCompany(companyStep: 'onboarding' | 'running') {
  return {
    userId: 'user-1',
    companyId: 'company-1',
    role: 'owner',
    company: {
      id: 'company-1',
      name: 'Acme',
      businessType: 'Clínica odontológica',
      description: null,
      step: companyStep,
    },
  };
}

function makeMemory(overrides = {}) {
  return {
    id: 'mem-1',
    sessionId: 'onboarding:company-1:user-1',
    companyId: 'company-1',
    role: 'assistant',
    content: 'Hello!',
    createdAt: new Date('2026-03-27T10:00:00.000Z'),
    ...overrides,
  };
}

function createSaveMock() {
  let sequence = 0;

  return vi.fn().mockImplementation(async (payload) => {
    sequence += 1;
    return makeMemory({
      id: `mem-${sequence}`,
      role: payload.role,
      content: payload.content,
      sessionId: payload.sessionId,
      companyId: payload.companyId,
      createdAt: new Date(`2026-03-27T10:00:0${sequence}.000Z`),
    });
  });
}

function makeService(
  overrides: Partial<{
    userRepo: any;
    userCompanyRepo: any;
    memoryRepo: any;
    agent: any;
    extractor: any;
  }> = {},
) {
  const userRepo = overrides.userRepo ?? {
    findOneBy: vi.fn().mockResolvedValue(makeUser()),
  };
  const userCompanyRepo = overrides.userCompanyRepo ?? {
    findOne: vi.fn().mockResolvedValue(makeUserCompany('onboarding')),
    manager: undefined,
  };
  const memoryRepo = overrides.memoryRepo ?? {
    save: createSaveMock(),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
  };
  const agent = overrides.agent ?? {
    streamConversation: vi.fn().mockResolvedValue(
      (async function* () {
        yield { assistant: { messages: [{ content: 'Hello!' }] } };
      })(),
    ),
  };
  const extractor = overrides.extractor ?? {
    extractFromChunkMessages: vi.fn().mockReturnValue('Hello!'),
  };

  const service = new OnboardingConversationService(
    userRepo,
    userCompanyRepo,
    memoryRepo,
    agent,
    extractor,
  );

  return { service, userRepo, userCompanyRepo, memoryRepo, agent, extractor };
}

describe('OnboardingConversationService', () => {
  describe('run', () => {
    it('returns persisted user and assistant messages on success', async () => {
      const { service } = makeService();

      const result = await service.run({
        userId: 'user-1',
        companyId: 'company-1',
        message: 'Hi',
      });

      expect(result.userMessage).toMatchObject({
        id: 'mem-1',
        role: 'user',
        content: 'Hi',
      });
      expect(result.assistantMessage).toMatchObject({
        id: 'mem-2',
        role: 'assistant',
        content: 'Hello!',
      });
      expect(result.onboardingState.onboarding.step).toBe('assistant-chat');
    });

    it('passes company name and business type into agent context', async () => {
      const { service, agent } = makeService();

      await service.run({
        userId: 'user-1',
        companyId: 'company-1',
        message: 'Hi',
      });

      expect(agent.streamConversation).toHaveBeenCalledWith(
        'Hi',
        expect.objectContaining({ id: 'user-1' }),
        expect.objectContaining({
          companyName: 'Acme',
          businessType: 'Clínica odontológica',
          companyDescription: expect.stringContaining('Nome da empresa: Acme'),
        }),
        'onboarding:company-1:user-1',
      );
    });

    it('throws NotFoundException when user is not found', async () => {
      const { service } = makeService({
        userRepo: { findOneBy: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        service.run({ userId: 'ghost', companyId: 'company-1', message: 'Hi' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when user has no company relation', async () => {
      const { service } = makeService({
        userCompanyRepo: {
          findOne: vi.fn().mockResolvedValue(null),
          manager: undefined,
        },
      });

      await expect(
        service.run({
          userId: 'user-1',
          companyId: 'company-1',
          message: 'Hi',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when company is already running', async () => {
      const { service } = makeService({
        userCompanyRepo: {
          findOne: vi.fn().mockResolvedValue(makeUserCompany('running')),
          manager: undefined,
        },
      });

      await expect(
        service.run({
          userId: 'user-1',
          companyId: 'company-1',
          message: 'Hi',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns complete step when company transitions to running after agent call', async () => {
      const userCompanyRepo = {
        findOne: vi
          .fn()
          .mockResolvedValueOnce(makeUserCompany('onboarding'))
          .mockResolvedValueOnce(makeUserCompany('running')),
        manager: undefined,
      };
      const { service } = makeService({ userCompanyRepo });

      const result = await service.run({
        userId: 'user-1',
        companyId: 'company-1',
        message: 'done',
      });

      expect(result.onboardingState.onboarding.step).toBe('complete');
      expect(result.onboardingState.onboarding.requiresOnboarding).toBe(false);
    });

    it('retries once when the assistant produces only blank content after a tool turn', async () => {
      const agent = {
        streamConversation: vi
          .fn()
          .mockResolvedValueOnce(
            (async function* () {
              yield { assistant: { messages: [{ content: '\n' }] } };
            })(),
          )
          .mockResolvedValueOnce(
            (async function* () {
              yield {
                assistant: {
                  messages: [{ content: 'Qual e o horario de atendimento?' }],
                },
              };
            })(),
          ),
      };
      const extractor = {
        extractFromChunkMessages: vi
          .fn()
          .mockReturnValueOnce('\n')
          .mockReturnValueOnce('Qual e o horario de atendimento?'),
      };
      const { service, memoryRepo } = makeService({ agent, extractor });

      const result = await service.run({
        userId: 'user-1',
        companyId: 'company-1',
        message: 'Prestamos limpeza residencial.',
      });

      expect(agent.streamConversation).toHaveBeenCalledTimes(2);
      expect(agent.streamConversation).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(
          'Continue o onboarding com uma resposta visível',
        ),
        expect.anything(),
        expect.anything(),
        'onboarding:company-1:user-1',
      );
      expect(result.assistantMessage).toMatchObject({
        content: 'Qual e o horario de atendimento?',
      });
      expect(memoryRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('initializeThread', () => {
    it('creates exactly one opening assistant message for an empty thread', async () => {
      const memoryRepo = {
        save: createSaveMock(),
        find: vi.fn().mockResolvedValue([]),
        findOne: vi.fn().mockResolvedValue(null),
      };
      const { service, agent } = makeService({ memoryRepo });

      const result = await service.initializeThread({
        userId: 'user-1',
        companyId: 'company-1',
      });

      expect(result.initialized).toBe(true);
      expect(result.assistantMessage).toMatchObject({
        role: 'assistant',
        content: 'Hello!',
      });
      expect(memoryRepo.save).toHaveBeenCalledTimes(1);
      expect(agent.streamConversation).toHaveBeenCalledWith(
        expect.stringContaining('Inicie proativamente'),
        expect.anything(),
        expect.objectContaining({
          companyName: 'Acme',
          businessType: 'Clínica odontológica',
        }),
        'onboarding:company-1:user-1',
      );
    });

    it('returns idempotently without writing when thread already has messages', async () => {
      const memoryRepo = {
        save: createSaveMock(),
        find: vi.fn().mockResolvedValue([]),
        findOne: vi.fn().mockResolvedValue(makeMemory()),
      };
      const { service, agent } = makeService({ memoryRepo });

      const result = await service.initializeThread({
        userId: 'user-1',
        companyId: 'company-1',
      });

      expect(result).toMatchObject({
        initialized: false,
        assistantMessage: null,
      });
      expect(memoryRepo.save).not.toHaveBeenCalled();
      expect(agent.streamConversation).not.toHaveBeenCalled();
    });

    it('throws ConflictException when initialization is requested for a running company', async () => {
      const { service } = makeService({
        userCompanyRepo: {
          findOne: vi.fn().mockResolvedValue(makeUserCompany('running')),
          manager: undefined,
        },
      });

      await expect(
        service.initializeThread({
          userId: 'user-1',
          companyId: 'company-1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('uses an inner-join locking query inside transactions to avoid outer-join FOR UPDATE errors', async () => {
      const queryBuilder = {
        innerJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        setLock: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(makeUserCompany('onboarding')),
      };
      const transactionalUserCompanyRepo = {
        createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
        findOne: vi.fn(),
      };
      const memoryRepo = {
        save: createSaveMock(),
        find: vi.fn().mockResolvedValue([]),
        findOne: vi.fn().mockResolvedValue(null),
      };
      const manager = {
        transaction: vi.fn(async (callback) =>
          callback({
            getRepository: vi
              .fn()
              .mockReturnValueOnce(transactionalUserCompanyRepo)
              .mockReturnValueOnce(memoryRepo),
          }),
        ),
      };
      const userCompanyRepo = {
        findOne: vi.fn().mockResolvedValue(makeUserCompany('onboarding')),
        manager,
      };
      const { service } = makeService({ userCompanyRepo, memoryRepo });

      await service.initializeThread({
        userId: 'user-1',
        companyId: 'company-1',
      });

      expect(
        transactionalUserCompanyRepo.createQueryBuilder,
      ).toHaveBeenCalledWith('userCompany');
      expect(queryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
        'userCompany.company',
        'company',
      );
      expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(queryBuilder.getOne).toHaveBeenCalled();
    });
  });

  describe('getConversationMessages', () => {
    it('queries memory by thread key', async () => {
      const memoryRepo = {
        save: createSaveMock(),
        find: vi.fn().mockResolvedValue([]),
        findOne: vi.fn().mockResolvedValue(null),
      };
      const { service } = makeService({ memoryRepo });

      await service.getConversationMessages('user-1', 'company-1');

      expect(memoryRepo.find).toHaveBeenCalledWith({
        where: { sessionId: 'onboarding:company-1:user-1' },
        order: { createdAt: 'ASC' },
      });
    });
  });
});
