import { AIMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { createPolicyGateNode } from './policy-gate.node';

describe('createPolicyGateNode', () => {
  it('routes to tools when all policies allow', async () => {
    const node = createPolicyGateNode([
      {
        name: 'allow-all',
        evaluate: async () => ({ allow: true as const }),
      },
    ]);

    const result = await node({
      context: {
        companyId: 'company-1',
        companyDescription: 'Contexto',
        confirmations: [],
        instanceName: 'instance-1',
      },
      lastInteraction: new Date(),
      messages: [
        new AIMessage({
          content: '',
          tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
        }),
      ],
      needsHumanSupport: false,
    } as never);

    expect(result).toBeInstanceOf(Command);
    expect((result as Command).goto).toEqual(['tools']);
  });

  it('routes back to assistant with tool feedback when blocked', async () => {
    const node = createPolicyGateNode([
      {
        name: 'block-all',
        evaluate: async () => ({
          allow: false as const,
          reason: 'Confirmacao ausente',
          remediation: 'Peca confirmacao explicita.',
        }),
      },
    ]);

    const result = await node({
      context: {
        companyId: 'company-1',
        companyDescription: 'Contexto',
        confirmations: [],
        instanceName: 'instance-1',
      },
      lastInteraction: new Date(),
      messages: [
        new AIMessage({
          content: '',
          tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
        }),
      ],
      needsHumanSupport: false,
    } as never);

    expect(result).toBeInstanceOf(Command);
    expect((result as Command).goto).toEqual(['assistant']);
    expect(
      ((result as Command).update as { messages: Array<{ content: string }> })
        .messages[0].content,
    ).toContain('Confirmacao ausente');
  });

  it('preserves allowed tool calls when a policy blocks only part of the batch', async () => {
    const node = createPolicyGateNode([
      {
        name: 'partial-block',
        evaluate: async () => ({
          allow: false as const,
          blockedToolCallIds: ['tool-2'],
          reason: 'Atualizacao bloqueada',
          remediation: 'Crie uma confirmacao primeiro.',
        }),
      },
    ]);

    const result = await node({
      context: {
        companyId: 'company-1',
        companyDescription: 'Contexto',
        confirmations: [],
        instanceName: 'instance-1',
      },
      lastInteraction: new Date(),
      messages: [
        new AIMessage({
          content: '',
          tool_calls: [
            { id: 'tool-1', name: 'searchConversation', args: {} },
            { id: 'tool-2', name: 'updateServiceRequest', args: {} },
          ],
        }),
      ],
      needsHumanSupport: false,
    } as never);

    expect(result).toBeInstanceOf(Command);
    expect((result as Command).goto).toEqual(['tools']);
    const updatedMessages = (
      (result as Command).update as {
        messages: AIMessage[];
      }
    ).messages;
    expect(updatedMessages[0].content).toContain('Atualizacao bloqueada');
    expect(updatedMessages[1]).toBeInstanceOf(AIMessage);
    expect(updatedMessages[1].tool_calls).toEqual([
      { id: 'tool-1', name: 'searchConversation', args: {} },
    ]);
  });
});
