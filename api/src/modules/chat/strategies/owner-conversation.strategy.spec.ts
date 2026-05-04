import { OwnerConversationStrategy } from './owner-conversation.strategy';

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

function makeStrategy(options?: {
  streamError?: Error;
  streamedMessages?: string[];
}) {
  const userRepository = {
    findOneByOrFail: vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Ana Owner',
      phone: '+5511888888888',
    }),
  } as any;
  const companyRepository = {
    findOneByOrFail: vi.fn().mockResolvedValue({
      id: 'company-1',
      description: 'Empresa de testes',
    }),
  } as any;
  const chatService = {
    addMessageToMemory: vi.fn().mockResolvedValue(undefined),
    sendMessageAndSaveToMemory: vi.fn().mockResolvedValue(undefined),
    sendPresenceNotification: vi.fn().mockResolvedValue(undefined),
  } as any;
  const ownerAssistantAgent = {
    streamConversation: options?.streamError
      ? vi.fn().mockRejectedValue(options.streamError)
      : vi
          .fn()
          .mockResolvedValue(
            createAssistantStream(
              options?.streamedMessages ?? ['Resposta do owner'],
            ),
          ),
  } as any;
  const extractAiMessageService = {
    extractFromChunkMessages: vi.fn((messages: Array<{ content: string }>) => {
      return messages.at(-1)?.content ?? '';
    }),
    extractToolMessagesFromChunkMessages: vi.fn(() => []),
  } as any;
  const findPendingConfirmations = {
    execute: vi.fn().mockResolvedValue([]),
  } as any;

  return {
    chatService,
    findPendingConfirmations,
    ownerAssistantAgent,
    strategy: new OwnerConversationStrategy(
      userRepository,
      companyRepository,
      chatService,
      ownerAssistantAgent,
      extractAiMessageService,
      findPendingConfirmations,
    ),
  };
}

describe('OwnerConversationStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records root conversation input and final output', async () => {
    const {
      strategy,
      chatService,
      findPendingConfirmations,
      ownerAssistantAgent,
    } = makeStrategy({
      streamedMessages: ['Primeira parte', 'Segunda parte'],
    });

    const result = await strategy.handleConversation({
      companyId: 'company-1',
      instanceName: 'instance-1',
      remoteJid: '5511888888888@s.whatsapp.net',
      message: 'Como estao os pedidos?',
      userId: 'user-1',
    });

    expect(result).toEqual({ message: 'Primeira parte\nSegunda parte' });
    expect(findPendingConfirmations.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      userId: 'user-1',
    });
    expect(ownerAssistantAgent.streamConversation).toHaveBeenCalledOnce();
    expect(chatService.sendMessageAndSaveToMemory).toHaveBeenCalledWith({
      sessionId: 'user-1',
      companyId: 'company-1',
      instanceName: 'instance-1',
      remoteJid: '5511888888888@s.whatsapp.net',
      message: 'Primeira parte\nSegunda parte',
    });
    expect(withActiveSpan).toHaveBeenCalledWith(
      'conversation.owner',
      expect.any(Function),
    );
    expect(mockSpan.setInput).toHaveBeenCalledWith('chat_messages', [
      {
        role: 'user',
        content: 'Como estao os pedidos?',
      },
    ]);
    expect(mockSpan.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'langwatch.thread.id': 'user-1',
        'langwatch.user.id': 'user-1',
        'secretary.company.id': 'company-1',
        'secretary.operation': 'owner_conversation',
        'secretary.route.kind': 'owner',
      }),
    );
    expect(mockSpan.setOutput).toHaveBeenCalledWith('chat_messages', [
      {
        role: 'assistant',
        content: 'Primeira parte\nSegunda parte',
      },
    ]);
  });

  it('records fallback output and exception when owner agent fails', async () => {
    const { strategy } = makeStrategy({
      streamError: new Error('owner agent failed'),
    });

    const result = await strategy.handleConversation({
      companyId: 'company-1',
      instanceName: 'instance-1',
      remoteJid: '5511888888888@s.whatsapp.net',
      message: 'Como estao os pedidos?',
      userId: 'user-1',
    });

    expect(result).toEqual({
      message:
        'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
    });
    expect(mockSpan.recordException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'owner agent failed',
      }),
    );
    expect(mockSpan.setOutput).toHaveBeenCalledWith('chat_messages', [
      {
        role: 'assistant',
        content:
          'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
      },
    ]);
  });
});
