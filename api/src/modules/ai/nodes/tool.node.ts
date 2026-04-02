import { StructuredTool } from '@langchain/core/tools';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import { AgentState } from '../agents/agent.state';
import {
  buildLangWatchAttributes,
  createLangWatchRunnableConfig,
  langWatchTracer,
} from 'src/observability/langwatch';

function normalizeToolResult(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  if (result instanceof Command) {
    return JSON.stringify({
      goto: result.goto,
      result: (result as any).result,
      update: result.update,
    });
  }

  return JSON.stringify(result);
}

export const createToolNode = (tools: StructuredTool[]) => {
  const toolByName = tools.reduce(
    (acc, tool) => {
      acc[tool.name] = tool;
      return acc;
    },
    {} as Record<string, StructuredTool>,
  );

  return async (state: typeof AgentState.State, config?: RunnableConfig) => {
    const toolCalls =
      (state.messages[state.messages.length - 1] as AIMessage).tool_calls || [];

    const toolMessages = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const tool = toolByName[toolCall.name];
        if (!tool) {
          return {
            role: 'tool',
            content: `Tool ${toolCall.name} not found`,
            tool_call_id: toolCall.id,
          };
        }

        try {
          const result = await langWatchTracer.withActiveSpan(
            `tool.${toolCall.name}`,
            async (span) => {
              span
                .setType('tool')
                .setInput('json', toolCall.args)
                .setAttributes(
                  buildLangWatchAttributes({
                    companyId: state.context.companyId,
                    contactId: state.context.contactId,
                    instanceName: state.context.instanceName,
                    operation: `tool_${toolCall.name}`,
                    threadId: state.context.contactId ?? state.context.userId,
                    userId: state.context.userId,
                  }),
                );

              const result = await tool.invoke(
                toolCall.args,
                createLangWatchRunnableConfig(
                  {
                    ...(state as RunnableConfig),
                    ...config,
                    configurable: {
                      ...(config?.configurable ?? {}),
                      context: state.context,
                    },
                  },
                  {
                    companyId: state.context.companyId,
                    contactId: state.context.contactId,
                    instanceName: state.context.instanceName,
                    operation: `tool_${toolCall.name}_invoke`,
                    threadId: state.context.contactId ?? state.context.userId,
                    userId: state.context.userId,
                  },
                ),
              );

              span.setOutput('text', normalizeToolResult(result));

              return result;
            },
          );

          const content =
            result instanceof Command
              ? (result as any).result || 'Command executed'
              : result;

          const toolMessage = new ToolMessage({
            content,
            tool_call_id: toolCall.id ?? toolCall.name,
            name: toolCall.name,
          });

          if (result instanceof Command) {
            (result as any).toolMessage = toolMessage;
            return result;
          }

          return toolMessage;
        } catch (error) {
          return new ToolMessage({
            content: `Erro: ${error.message}`,
            tool_call_id: toolCall.id ?? toolCall.name,
            name: toolCall.name,
          });
        }
      }),
    );

    const messages = toolMessages.filter(
      (message): message is ToolMessage => message instanceof ToolMessage,
    );

    const command = toolMessages.find(
      (message): message is Command => message instanceof Command,
    );

    if (command) {
      command.update = {
        ...command.update,
        messages: [
          ...((command.update as { messages?: ToolMessage[] })?.messages || []),
          ...messages,
        ],
      };

      console.log('🔧 [TOOL] Command:', JSON.stringify(command));

      return command;
    }

    return { messages };
  };
};
