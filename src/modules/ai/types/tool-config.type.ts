import { RunnableConfig } from '@langchain/core/runnables';
import { OwnerAgentContext } from '../agents/owner-assistant/owner-assistant.agent';
import { ClientAgentContext } from '../agents/client-assistant/client-assistant.agent';

type SupportedAgentContext = OwnerAgentContext | ClientAgentContext;

/**
 * Configuration object passed to tool _call methods
 * Extends LangChain's RunnableConfig with our custom context
 */
export interface ToolConfig<T = SupportedAgentContext> extends RunnableConfig {
  configurable: {
    context: T;
  };
}
