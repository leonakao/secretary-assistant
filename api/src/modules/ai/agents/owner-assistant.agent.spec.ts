import { describe, expect, it } from 'vitest';
import { OwnerAssistantAgent } from './owner-assistant.agent';

describe('OwnerAssistantAgent', () => {
  it('registers the service-request confirmation policy', () => {
    const agent = Object.assign(Object.create(OwnerAssistantAgent.prototype), {
      createConfirmationTool: {},
      createServiceRequestTool: {},
      searchConfirmationTool: {},
      searchConversationTool: {},
      searchServiceRequestTool: {},
      searchUserTool: {},
      sendMessageTool: {},
      updateConfirmationTool: {},
      updateServiceRequestTool: {},
    }) as OwnerAssistantAgent;

    const policies = (agent as any).getPolicies();

    expect(policies).toHaveLength(1);
    expect(policies[0].name).toBe(
      'require-confirmation-before-service-request',
    );
  });
});
