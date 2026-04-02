import { RunnableConfig } from '@langchain/core/runnables';
import { AgentContext } from '../agents/agent.state';

export function resolveThreadId(
  config: RunnableConfig | undefined,
  context: Pick<AgentContext, 'contactId' | 'userId'>,
): string | undefined {
  const configuredThreadId = config?.configurable?.thread_id;

  if (typeof configuredThreadId === 'string' && configuredThreadId.trim()) {
    return configuredThreadId;
  }

  return context.contactId ?? context.userId;
}
