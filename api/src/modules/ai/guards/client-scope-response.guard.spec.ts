import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { createClientScopeResponseGuard } from './client-scope-response.guard';

describe('createClientScopeResponseGuard', () => {
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
  });
});
