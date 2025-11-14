import { AgentState } from '../agents/agent.state';
import { assistantClientPrompt } from './assistant-client';

export const buildClientPromptFromState = (
  state: typeof AgentState.State,
): string => {
  const { context } = state;

  return assistantClientPrompt(
    {
      // We only need the name for the prompt builder
      name: context.contactName ?? 'Cliente',
    } as any,
    context.companyDescription,
  );
};
