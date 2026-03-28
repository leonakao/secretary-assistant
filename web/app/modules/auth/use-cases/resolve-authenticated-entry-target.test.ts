import { describe, expect, it } from 'vitest';
import { resolveAuthenticatedEntryTarget } from './resolve-authenticated-entry-target';
import type { SessionUser } from '../api/get-current-user';

function makeUser(requiresOnboarding: boolean): SessionUser {
  return {
    id: 'user-1',
    authProviderId: 'auth0|123',
    name: 'Alice',
    email: 'alice@example.com',
    phone: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    company: requiresOnboarding
      ? {
          id: 'company-1',
          name: 'Acme',
          step: 'onboarding',
          role: 'owner',
        }
      : {
          id: 'company-1',
          name: 'Acme',
          step: 'running',
          role: 'owner',
        },
    onboarding: {
      requiresOnboarding,
      step: requiresOnboarding ? 'assistant-chat' : 'complete',
    },
  };
}

describe('resolveAuthenticatedEntryTarget', () => {
  it('returns /onboarding when onboarding is required', () => {
    expect(resolveAuthenticatedEntryTarget(makeUser(true))).toBe('/onboarding');
  });

  it('returns /app when onboarding is complete', () => {
    expect(resolveAuthenticatedEntryTarget(makeUser(false))).toBe('/app');
  });
});
