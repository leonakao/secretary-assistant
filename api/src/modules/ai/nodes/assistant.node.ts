import { Runnable } from '@langchain/core/runnables';
import { AgentState } from '../agents/agent.state';
import { createLangWatchRunnableConfig } from 'src/observability/langwatch';
import type { LlmModelObservabilityMetadata } from '../services/llm-model.service';

export type BuildPromptFromState = (state: typeof AgentState.State) => string;

export const createAssistantNode =
  (
    modelWithTools: Runnable,
    buildPromptFromState: BuildPromptFromState,
    llmMetadata: LlmModelObservabilityMetadata,
  ) =>
  async (state: typeof AgentState.State) => {
    const systemMessage = buildPromptFromState(state);
    const messages = [
      { role: 'system', content: systemMessage },
      ...state.messages,
    ];

    const context = state.context;

    const response = await modelWithTools.invoke(
      messages,
      createLangWatchRunnableConfig(
        {
          configurable: {
            context,
          },
        },
        {
          companyId: context.companyId,
          contactId: context.contactId,
          instanceName: context.instanceName,
          ...llmMetadata,
          operation: 'agent_assistant_node',
          threadId: context.contactId ?? context.userId,
          userId: context.userId,
        },
      ),
    );

    console.log('Assistant response:', response);

    return { messages: [response] };
  };
