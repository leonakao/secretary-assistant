import { Runnable, RunnableConfig } from '@langchain/core/runnables';
import { AIMessage } from '@langchain/core/messages';
import { AgentState } from '../agents/agent.state';
import {
  buildLangWatchAttributes,
  createLangWatchRunnableConfig,
  extractTokenUsage,
  langWatchTracer,
  setLangWatchContextUtilization,
} from 'src/observability/langwatch';
import type { LlmModelObservabilityMetadata } from '../services/llm-model.service';
import { resolveThreadId } from '../utils/resolve-thread-id';

export type BuildPromptFromState = (state: typeof AgentState.State) => string;
export type AssistantResponseGuard = (params: {
  config?: RunnableConfig;
  response: AIMessage;
  state: typeof AgentState.State;
}) => Promise<AIMessage>;

type ToolCallLike = {
  id?: string;
  name?: string;
  args?: unknown;
};

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

function getToolCalls(message: unknown): ToolCallLike[] {
  if (
    message &&
    typeof message === 'object' &&
    'tool_calls' in message &&
    Array.isArray(message.tool_calls)
  ) {
    return message.tool_calls as ToolCallLike[];
  }

  return [];
}

function shouldRecordMessageForTracing(message: {
  role?: string;
  type?: string;
  content?: unknown;
}): boolean {
  const role = getMessageRole(message);
  const content = normalizeMessageContent(message.content);

  if (content.trim().length > 0) {
    return true;
  }

  return role !== 'assistant' || getToolCalls(message).length === 0;
}

export const createAssistantNode =
  (
    modelWithTools: Runnable,
    buildPromptFromState: BuildPromptFromState,
    llmMetadata: LlmModelObservabilityMetadata,
    responseGuard?: AssistantResponseGuard,
  ) =>
  async (state: typeof AgentState.State, config?: RunnableConfig) => {
    const systemMessage = buildPromptFromState(state);
    const messages = [
      { role: 'system', content: systemMessage },
      ...state.messages,
    ];

    const context = state.context;
    const threadId = resolveThreadId(config, context);
    const response = await langWatchTracer.withActiveSpan(
      'agent.assistant.reply',
      async (span) => {
        span
          .setType('llm')
          .setRequestModel(llmMetadata.ls_model_name)
          .setInput(
            'chat_messages',
            messages
              .filter((message) => shouldRecordMessageForTracing(message))
              .map((message) => ({
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
              threadId,
              userId: context.userId,
            }),
          );

        let response = (await modelWithTools.invoke(
          messages,
          createLangWatchRunnableConfig(
            {
              ...config,
              configurable: {
                ...(config?.configurable ?? {}),
                context,
              },
            },
            {
              ...llmMetadata,
              companyId: context.companyId,
              contactId: context.contactId,
              instanceName: context.instanceName,
              operation: 'agent_assistant_model_invoke',
              threadId,
              userId: context.userId,
            },
          ),
        )) as AIMessage;

        if (responseGuard) {
          response = await responseGuard({
            config,
            response,
            state,
          });
        }

        const responseContent = normalizeMessageContent(response.content);
        const toolCalls = getToolCalls(response);
        const tokenUsage = extractTokenUsage(response);
        const assistantOutput =
          responseContent ||
          (toolCalls.length > 0
            ? `[assistant requested ${toolCalls.length} tool call(s)]`
            : '[resposta sem texto visível; verifique tool calls associados]');

        setLangWatchContextUtilization(span, llmMetadata, tokenUsage);

        span
          .setResponseModel(llmMetadata.ls_model_name)
          .setOutput('chat_messages', [
            {
              role: 'assistant',
              content: assistantOutput,
            },
          ]);

        if (toolCalls.length > 0) {
          span.setOutput({
            assistant: {
              content: assistantOutput,
              tool_calls: toolCalls.map((toolCall) => ({
                id: toolCall.id,
                name: toolCall.name,
                args: toolCall.args,
              })),
            },
          });
        }

        return response;
      },
    );

    console.log('Assistant response:', response);

    return { messages: [response] };
  };
