import { RunnableConfig } from '@langchain/core/runnables';
import { AgentContext } from '../agents/owner-assistant.agent';

/**
 * Configuration object passed to tool _call methods
 * Extends LangChain's RunnableConfig with our custom context
 */
export interface ToolConfig extends RunnableConfig {
  configurable: {
    context: AgentContext;
  };
}
