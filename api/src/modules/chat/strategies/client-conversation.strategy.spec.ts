import { ConfigService } from '@nestjs/config';
import { ClientConversationStrategy } from './client-conversation.strategy';

const { mockSpan, withActiveSpan } = vi.hoisted(() => {
  const mockSpan = {
    recordException: vi.fn(),
    setAttributes: vi.fn(),
    setInput: vi.fn(),
    setOutput: vi.fn(),
    setType: vi.fn(),
  };

  mockSpan.setAttributes.mockReturnValue(mockSpan);
  mockSpan.setInput.mockReturnValue(mockSpan);
  mockSpan.setOutput.mockReturnValue(mockSpan);
  mockSpan.setType.mockReturnValue(mockSpan);

  return {
    mockSpan,
    withActiveSpan: vi.fn(async (_name: string, callback: any) =>
      callback(mockSpan),
    ),
  };
});

vi.mock('src/observability/langwatch', async () => {
  const actual = await vi.importActual<
    typeof import('src/observability/langwatch')
  >('src/observability/langwatch');

  return {
    ...actual,
    langWatchTracer: {
      ...actual.langWatchTracer,
      withActiveSpan,
    },
  };
});

function makeContact(overrides?: Partial<any>) {
  return {
    id: 'contact-1',
    name: 'Cliente VIP Maria',
    phone: '+5511999999999',
    ...overrides,
  };
}

function makeCompany(overrides?: Partial<any>) {
  return {
    id: 'company-1',
    name: 'Settings E2E Co.',
    description: 'Empresa de testes',
    ...overrides,
  };
}

function makeConfigService(overrides?: {
  e2eAuthMode?: string;
  nodeEnv?: string;
}) {
  return {
    get: vi.fn((key: string, defaultValue?: string) => {
      if (key === 'E2E_AUTH_MODE') {
        return overrides?.e2eAuthMode ?? 'false';
      }

      if (key === 'NODE_ENV') {
        return overrides?.nodeEnv ?? 'test';
      }

      return defaultValue;
    }),
  } as unknown as ConfigService;
}

function createAssistantStream(messages: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const message of messages) {
        yield {
          assistant: {
            messages: [
              {
                type: 'ai',
                content: message,
              },
            ],
          },
        };
      }
    },
  };
}

function createAssistantStreamWithToolMessages() {
  return {
    async *[Symbol.asyncIterator]() {
      yield {
        assistant: {
          messages: [
            {
              type: 'tool',
              content: 'Ferramenta executada',
            },
            {
              type: 'ai',
              content: 'Resposta normal',
            },
          ],
        },
      };
    },
  };
}

function makeStrategy(options?: {
  company?: any;
  contact?: any;
  e2eAuthMode?: string;
  nodeEnv?: string;
  streamedMessages?: string[];
}) {
  const contactRepository = {
    findOneByOrFail: vi
      .fn()
      .mockResolvedValue(options?.contact ?? makeContact()),
  } as any;
  const companyRepository = {
    findOneByOrFail: vi
      .fn()
      .mockResolvedValue(options?.company ?? makeCompany()),
  } as any;
  const chatService = {
    addMessageToMemory: vi.fn().mockResolvedValue(undefined),
    sendMessageAndSaveToMemory: vi.fn().mockResolvedValue(undefined),
    sendPresenceNotification: vi.fn().mockResolvedValue(undefined),
  } as any;
  const contactSessionService = {
    resolveActiveSessionId: vi
      .fn()
      .mockResolvedValue('contact:contact-1:session:2026-04-02T00:00:00.000Z'),
  } as any;
  const clientAssistantAgent = {
    streamConversation: vi
      .fn()
      .mockResolvedValue(
        createAssistantStream(options?.streamedMessages ?? ['Resposta normal']),
      ),
  } as any;
  const extractAiMessageService = {
    extractFromChunkMessages: vi.fn((messages: Array<{ content: string }>) => {
      return messages.at(-1)?.content ?? '';
    }),
    extractToolMessagesFromChunkMessages: vi.fn(
      (messages: Array<{ type: string; content: string }>) => {
        return messages
          .filter((message) => message.type === 'tool')
          .map((message) => message.content);
      },
    ),
  } as any;
  const findPendingConfirmations = {
    execute: vi.fn().mockResolvedValue([]),
  } as any;

  return {
    chatService,
    contactSessionService,
    clientAssistantAgent,
    findPendingConfirmations,
    strategy: new ClientConversationStrategy(
      contactRepository,
      companyRepository,
      makeConfigService({
        e2eAuthMode: options?.e2eAuthMode,
        nodeEnv: options?.nodeEnv,
      }),
      chatService,
      contactSessionService,
      clientAssistantAgent,
      extractAiMessageService,
      findPendingConfirmations,
    ),
  };
}

describe('ClientConversationStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a deterministic reply in E2E auth mode without calling AI or Evolution', async () => {
    const {
      strategy,
      chatService,
      contactSessionService,
      clientAssistantAgent,
      findPendingConfirmations,
    } = makeStrategy({
      e2eAuthMode: 'true',
    });

    const result = await strategy.handleConversation({
      companyId: 'company-1',
      instanceName: 'instance-1',
      remoteJid: '5511999999999@s.whatsapp.net',
      message: 'Oi, preciso de ajuda',
      contactId: 'contact-1',
    });

    expect(result).toEqual({
      message:
        'Oi, Cliente! Recebi sua mensagem para Settings E2E Co.: "Oi, preciso de ajuda".',
    });
    expect(contactSessionService.resolveActiveSessionId).toHaveBeenCalledWith({
      companyId: 'company-1',
      contactId: 'contact-1',
    });
    expect(chatService.addMessageToMemory).toHaveBeenCalledTimes(2);
    expect(chatService.sendPresenceNotification).not.toHaveBeenCalled();
    expect(chatService.sendMessageAndSaveToMemory).not.toHaveBeenCalled();
    expect(clientAssistantAgent.streamConversation).not.toHaveBeenCalled();
    expect(findPendingConfirmations.execute).not.toHaveBeenCalled();
    expect(withActiveSpan).toHaveBeenCalledWith(
      'conversation.client',
      expect.any(Function),
    );
    expect(mockSpan.setInput).toHaveBeenCalledWith('chat_messages', [
      {
        role: 'user',
        content: 'Oi, preciso de ajuda',
      },
    ]);
    expect(mockSpan.setOutput).toHaveBeenCalledWith('chat_messages', [
      {
        role: 'assistant',
        content:
          'Oi, Cliente! Recebi sua mensagem para Settings E2E Co.: "Oi, preciso de ajuda".',
      },
    ]);
  });

  it('keeps the normal client assistant flow when deterministic E2E replies are disabled', async () => {
    const {
      strategy,
      chatService,
      clientAssistantAgent,
      findPendingConfirmations,
    } = makeStrategy({
      e2eAuthMode: 'false',
      streamedMessages: ['Primeira parte', 'Segunda parte'],
    });

    const result = await strategy.handleConversation({
      companyId: 'company-1',
      instanceName: 'instance-1',
      remoteJid: '5511999999999@s.whatsapp.net',
      message: 'Oi, preciso de ajuda',
      contactId: 'contact-1',
    });

    expect(result).toEqual({ message: 'Primeira parte\nSegunda parte' });
    expect(findPendingConfirmations.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      contactId: 'contact-1',
    });
    expect(clientAssistantAgent.streamConversation).toHaveBeenCalledOnce();
    expect(mockSpan.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'langwatch.thread.id':
          'contact:contact-1:session:2026-04-02T00:00:00.000Z',
        'secretary.company.id': 'company-1',
        'secretary.contact.id': 'contact-1',
        'secretary.operation': 'client_conversation',
        'secretary.route.kind': 'client',
      }),
    );
    expect(chatService.sendPresenceNotification).toHaveBeenCalled();
    expect(chatService.sendMessageAndSaveToMemory).toHaveBeenCalledWith({
      sessionId: 'contact:contact-1:session:2026-04-02T00:00:00.000Z',
      companyId: 'company-1',
      instanceName: 'instance-1',
      remoteJid: '5511999999999@s.whatsapp.net',
      message: 'Primeira parte\nSegunda parte',
    });
    expect(mockSpan.setOutput).toHaveBeenCalledWith('chat_messages', [
      {
        role: 'assistant',
        content: 'Primeira parte\nSegunda parte',
      },
    ]);
  });

  it('logs tool messages emitted during the agent stream', async () => {
    const { strategy, clientAssistantAgent } = makeStrategy();
    const loggerSpy = vi
      .spyOn((strategy as any).logger, 'log')
      .mockImplementation(() => undefined);

    clientAssistantAgent.streamConversation.mockResolvedValue(
      createAssistantStreamWithToolMessages(),
    );

    await strategy.handleConversation({
      companyId: 'company-1',
      instanceName: 'instance-1',
      remoteJid: '5511999999999@s.whatsapp.net',
      message: 'Oi, preciso de ajuda',
      contactId: 'contact-1',
    });

    expect(loggerSpy).toHaveBeenCalledWith('ToolMessage: Ferramenta executada');
    expect(loggerSpy).toHaveBeenCalledWith('AIMessage: Resposta normal');
  });
});
