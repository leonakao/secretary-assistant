import type { OnboardingPageLoaderData } from './load-onboarding-page-data';

export type OnboardingStep = 'company-bootstrap' | 'assistant-chat' | 'complete';

export function resolveOnboardingStep(data: OnboardingPageLoaderData): OnboardingStep {
  return data.onboarding.step;
}
