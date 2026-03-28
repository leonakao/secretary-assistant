import type { SessionUser } from '../api/get-current-user';

export type AuthenticatedEntryTarget = '/app' | '/onboarding';

export function resolveAuthenticatedEntryTarget(
  user: SessionUser,
): AuthenticatedEntryTarget {
  return user.onboarding.requiresOnboarding ? '/onboarding' : '/app';
}
