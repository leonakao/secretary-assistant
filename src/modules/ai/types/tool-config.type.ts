import { RunnableConfig } from '@langchain/core/runnables';
import { AgentContext as OwnerAgentContext } from '../agents/owner-assistant.agent';
import { ClientAgentContext } from '../agents/client-assistant.agent';

type SupportedAgentContext = OwnerAgentContext | ClientAgentContext;

/**
 * Configuration object passed to tool _call methods
 * Extends LangChain's RunnableConfig with our custom context
 */
export interface ToolConfig extends RunnableConfig {
  configurable: {
    context: SupportedAgentContext;
  };
}
