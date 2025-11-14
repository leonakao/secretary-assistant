import { AgentState } from '../agents/agent.state';
import { assistantOwnerPrompt } from './assistant-owner';

export const buildOwnerPromptFromState = (
  state: typeof AgentState.State,
): string => {
  const { context } = state;

  return assistantOwnerPrompt(
    {
      // We only need the name for the prompt builder
      name: context.userName ?? 'Proprietário',
    } as any,
    context.companyDescription,
  );
};
