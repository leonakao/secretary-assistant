import { AIMessage } from '@langchain/core/messages';
import { OwnerAssistantAgentState } from '../agents/owner-assistant/owner-assistant.agent';
import { StructuredTool } from '@langchain/core/tools';
import { ClientAssistantAgentState } from '../agents/client-assistant/client-assistant.agent';

export const createToolNode = (tools: StructuredTool[]) => {
  const toolByName = tools.reduce(
    (acc, tool) => {
      acc[tool.name] = tool;
      return acc;
    },
    {} as Record<string, StructuredTool>,
  );

  return async (
    state:
      | typeof OwnerAssistantAgentState.State
      | typeof ClientAssistantAgentState.State,
  ) => {
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
          console.log('🔧 [TOOL] Executing tool:', toolCall.name);
          console.log('🔧 [TOOL] Args:', toolCall.args);
          const result = await tool.invoke(toolCall.args, {
            configurable: {
              context: state.context,
            },
          });

          return {
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
            name: toolCall.name,
          };
        } catch (error) {
          return {
            role: 'tool',
            content: `Erro: ${error.message}`,
            tool_call_id: toolCall.id,
            name: toolCall.name,
          };
        }
      }),
    );

    return { messages: toolMessages };
  };
};
