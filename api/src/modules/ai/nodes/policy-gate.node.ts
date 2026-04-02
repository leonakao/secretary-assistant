import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { AgentState } from '../agents/agent.state';
import { AgentPolicy } from '../policies/agent-policy.interface';

function buildBlockedToolMessages(
  blockedToolCalls: Array<{ id?: string; name?: string }>,
  content: string,
): ToolMessage[] {
  return blockedToolCalls.map(
    (toolCall) =>
      new ToolMessage({
        content,
        name: toolCall.name ?? 'tool',
        tool_call_id: toolCall.id ?? toolCall.name ?? 'tool',
      }),
  );
}

function buildFilteredAssistantMessage(params: {
  allowedToolCalls: NonNullable<AIMessage['tool_calls']>;
  lastAssistantMessage: AIMessage;
}): AIMessage {
  const { allowedToolCalls, lastAssistantMessage } = params;

  return new AIMessage({
    content: lastAssistantMessage.content,
    id: lastAssistantMessage.id,
    name: lastAssistantMessage.name,
    tool_calls: allowedToolCalls,
  });
}

export const createPolicyGateNode =
  (policies: AgentPolicy[]) => async (state: typeof AgentState.State) => {
    const lastAssistantMessage = state.messages.at(-1);

    if (!(lastAssistantMessage instanceof AIMessage)) {
      return new Command({
        goto: 'assistant',
      });
    }

    if (!lastAssistantMessage.tool_calls?.length) {
      return new Command({
        goto: 'assistant',
      });
    }

    const originalToolCalls = lastAssistantMessage.tool_calls;
    let remainingToolCalls = [...originalToolCalls];
    const blockedMessages: ToolMessage[] = [];

    for (const policy of policies) {
      const decision = await policy.evaluate({
        lastAssistantMessage: buildFilteredAssistantMessage({
          allowedToolCalls: remainingToolCalls,
          lastAssistantMessage,
        }),
        state,
      });

      if (!decision.allow) {
        const blockedToolCalls = remainingToolCalls.filter((toolCall) =>
          decision.blockedToolCallIds?.includes(toolCall.id ?? toolCall.name),
        );
        const effectiveBlockedToolCalls =
          blockedToolCalls.length > 0 ? blockedToolCalls : remainingToolCalls;
        const blockedToolMessages = buildBlockedToolMessages(
          effectiveBlockedToolCalls,
          `Ação bloqueada pela policy "${policy.name}": ${decision.reason}\nPróximo passo: ${decision.remediation}`,
        );

        blockedMessages.push(...blockedToolMessages);
        const blockedToolIds = new Set(
          effectiveBlockedToolCalls.map(
            (toolCall) => toolCall.id ?? toolCall.name ?? 'tool',
          ),
        );
        remainingToolCalls = remainingToolCalls.filter(
          (toolCall) =>
            !blockedToolIds.has(toolCall.id ?? toolCall.name ?? 'tool'),
        );
      }
    }

    if (remainingToolCalls.length === 0) {
      return new Command({
        goto: 'assistant',
        update: {
          messages: blockedMessages,
        },
      });
    }

    if (blockedMessages.length > 0) {
      return new Command({
        goto: 'tools',
        update: {
          messages: [
            ...blockedMessages,
            buildFilteredAssistantMessage({
              allowedToolCalls: remainingToolCalls,
              lastAssistantMessage,
            }),
          ],
        },
      });
    }

    return new Command({
      goto: 'tools',
    });
  };
