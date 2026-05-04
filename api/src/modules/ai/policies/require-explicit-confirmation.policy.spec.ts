import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { RequireExplicitConfirmationPolicy } from './require-explicit-confirmation.policy';

describe('RequireExplicitConfirmationPolicy', () => {
  it('allows unrelated tool calls', async () => {
    const policy = new RequireExplicitConfirmationPolicy('finishOnboarding');

    const decision = await policy.evaluate({
      lastAssistantMessage: new AIMessage({
        content: '',
        tool_calls: [{ id: 'tool-1', name: 'searchUser', args: {} }],
      }),
      state: {
        context: {
          companyId: 'company-1',
          companyDescription: 'Contexto',
          confirmations: [],
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [],
        needsHumanSupport: false,
      } as never,
    });

    expect(decision).toEqual({ allow: true });
  });

  it('blocks ambiguous confirmation when finishOnboarding is requested', async () => {
    const policy = new RequireExplicitConfirmationPolicy('finishOnboarding');

    const decision = await policy.evaluate({
      lastAssistantMessage: new AIMessage({
        content: '',
        tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
      }),
      state: {
        context: {
          companyId: 'company-1',
          companyDescription: 'Contexto',
          confirmations: [],
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [
          new AIMessage('Posso finalizar o onboarding agora?'),
          new HumanMessage('acho que sim'),
          new AIMessage({
            content: '',
            tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
          }),
        ],
        needsHumanSupport: false,
      } as never,
    });

    expect(decision.allow).toBe(false);
  });

  it('accepts explicit and contextual confirmation', async () => {
    const policy = new RequireExplicitConfirmationPolicy('finishOnboarding');

    const decision = await policy.evaluate({
      lastAssistantMessage: new AIMessage({
        content: '',
        tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
      }),
      state: {
        context: {
          companyId: 'company-1',
          companyDescription: 'Contexto',
          confirmations: [],
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [
          new AIMessage('Posso finalizar o onboarding agora?'),
          new HumanMessage('sim, pode finalizar'),
          new AIMessage({
            content: '',
            tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
          }),
        ],
        needsHumanSupport: false,
      } as never,
    });

    expect(decision).toEqual({ allow: true });
  });

  it.each(['ok', 'beleza', 'fechado', 'pode ser', 'manda ver'])(
    'accepts "%s" as contextual confirmation after finalization question',
    async (confirmationText) => {
      const policy = new RequireExplicitConfirmationPolicy('finishOnboarding');

      const decision = await policy.evaluate({
        lastAssistantMessage: new AIMessage({
          content: '',
          tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
        }),
        state: {
          context: {
            companyId: 'company-1',
            companyDescription: 'Contexto',
            confirmations: [],
            instanceName: 'instance-1',
          },
          lastInteraction: new Date(),
          messages: [
            new AIMessage(
              'Já tenho as informações necessárias. Posso finalizar o onboarding agora?',
            ),
            new HumanMessage(confirmationText),
            new AIMessage({
              content: '',
              tool_calls: [
                { id: 'tool-1', name: 'finishOnboarding', args: {} },
              ],
            }),
          ],
          needsHumanSupport: false,
        } as never,
      });

      expect(decision).toEqual({ allow: true });
    },
  );

  it('does not accept a generic ok without finalization context', async () => {
    const policy = new RequireExplicitConfirmationPolicy('finishOnboarding');

    const decision = await policy.evaluate({
      lastAssistantMessage: new AIMessage({
        content: '',
        tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
      }),
      state: {
        context: {
          companyId: 'company-1',
          companyDescription: 'Contexto',
          confirmations: [],
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [
          new AIMessage('Qual é o horário de atendimento?'),
          new HumanMessage('ok'),
          new AIMessage({
            content: '',
            tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
          }),
        ],
        needsHumanSupport: false,
      } as never,
    });

    expect(decision.allow).toBe(false);
  });

  it.each(['finaliza', 'pode concluir', 'quero encerrar'])(
    'accepts direct finalization request "%s"',
    async (confirmationText) => {
      const policy = new RequireExplicitConfirmationPolicy('finishOnboarding');

      const decision = await policy.evaluate({
        lastAssistantMessage: new AIMessage({
          content: '',
          tool_calls: [{ id: 'tool-1', name: 'finishOnboarding', args: {} }],
        }),
        state: {
          context: {
            companyId: 'company-1',
            companyDescription: 'Contexto',
            confirmations: [],
            instanceName: 'instance-1',
          },
          lastInteraction: new Date(),
          messages: [
            new AIMessage('Revisei as informações coletadas.'),
            new HumanMessage(confirmationText),
            new AIMessage({
              content: '',
              tool_calls: [
                { id: 'tool-1', name: 'finishOnboarding', args: {} },
              ],
            }),
          ],
          needsHumanSupport: false,
        } as never,
      });

      expect(decision).toEqual({ allow: true });
    },
  );
});
