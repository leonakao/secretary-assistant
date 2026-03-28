import {
  getOnboardingState,
  type OnboardingStateResponse,
} from '../api/onboarding.api';
import type { BoundApiClient, LoaderFactory } from '~/lib/api-client-context';

export type OnboardingPageLoaderData = OnboardingStateResponse;

export const loadOnboardingPageData: LoaderFactory<OnboardingPageLoaderData> =
  (client: BoundApiClient) => () => getOnboardingState(client);
