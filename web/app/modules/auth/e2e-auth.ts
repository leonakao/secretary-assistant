import type { User } from '@auth0/auth0-react';

export interface E2EAuthClaims {
  email: string;
  name: string;
  nonce?: string;
  sub: string;
}

export interface E2EIdentity {
  claims: E2EAuthClaims;
  token: string;
  user: User;
}

const E2E_TOKEN_PREFIX = 'e2e.';
const FRESH_OWNER_NAME = 'Onboarding Validation Owner';
const EXISTING_OWNER_NAME = 'Existing Validation Owner';
const E2E_EMAIL_DOMAIN = 'secretary-assistant.test';

function base64UrlEncode(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  const utf8Bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of utf8Bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildNickname(email: string): string {
  return email.split('@')[0] || 'owner';
}

export function buildE2EAuthToken(claims: E2EAuthClaims): string {
  return `${E2E_TOKEN_PREFIX}${base64UrlEncode(JSON.stringify(claims))}`;
}

export function createE2EIdentity(claims: E2EAuthClaims): E2EIdentity {
  return {
    claims,
    token: buildE2EAuthToken(claims),
    user: {
      email: claims.email,
      email_verified: true,
      name: claims.name,
      nickname: buildNickname(claims.email),
      sub: claims.sub,
    },
  };
}

export function createFreshSignupIdentity(): E2EIdentity {
  const nonce =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

  return createE2EIdentity({
    email: `onboarding-${nonce}@${E2E_EMAIL_DOMAIN}`,
    name: FRESH_OWNER_NAME,
    nonce,
    sub: `e2e|fresh-owner|${nonce}`,
  });
}

export function createExistingSigninIdentity(): E2EIdentity {
  return createE2EIdentity({
    email: `existing-owner@${E2E_EMAIL_DOMAIN}`,
    name: EXISTING_OWNER_NAME,
    nonce: 'existing-owner',
    sub: 'e2e|existing-owner',
  });
}
