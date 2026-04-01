import { describe, expect, it, vi } from 'vitest';
import { IncomingMessageUseCase } from './incoming-message.use-case';

function makePayload() {
  return {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
    },
    message: {
      conversation: 'Oi',
    },
  } as any;
}

function makeContact(overrides?: Partial<any>) {
  return {
    id: 'contact-1',
    name: 'Maria Silva',
    phone: '+5511999999999',
    email: 'maria@example.com',
    instagram: '@maria',
    ignoreUntil: null,
    ...overrides,
  };
}

function makeCompany(overrides?: Partial<any>) {
  return {
    id: 'company-1',
    isClientsSupportEnabled: true,
    agentReplyScope: 'all',
    agentReplyNamePattern: null,
    agentReplyListMode: null,
    agentReplyListEntries: [],
    step: 'running',
    ...overrides,
  };
}

function makeUseCase(options?: {
  contact?: any;
  company?: any;
  clientMessage?: string;
}) {
  const contactRepository = {
    findOne: vi.fn().mockResolvedValue(options?.contact ?? makeContact()),
    update: vi.fn(),
  } as any;
  const userRepository = {
    findOne: vi.fn(),
  } as any;
  const userCompanyRepository = {
    findOne: vi.fn().mockResolvedValue(null),
  } as any;
  const companyRepository = {
    findOne: vi.fn().mockResolvedValue(options?.company ?? makeCompany()),
  } as any;
  const memoryRepository = {
    findOne: vi.fn(),
  } as any;
  const clientStrategy = {
    handleConversation: vi
      .fn()
      .mockResolvedValue({ message: options?.clientMessage ?? 'Olá!' }),
  } as any;
  const ownerStrategy = {
    handleConversation: vi.fn(),
  } as any;
  const onboardingStrategy = {
    handleConversation: vi.fn(),
  } as any;
  const audioTranscriptionService = {
    transcribeAudio: vi.fn(),
  } as any;

  return {
    contactRepository,
    clientStrategy,
    useCase: new IncomingMessageUseCase(
      contactRepository,
      userRepository,
      userCompanyRepository,
      companyRepository,
      memoryRepository,
      clientStrategy,
      ownerStrategy,
      onboardingStrategy,
      audioTranscriptionService,
    ),
  };
}

describe('IncomingMessageUseCase', () => {
  it('returns no reply when the agent is disabled', async () => {
    const { useCase, contactRepository, clientStrategy } = makeUseCase({
      company: makeCompany({ isClientsSupportEnabled: false }),
    });

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(result).toEqual({ message: '' });
    expect(contactRepository.findOne).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        phone: '+5511999999999',
      },
    });
    expect(clientStrategy.handleConversation).not.toHaveBeenCalled();
  });

  it('replies when reply scope is all', async () => {
    const { useCase, clientStrategy } = makeUseCase({
      company: makeCompany({ agentReplyScope: 'all' }),
    });

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(result).toEqual({ message: 'Olá!' });
    expect(clientStrategy.handleConversation).toHaveBeenCalledOnce();
  });

  it('replies only when the contact name matches the specific name pattern', async () => {
    const matching = makeUseCase({
      company: makeCompany({
        agentReplyScope: 'specific',
        agentReplyNamePattern: 'maria',
      }),
    });

    const matchingResult = await matching.useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(matchingResult).toEqual({ message: 'Olá!' });
    expect(matching.clientStrategy.handleConversation).toHaveBeenCalledOnce();

    const nonMatching = makeUseCase({
      company: makeCompany({
        agentReplyScope: 'specific',
        agentReplyNamePattern: 'joao',
      }),
    });

    const nonMatchingResult = await nonMatching.useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(nonMatchingResult).toEqual({ message: '' });
    expect(
      nonMatching.clientStrategy.handleConversation,
    ).not.toHaveBeenCalled();
  });

  it('replies only when the contact matches the whitelist entries', async () => {
    const matching = makeUseCase({
      company: makeCompany({
        agentReplyScope: 'specific',
        agentReplyListMode: 'whitelist',
        agentReplyListEntries: ['vip'],
      }),
      contact: makeContact({
        name: 'Maria VIP',
      }),
    });

    const matchingResult = await matching.useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(matchingResult).toEqual({ message: 'Olá!' });
    expect(matching.clientStrategy.handleConversation).toHaveBeenCalledOnce();

    const nonMatching = makeUseCase({
      company: makeCompany({
        agentReplyScope: 'specific',
        agentReplyListMode: 'whitelist',
        agentReplyListEntries: ['vip'],
      }),
      contact: makeContact({
        name: 'Maria Silva',
      }),
    });

    const nonMatchingResult = await nonMatching.useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(nonMatchingResult).toEqual({ message: '' });
    expect(
      nonMatching.clientStrategy.handleConversation,
    ).not.toHaveBeenCalled();
  });

  it('blocks replies when the contact matches the blacklist entries', async () => {
    const blocked = makeUseCase({
      company: makeCompany({
        agentReplyScope: 'specific',
        agentReplyListMode: 'blacklist',
        agentReplyListEntries: ['spam'],
      }),
      contact: makeContact({
        instagram: '@spam-client',
      }),
    });

    const blockedResult = await blocked.useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(blockedResult).toEqual({ message: '' });
    expect(blocked.clientStrategy.handleConversation).not.toHaveBeenCalled();

    const allowed = makeUseCase({
      company: makeCompany({
        agentReplyScope: 'specific',
        agentReplyListMode: 'blacklist',
        agentReplyListEntries: ['spam'],
      }),
      contact: makeContact({
        instagram: '@maria',
      }),
    });

    const allowedResult = await allowed.useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(allowedResult).toEqual({ message: 'Olá!' });
    expect(allowed.clientStrategy.handleConversation).toHaveBeenCalledOnce();
  });

  it('returns no automatic reply when specific mode has no filters', async () => {
    const { useCase, clientStrategy } = makeUseCase({
      company: makeCompany({
        agentReplyScope: 'specific',
        agentReplyNamePattern: '   ',
        agentReplyListMode: null,
        agentReplyListEntries: ['   '],
      }),
    });

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(result).toEqual({ message: '' });
    expect(clientStrategy.handleConversation).not.toHaveBeenCalled();
  });
});
