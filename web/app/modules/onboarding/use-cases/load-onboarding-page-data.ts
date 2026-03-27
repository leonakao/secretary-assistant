import {
  getOnboardingState,
  type OnboardingStateResponse,
} from '../api/onboarding.api';

export type OnboardingPageLoaderData = OnboardingStateResponse;

export async function loadOnboardingPageData(): Promise<OnboardingPageLoaderData> {
  return getOnboardingState();
}
