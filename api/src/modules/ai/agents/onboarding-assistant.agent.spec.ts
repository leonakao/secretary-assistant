import { describe, expect, it } from 'vitest';
import { OnboardingAssistantAgent } from './onboarding-assistant.agent';

describe('OnboardingAssistantAgent', () => {
  it('exposes only finishOnboarding as an available tool', () => {
    const finishOnboardingTool = { name: 'finishOnboarding' };
    const agent = Object.assign(
      Object.create(OnboardingAssistantAgent.prototype),
      {
        finishOnboardingTool,
      },
    ) as OnboardingAssistantAgent;

    const tools = (agent as any).getTools();

    expect(tools).toEqual([finishOnboardingTool]);
  });
});
