import { RunnableConfig } from '@langchain/core/runnables';
import { AgentContext } from '../agents/agent.state';

type SupportedAgentContext = AgentContext;

/**
 * Configuration object passed to tool _call methods
 * Extends LangChain's RunnableConfig with our custom context
 */
export interface ToolConfig<T = SupportedAgentContext> extends RunnableConfig {
  configurable: {
    context: T;
  };
}
