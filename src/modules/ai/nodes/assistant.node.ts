import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Runnable } from '@langchain/core/runnables';
import { AgentState } from '../agents/agent.state';

export type BuildPromptFromState = (state: typeof AgentState.State) => string;

export const createAssistantNode =
  (
    modelWithTools: ChatGoogleGenerativeAI | Runnable,
    buildPromptFromState: BuildPromptFromState,
  ) =>
  async (state: typeof AgentState.State) => {
    const systemMessage = buildPromptFromState(state);
    const messages = [
      { role: 'system', content: systemMessage },
      ...state.messages,
    ];

    const context = state.context;

    const response = await modelWithTools.invoke(messages, {
      configurable: {
        context,
      },
    });

    console.log('Assistant response:', response);

    return { messages: [response] };
  };
