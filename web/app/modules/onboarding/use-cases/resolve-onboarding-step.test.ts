import { describe, expect, it } from 'vitest';
import { resolveOnboardingStep } from './resolve-onboarding-step';
import type { OnboardingPageLoaderData } from './load-onboarding-page-data';

function makeData(
  step: 'company-bootstrap' | 'assistant-chat' | 'complete',
): OnboardingPageLoaderData {
  return {
    company:
      step === 'company-bootstrap'
        ? null
        : {
            id: 'company-1',
            name: 'Acme',
            step: step === 'complete' ? 'running' : 'onboarding',
            role: 'owner',
          },
    onboarding: {
      requiresOnboarding: step !== 'complete',
      step,
    },
    conversation: {
      threadId: 'onboarding:company-1:user-1',
      messages: [],
    },
  };
}

describe('resolveOnboardingStep', () => {
  it('returns company-bootstrap', () => {
    expect(resolveOnboardingStep(makeData('company-bootstrap'))).toBe(
      'company-bootstrap',
    );
  });

  it('returns assistant-chat', () => {
    expect(resolveOnboardingStep(makeData('assistant-chat'))).toBe(
      'assistant-chat',
    );
  });

  it('returns complete', () => {
    expect(resolveOnboardingStep(makeData('complete'))).toBe('complete');
  });
});
