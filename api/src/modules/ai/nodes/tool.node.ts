import { StructuredTool } from '@langchain/core/tools';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { AgentState } from '../agents/agent.state';

export const createToolNode = (tools: StructuredTool[]) => {
  const toolByName = tools.reduce(
    (acc, tool) => {
      acc[tool.name] = tool;
      return acc;
    },
    {} as Record<string, StructuredTool>,
  );

  return async (state: typeof AgentState.State) => {
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
          console.log(`🔧 [TOOL] Executing tool:`, toolCall.name);
          console.log(`🔧 [TOOL] Args: ${JSON.stringify(toolCall.args)}`);
          const result = await tool.invoke(toolCall.args, state);

          console.log(`🔧 [TOOL] Result: ${JSON.stringify(result)}`);

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
