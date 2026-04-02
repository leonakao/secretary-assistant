import { Runnable } from '@langchain/core/runnables';
import { AgentState } from '../agents/agent.state';
import {
  buildLangWatchAttributes,
  langWatchTracer,
} from 'src/observability/langwatch';
import type { LlmModelObservabilityMetadata } from '../services/llm-model.service';

export type BuildPromptFromState = (state: typeof AgentState.State) => string;

function normalizeMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => normalizeMessageContent(item))
      .filter((item) => item.trim().length > 0)
      .join('\n');
  }

  if (content && typeof content === 'object') {
    if ('text' in content && typeof content.text === 'string') {
      return content.text;
    }

    if ('content' in content) {
      return normalizeMessageContent(content.content);
    }
  }

  return JSON.stringify(content);
}

function getMessageRole(message: { role?: string; type?: string }): string {
  if (message.role) {
    return message.role;
  }

  switch (message.type) {
    case 'human':
      return 'user';
    case 'ai':
      return 'assistant';
    case 'system':
      return 'system';
    case 'tool':
      return 'tool';
    default:
      return 'user';
  }
}

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
    const response = await langWatchTracer.withActiveSpan(
      'agent.assistant.reply',
      async (span) => {
        span
          .setType('llm')
          .setRequestModel(llmMetadata.ls_model_name)
          .setInput(
            'chat_messages',
            messages.map((message) => ({
              role: getMessageRole(message),
              content: normalizeMessageContent(message.content),
            })),
          )
          .setAttributes(
            buildLangWatchAttributes({
              companyId: context.companyId,
              contactId: context.contactId,
              instanceName: context.instanceName,
              operation: 'agent_assistant_node',
              userId: context.userId,
            }),
          );

        const response = await modelWithTools.invoke(messages, {
          configurable: {
            context,
          },
        });
        const responseContent = normalizeMessageContent(response.content);

        span
          .setResponseModel(llmMetadata.ls_model_name)
          .setOutput('chat_messages', [
            {
              role: 'assistant',
              content:
                responseContent ||
                '[resposta sem texto visível; verifique tool calls associados]',
            },
          ]);

        return response;
      },
    );

    console.log('Assistant response:', response);

    return { messages: [response] };
  };
