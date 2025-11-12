import { RunnableConfig } from '@langchain/core/runnables';
import { OwnerAgentContext } from '../agents/owner-assistant.agent';
import { ClientAgentContext } from '../agents/client-assistant.agent';

interface MediationContext {
  activeMediations?: {
    id: string;
    description: string;
    expectedResult: string;
    interactionPending: 'user' | 'contact';
  }[];
}

type SupportedAgentContext =
  | (OwnerAgentContext & MediationContext)
  | (ClientAgentContext & MediationContext);

/**
 * Configuration object passed to tool _call methods
 * Extends LangChain's RunnableConfig with our custom context
 */
export interface ToolConfig<T = SupportedAgentContext> extends RunnableConfig {
  configurable: {
    context: T;
  };
}
