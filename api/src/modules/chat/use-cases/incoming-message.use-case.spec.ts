import { describe, expect, it, vi } from 'vitest';
import { IncomingMessageUseCase } from './incoming-message.use-case';

function makePayload(overrides?: Partial<any>) {
  return {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
      id: 'msg-1',
      ...overrides?.key,
    },
    message: {
      conversation: 'Oi',
      ...overrides?.message,
    },
    pushName: 'Maria Silva',
    ...overrides,
  } as any;
}

function makeContact(overrides?: Partial<any>) {
  return {
    id: 'contact-1',
    companyId: 'company-1',
    name: 'Maria Silva',
    phone: '+5511999999999',
    instagram: '@maria',
    email: 'maria@example.com',
    ignoreUntil: null,
    ...overrides,
  };
}

function makeCompany(overrides?: Partial<any>) {
  return {
    id: 'company-1',
    step: 'running',
    isClientsSupportEnabled: true,
    agentReplyScope: 'all',
    agentReplyNamePattern: null,
    agentReplyListMode: null,
    agentReplyListEntries: [],
    ...overrides,
  };
}

function makeUseCase(options?: {
  contact?: any;
  company?: any;
  userCompany?: any;
  memoryMessage?: any;
}) {
  const contactRepository = {
    findOne: vi
      .fn()
      .mockResolvedValue(
        options && 'contact' in options ? options.contact : makeContact(),
      ),
    save: vi.fn().mockImplementation(async (contact: any) => ({
      id: contact.id ?? 'contact-new',
      ignoreUntil: null,
      instagram: null,
      email: null,
      ...contact,
    })),
    update: vi.fn(),
  } as any;
  const userCompanyRepository = {
    findOne: vi.fn().mockResolvedValue(options?.userCompany ?? null),
  } as any;
  const companyRepository = {
    findOne: vi.fn().mockResolvedValue(options?.company ?? makeCompany()),
  } as any;
  const memoryRepository = {
    findOne: vi.fn().mockResolvedValue(options?.memoryMessage ?? null),
  } as any;
  const messageQueueService = {
    enqueueMessage: vi.fn().mockResolvedValue({ id: 'item-1' }),
  } as any;

  return {
    contactRepository,
    userCompanyRepository,
    memoryRepository,
    messageQueueService,
    useCase: new IncomingMessageUseCase(
      contactRepository,
      userCompanyRepository,
      companyRepository,
      memoryRepository,
      messageQueueService,
    ),
  };
}

describe('IncomingMessageUseCase', () => {
  it('enqueues client messages when contact is eligible', async () => {
    const { useCase, messageQueueService } = makeUseCase();

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(result).toEqual({
      success: true,
      ignored: false,
      ignoredReason: null,
    });
    expect(messageQueueService.enqueueMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        conversationKey: 'whatsapp:company-1:+5511999999999',
        channel: 'whatsapp',
        message: expect.objectContaining({
          instanceName: 'instance-1',
          route: { kind: 'client', contactId: 'contact-1' },
        }),
      }),
    );
  });

  it('creates a contact automatically for unknown external numbers', async () => {
    const { useCase, contactRepository, messageQueueService } = makeUseCase({
      contact: null,
    });

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload({ pushName: 'Julio César' }),
    );

    expect(contactRepository.save).toHaveBeenCalledWith({
      companyId: 'company-1',
      phone: '+5511999999999',
      name: 'Julio César',
    });
    expect(messageQueueService.enqueueMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        conversationKey: 'whatsapp:company-1:+5511999999999',
        channel: 'whatsapp',
        message: expect.objectContaining({
          route: { kind: 'client', contactId: 'contact-new' },
        }),
      }),
    );
    expect(result.ignored).toBe(false);
  });

  it('does not create contact for fromMe messages and ignores when none exists', async () => {
    const { useCase, contactRepository, messageQueueService } = makeUseCase({
      contact: null,
    });

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload({
        key: {
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: true,
        },
      }),
    );

    expect(contactRepository.save).not.toHaveBeenCalled();
    expect(messageQueueService.enqueueMessage).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      ignored: true,
      ignoredReason: 'from_me_without_existing_contact',
    });
  });

  it('marks manual fromMe messages as ignored and updates ignoreUntil', async () => {
    const {
      useCase,
      contactRepository,
      memoryRepository,
      messageQueueService,
    } = makeUseCase();

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload({
        key: {
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: true,
        },
      }),
    );

    expect(memoryRepository.findOne).toHaveBeenCalled();
    expect(contactRepository.update).toHaveBeenCalled();
    expect(messageQueueService.enqueueMessage).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      ignored: true,
      ignoredReason: 'from_me_message',
    });
  });

  it('ignores unsupported message types before they reach the queue', async () => {
    const { useCase, messageQueueService } = makeUseCase();

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload({
        message: {
          imageMessage: {
            url: 'https://example.com/image.jpg',
            mimetype: 'image/jpeg',
          },
        },
      }),
    );

    expect(messageQueueService.enqueueMessage).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      ignored: true,
      ignoredReason: 'unsupported_message_type',
    });
  });

  it('ignores broadcast and other unsupported remoteJids before queueing', async () => {
    const { useCase, messageQueueService, contactRepository } = makeUseCase();

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload({
        key: {
          remoteJid: 'status@broadcast',
          fromMe: false,
          id: 'msg-1',
        },
      }),
    );

    expect(messageQueueService.enqueueMessage).not.toHaveBeenCalled();
    expect(contactRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      ignored: true,
      ignoredReason: 'unsupported_remote_jid',
    });
  });

  it('ignores filtered client messages before queueing', async () => {
    const { useCase, messageQueueService } = makeUseCase({
      company: makeCompany({
        agentReplyScope: 'specific',
        agentReplyNamePattern: 'joao',
      }),
    });

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(messageQueueService.enqueueMessage).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      ignored: true,
      ignoredReason: 'client_support_disabled_or_filtered',
    });
  });

  it('enqueues owner messages with resolved route metadata', async () => {
    const { useCase, messageQueueService } = makeUseCase({
      userCompany: {
        user: {
          id: 'user-1',
        },
      },
    });

    const result = await useCase.execute(
      'company-1',
      'instance-1',
      makePayload(),
    );

    expect(messageQueueService.enqueueMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        conversationKey: 'whatsapp:company-1:+5511999999999',
        channel: 'whatsapp',
        message: expect.objectContaining({
          route: { kind: 'owner', userId: 'user-1' },
        }),
      }),
    );
    expect(result.ignored).toBe(false);
  });
});
