import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { createClientScopeResponseGuard } from './client-scope-response.guard';

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
  const actual = await vi.importActual<typeof import('src/observability/langwatch')>(
    'src/observability/langwatch',
  );

  return {
    ...actual,
    langWatchTracer: {
      ...actual.langWatchTracer,
      withActiveSpan,
    },
  };
});

describe('createClientScopeResponseGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the original response when there are tool calls', async () => {
    const model = {
      withStructuredOutput: vi.fn(),
    } as any;
    const guard = createClientScopeResponseGuard(model, {
      context_window_tokens: 1,
      ls_model_name: 'helper-model',
      ls_provider: 'openai',
      max_output_tokens: 1,
    });
    const response = new AIMessage({
      content: '',
      tool_calls: [{ id: 'tool-1', name: 'searchConversation', args: {} }],
    });

    const result = await guard({
      response,
      state: {
        context: {
          companyDescription: '# Loja de shampoo',
          companyId: 'company-1',
          confirmations: [],
          contactId: 'contact-1',
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [new HumanMessage('voces fazem software?')],
        needsHumanSupport: false,
      } as never,
    });

    expect(result).toBe(response);
    expect(model.withStructuredOutput).not.toHaveBeenCalled();
    expect(withActiveSpan).toHaveBeenCalledWith(
      'guard.client_scope_response',
      expect.any(Function),
    );
    expect(mockSpan.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'langwatch.thread.id': 'contact-1',
        'secretary.company.id': 'company-1',
        'secretary.contact.id': 'contact-1',
        'secretary.operation': 'client_scope_response_guard',
      }),
    );
    expect(mockSpan.setOutput).toHaveBeenCalledWith(
      'json',
      expect.objectContaining({
        bypass_reason: 'tool_calls_present',
        decision: 'bypassed',
        tool_call_count: 1,
      }),
    );
  });

  it('replaces the response when the validator blocks an out-of-scope reply', async () => {
    const invoke = vi.fn().mockResolvedValue({
      allow: false,
      correctedReply:
        'Nao consigo ajudar com projeto de software por aqui. Se quiser, posso te mostrar os shampoos disponiveis.',
      reason: 'Fora de escopo',
    });
    const model = {
      withStructuredOutput: vi.fn(() => ({
        invoke,
      })),
    } as any;
    const guard = createClientScopeResponseGuard(model, {
      context_window_tokens: 1,
      ls_model_name: 'helper-model',
      ls_provider: 'openai',
      max_output_tokens: 1,
    });

    const result = await guard({
      response: new AIMessage(
        'Claro, podemos desenvolver um projeto de software para voce.',
      ),
      state: {
        context: {
          companyDescription:
            '# Loja de shampoo\n\nVendemos shampoos e produtos para cuidado capilar.',
          companyId: 'company-1',
          confirmations: [],
          contactId: 'contact-1',
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [new HumanMessage('voces fazem projeto de software?')],
        needsHumanSupport: false,
      } as never,
    });

    expect(invoke).toHaveBeenCalled();
    expect(result.content).toBe(
      'Nao consigo ajudar com projeto de software por aqui. Se quiser, posso te mostrar os shampoos disponiveis.',
    );
    expect(mockSpan.setInput).toHaveBeenCalledWith(
      'json',
      expect.objectContaining({
        assistant_reply_length: expect.any(Number),
        company_description_length: expect.any(Number),
        latest_user_message_length: expect.any(Number),
      }),
    );
    expect(mockSpan.setOutput).toHaveBeenCalledWith(
      'json',
      expect.objectContaining({
        decision: 'blocked',
        reason: 'Fora de escopo',
      }),
    );
  });

  it('keeps the response when the validator allows it', async () => {
    const invoke = vi.fn().mockResolvedValue({
      allow: true,
      reason: 'Dentro do escopo',
    });
    const model = {
      withStructuredOutput: vi.fn(() => ({
        invoke,
      })),
    } as any;
    const guard = createClientScopeResponseGuard(model, {
      context_window_tokens: 1,
      ls_model_name: 'helper-model',
      ls_provider: 'openai',
      max_output_tokens: 1,
    });
    const response = new AIMessage('Temos shampoo hidratante e antiqueda.');

    const result = await guard({
      response,
      state: {
        context: {
          companyDescription:
            '# Loja de shampoo\n\nVendemos shampoos e produtos para cuidado capilar.',
          companyId: 'company-1',
          confirmations: [],
          contactId: 'contact-1',
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [new HumanMessage('quais shampoos voces vendem?')],
        needsHumanSupport: false,
      } as never,
    });

    expect(result).toBe(response);
    expect(mockSpan.setOutput).toHaveBeenCalledWith(
      'json',
      expect.objectContaining({
        decision: 'allowed',
        reason: 'Dentro do escopo',
      }),
    );
  });

  it('preserves the original response when the validator fails', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('guard failed'));
    const model = {
      withStructuredOutput: vi.fn(() => ({
        invoke,
      })),
    } as any;
    const guard = createClientScopeResponseGuard(model, {
      context_window_tokens: 1,
      ls_model_name: 'helper-model',
      ls_provider: 'openai',
      max_output_tokens: 1,
    });
    const response = new AIMessage('Temos shampoo hidratante.');

    const result = await guard({
      response,
      state: {
        context: {
          companyDescription:
            '# Loja de shampoo\n\nVendemos shampoos e produtos para cuidado capilar.',
          companyId: 'company-1',
          confirmations: [],
          contactId: 'contact-1',
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [new HumanMessage('quais shampoos voces vendem?')],
        needsHumanSupport: false,
      } as never,
    });

    expect(result).toBe(response);
    expect(mockSpan.recordException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'guard failed',
      }),
    );
    expect(mockSpan.setOutput).toHaveBeenCalledWith(
      'json',
      expect.objectContaining({
        decision: 'error',
        error_message: 'guard failed',
      }),
    );
  });
});
