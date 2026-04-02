import {
  AgentPolicy,
  PolicyDecision,
  PolicyEvaluationParams,
} from './agent-policy.interface';
import { PendingConfirmation } from 'src/modules/service-requests/services/find-pending-confirmations.service';

type RequireConfirmationBeforeServiceRequestPolicyOptions = {
  toolNames?: string[];
};

function getStringArg(args: unknown, key: string): string | undefined {
  if (!args || typeof args !== 'object') {
    return undefined;
  }

  const value = (args as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function findRelevantConfirmations(params: {
  confirmations: PendingConfirmation[];
  contactId?: string;
  toolName: string;
}): PendingConfirmation[] {
  const { confirmations, contactId, toolName } = params;

  if (contactId) {
    return confirmations.filter(
      (confirmation) => confirmation.contactId === contactId,
    );
  }

  if (toolName === 'updateServiceRequest') {
    return [];
  }

  return confirmations.length === 1 ? confirmations : [];
}

export class RequireConfirmationBeforeServiceRequestPolicy
  implements AgentPolicy
{
  readonly name = 'require-confirmation-before-service-request';
  private readonly toolNames: Set<string>;

  constructor(
    options: RequireConfirmationBeforeServiceRequestPolicyOptions = {},
  ) {
    this.toolNames = new Set(
      options.toolNames ?? ['createServiceRequest', 'updateServiceRequest'],
    );
  }

  async evaluate({
    lastAssistantMessage,
    state,
  }: PolicyEvaluationParams): Promise<PolicyDecision> {
    const protectedToolCalls =
      lastAssistantMessage.tool_calls?.filter((toolCall) =>
        this.toolNames.has(toolCall.name),
      ) ?? [];

    if (protectedToolCalls.length === 0) {
      return { allow: true };
    }

    const blockedToolCallIds: string[] = [];

    for (const toolCall of protectedToolCalls) {
      const relevantContactId =
        state.context.contactId ?? getStringArg(toolCall.args, 'contactId');
      const relevantConfirmations = findRelevantConfirmations({
        confirmations: state.context.confirmations,
        contactId: relevantContactId,
        toolName: toolCall.name,
      });

      if (relevantConfirmations.length !== 1) {
        blockedToolCallIds.push(toolCall.id ?? toolCall.name);
      }
    }

    if (blockedToolCallIds.length === 0) {
      return { allow: true };
    }

    return {
      allow: false,
      blockedToolCallIds,
      reason:
        'Ação de service request bloqueada porque não foi possível identificar uma confirmação ativa e relevante para esta ação.',
      remediation:
        'Crie ou atualize uma confirmação relevante antes de tentar criar ou alterar a requisição de serviço.',
      metadata: {
        blockedToolNames: protectedToolCalls
          .filter((toolCall) =>
            blockedToolCallIds.includes(toolCall.id ?? toolCall.name),
          )
          .map((toolCall) => toolCall.name),
      },
    };
  }
}
