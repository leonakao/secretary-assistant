import { ConfigService } from '@nestjs/config';
import { ClientConversationStrategy } from './client-conversation.strategy';

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
    expect(chatService.sendPresenceNotification).toHaveBeenCalled();
    expect(chatService.sendMessageAndSaveToMemory).toHaveBeenCalledWith({
      sessionId: 'contact:contact-1:session:2026-04-02T00:00:00.000Z',
      companyId: 'company-1',
      instanceName: 'instance-1',
      remoteJid: '5511999999999@s.whatsapp.net',
      message: 'Primeira parte\nSegunda parte',
    });
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
