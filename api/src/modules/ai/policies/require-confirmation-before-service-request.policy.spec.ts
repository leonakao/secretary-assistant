import { AIMessage } from '@langchain/core/messages';
import { RequireConfirmationBeforeServiceRequestPolicy } from './require-confirmation-before-service-request.policy';

describe('RequireConfirmationBeforeServiceRequestPolicy', () => {
  it('allows assistant turns without protected service request tool calls', async () => {
    const policy = new RequireConfirmationBeforeServiceRequestPolicy();

    const decision = await policy.evaluate({
      lastAssistantMessage: new AIMessage({
        content: '',
        tool_calls: [{ id: 'tool-1', name: 'searchConversation', args: {} }],
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

  it('blocks protected service request actions when there is no active confirmation', async () => {
    const policy = new RequireConfirmationBeforeServiceRequestPolicy();

    const decision = await policy.evaluate({
      lastAssistantMessage: new AIMessage({
        content: '',
        tool_calls: [
          { id: 'tool-1', name: 'createServiceRequest', args: {} },
          { id: 'tool-2', name: 'updateServiceRequest', args: {} },
        ],
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

    expect(decision.allow).toBe(false);
    expect(decision).toMatchObject({
      metadata: {
        blockedToolNames: ['createServiceRequest', 'updateServiceRequest'],
      },
    });
  });

  it('allows protected service request actions when there is an active confirmation in context', async () => {
    const policy = new RequireConfirmationBeforeServiceRequestPolicy();

    const decision = await policy.evaluate({
      lastAssistantMessage: new AIMessage({
        content: '',
        tool_calls: [{ id: 'tool-1', name: 'createServiceRequest', args: {} }],
      }),
      state: {
        context: {
          companyId: 'company-1',
          companyDescription: 'Contexto',
          confirmations: [
            {
              contactId: 'contact-1',
              description: 'Confirmar agendamento',
              expectedResult: 'Cliente confirma o horário',
              id: 'confirmation-1',
              userId: 'user-1',
            },
          ],
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [],
        needsHumanSupport: false,
      } as never,
    });

    expect(decision).toEqual({ allow: true });
  });

  it('blocks owner-side protected actions when only unrelated confirmations are present', async () => {
    const policy = new RequireConfirmationBeforeServiceRequestPolicy();

    const decision = await policy.evaluate({
      lastAssistantMessage: new AIMessage({
        content: '',
        tool_calls: [
          {
            id: 'tool-1',
            name: 'createServiceRequest',
            args: {
              contactId: 'contact-9',
            },
          },
        ],
      }),
      state: {
        context: {
          companyId: 'company-1',
          companyDescription: 'Contexto',
          confirmations: [
            {
              contactId: 'contact-1',
              description: 'Confirmar visita tecnica',
              expectedResult: 'Cliente confirma a visita',
              id: 'confirmation-1',
              userId: 'user-1',
            },
            {
              contactId: 'contact-2',
              description: 'Confirmar entrega',
              expectedResult: 'Cliente confirma o recebimento',
              id: 'confirmation-2',
              userId: 'user-1',
            },
          ],
          instanceName: 'instance-1',
        },
        lastInteraction: new Date(),
        messages: [],
        needsHumanSupport: false,
      } as never,
    });

    expect(decision.allow).toBe(false);
    expect(decision).toMatchObject({
      blockedToolCallIds: ['tool-1'],
    });
  });

  it('blocks owner-side updateServiceRequest when only requestId is provided and relevance cannot be proven', async () => {
    const policy = new RequireConfirmationBeforeServiceRequestPolicy();

    const decision = await policy.evaluate({
      lastAssistantMessage: new AIMessage({
        content: '',
        tool_calls: [
          {
            id: 'tool-1',
            name: 'updateServiceRequest',
            args: {
              requestId: 'request-1',
            },
          },
        ],
      }),
      state: {
        context: {
          companyId: 'company-1',
          companyDescription: 'Contexto',
          confirmations: [
            {
              contactId: 'contact-a',
              description: 'Confirmar reagendamento',
              expectedResult: 'Cliente confirma novo horario',
              id: 'confirmation-1',
              userId: 'user-1',
            },
          ],
          instanceName: 'instance-1',
          userId: 'user-1',
        },
        lastInteraction: new Date(),
        messages: [],
        needsHumanSupport: false,
      } as never,
    });

    expect(decision.allow).toBe(false);
    expect(decision).toMatchObject({
      blockedToolCallIds: ['tool-1'],
      metadata: {
        blockedToolNames: ['updateServiceRequest'],
      },
    });
  });
});
