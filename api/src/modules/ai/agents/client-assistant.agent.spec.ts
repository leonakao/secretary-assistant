import { describe, expect, it } from 'vitest';
import { ClientAssistantAgent } from './client-assistant.agent';

describe('ClientAssistantAgent', () => {
  it('registers the service-request confirmation policy', () => {
    const agent = Object.assign(Object.create(ClientAssistantAgent.prototype), {
      createConfirmationTool: {},
      createServiceRequestTool: {},
      searchConfirmationTool: {},
      searchConversationTool: {},
      searchMemoryTool: {},
      searchServiceRequestTool: {},
      searchUserTool: {},
      sendMessageTool: {},
      updateConfirmationTool: {},
      updateMemoryTool: {},
      updateServiceRequestTool: {},
    }) as ClientAssistantAgent;

    const policies = (agent as any).getPolicies();

    expect(policies).toHaveLength(1);
    expect(policies[0].name).toBe(
      'require-confirmation-before-service-request',
    );
  });
});
