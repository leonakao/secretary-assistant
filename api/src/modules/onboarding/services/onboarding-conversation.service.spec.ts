import { describe, it, expect, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { OnboardingConversationService } from './onboarding-conversation.service';

function makeUser(overrides = {}) {
  return { id: 'user-1', name: 'Alice', phone: null, ...overrides };
}

function makeUserCompany(companyStep: 'onboarding' | 'running') {
  return {
    userId: 'user-1',
    companyId: 'company-1',
    role: 'owner',
    company: { id: 'company-1', name: 'Acme', step: companyStep },
  };
}

function makeService(
  overrides: Partial<{
    userRepo: any;
    companyRepo: any;
    userCompanyRepo: any;
    memoryRepo: any;
    agent: any;
    extractor: any;
  }> = {},
) {
  const userRepo = overrides.userRepo ?? {
    findOneBy: vi.fn().mockResolvedValue(makeUser()),
  };
  const companyRepo = overrides.companyRepo ?? {};
  const userCompanyRepo = overrides.userCompanyRepo ?? {
    findOne: vi.fn().mockResolvedValue(makeUserCompany('onboarding')),
  };
  const memoryRepo = overrides.memoryRepo ?? {
    save: vi.fn().mockResolvedValue({ id: 'mem-1' }),
    find: vi.fn().mockResolvedValue([]),
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
    companyRepo,
    userCompanyRepo,
    memoryRepo,
    agent,
    extractor,
  );

  return { service, userRepo, userCompanyRepo, memoryRepo, agent, extractor };
}

describe('OnboardingConversationService', () => {
  describe('run', () => {
    it('returns assistantMessage and onboardingState on success', async () => {
      const { service } = makeService();

      const result = await service.run({
        userId: 'user-1',
        companyId: 'company-1',
        message: 'Hi',
      });

      expect(result.assistantMessage).toBe('Hello!');
      expect(result.onboardingState.onboarding.step).toBe('assistant-chat');
      expect(result.onboardingState.onboarding.requiresOnboarding).toBe(true);
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
        userCompanyRepo: { findOne: vi.fn().mockResolvedValue(null) },
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

    it('saves user message and assistant message to memory with thread key', async () => {
      const memoryRepo = {
        save: vi.fn().mockResolvedValue({ id: 'mem-1' }),
        find: vi.fn().mockResolvedValue([]),
      };
      const { service } = makeService({ memoryRepo });

      await service.run({
        userId: 'user-1',
        companyId: 'company-1',
        message: 'Hi',
      });

      const saves = memoryRepo.save.mock.calls;
      const threadId = 'onboarding:company-1:user-1';

      expect(saves[0][0]).toMatchObject({
        sessionId: threadId,
        role: 'user',
        content: 'Hi',
      });
      expect(saves[1][0]).toMatchObject({
        sessionId: threadId,
        role: 'assistant',
        content: 'Hello!',
      });
    });

    it('returns complete step when company transitions to running after agent call', async () => {
      const userCompanyRepo = {
        findOne: vi
          .fn()
          .mockResolvedValueOnce(makeUserCompany('onboarding'))
          .mockResolvedValueOnce(makeUserCompany('running')),
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
  });

  describe('getConversationMessages', () => {
    it('queries memory by thread key', async () => {
      const memoryRepo = {
        save: vi.fn(),
        find: vi.fn().mockResolvedValue([]),
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
