import { AIMessage } from '@langchain/core/messages';
import { AgentState } from '../agents/agent.state';

export interface PolicyEvaluationParams {
  lastAssistantMessage: AIMessage;
  state: typeof AgentState.State;
}

export type PolicyDecision =
  | { allow: true }
  | {
      allow: false;
      metadata?: Record<string, unknown>;
      blockedToolCallIds?: string[];
      reason: string;
      remediation: string;
    };

export interface AgentPolicy {
  evaluate(params: PolicyEvaluationParams): Promise<PolicyDecision>;
  name: string;
}
