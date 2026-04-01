import type { BrowserContext, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import {
  createE2EIdentity,
  type E2EAuthClaims,
  type E2EIdentity,
} from '../../../app/modules/auth/e2e-auth';
import type { SessionUser } from '../../../app/modules/auth/api/get-current-user';

export type { E2EIdentity } from '../../../app/modules/auth/e2e-auth';

export const E2E_AUTH_ENABLED_STORAGE_KEY =
  'secretary-assistant:e2e-auth-enabled';
export const E2E_AUTH_STORAGE_KEY = 'secretary-assistant:e2e-auth';

export interface SettingsAuthIdentityOptions {
  email?: string;
  key?: string;
  name?: string;
  sub?: string;
}

export interface SettingsSessionUserOptions {
  companyId?: string;
  companyName?: string;
  identity?: E2EIdentity;
  step?: SessionUser['company'] extends { step: infer T } ? T : never;
  userId?: string;
}

export function slugifySettingsValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createDeterministicSettingsId(...parts: Array<string | null | undefined>): string {
  const hash = createHash('sha256')
    .update(parts.filter((part): part is string => typeof part === 'string').join('::'))
    .digest('hex');

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

export function createSettingsOwnerIdentity(
  options: SettingsAuthIdentityOptions = {},
): E2EIdentity {
  const key = slugifySettingsValue(options.key ?? 'settings-owner');
  const claims: E2EAuthClaims = {
    email: options.email ?? `${key}@secretary-assistant.test`,
    name: options.name ?? 'Settings E2E Owner',
    sub: options.sub ?? `e2e|settings|${key}`,
  };

  return createE2EIdentity(claims);
}

export function buildSettingsSessionUser(
  options: SettingsSessionUserOptions = {},
): SessionUser {
  const identity = options.identity ?? createSettingsOwnerIdentity();
  const companyId = options.companyId ?? 'company-settings-e2e';

  return {
    authProviderId: identity.claims.sub,
    company: {
      id: companyId,
      name: options.companyName ?? 'Settings E2E Co.',
      role: 'owner',
      step: options.step ?? 'running',
    },
    createdAt: '2026-03-30T00:00:00.000Z',
    email: identity.claims.email,
    id: options.userId ?? 'user-settings-e2e',
    name: identity.claims.name,
    onboarding: {
      requiresOnboarding: false,
      step: 'complete',
    },
    phone: null,
    updatedAt: '2026-03-30T00:00:00.000Z',
  };
}

export function createSettingsAuthHeaders(identity: E2EIdentity): Record<string, string> {
  return {
    Authorization: `Bearer ${identity.token}`,
    'Content-Type': 'application/json',
  };
}

async function installSessionStorage(
  target: BrowserContext | Page,
  identity: E2EIdentity,
) {
  await target.addInitScript(
    (payload: {
      enabledKey: string;
      session: { token: string; user: E2EIdentity['user'] };
      sessionKey: string;
    }) => {
      window.localStorage.setItem(payload.enabledKey, 'true');
      window.localStorage.setItem(
        payload.sessionKey,
        JSON.stringify(payload.session),
      );
    },
    {
      enabledKey: E2E_AUTH_ENABLED_STORAGE_KEY,
      session: {
        token: identity.token,
        user: identity.user,
      },
      sessionKey: E2E_AUTH_STORAGE_KEY,
    },
  );
}

export async function authenticateSettingsPage(
  page: Page,
  identity: E2EIdentity = createSettingsOwnerIdentity(),
): Promise<E2EIdentity> {
  await installSessionStorage(page, identity);
  return identity;
}

export async function authenticateSettingsContext(
  context: BrowserContext,
  identity: E2EIdentity = createSettingsOwnerIdentity(),
): Promise<E2EIdentity> {
  await installSessionStorage(context, identity);
  return identity;
}
