import { getCurrentUser, type SessionUser } from './api/get-current-user';
import { ApiError } from '~/lib/api.client';

interface IdTokenClaims {
  __raw?: string;
}

export async function getSessionToken(
  loadIdTokenClaims: () => Promise<IdTokenClaims | undefined>,
): Promise<string> {
  const claims = await loadIdTokenClaims();
  const token = claims?.__raw;

  if (!token) {
    throw new Error('Missing Auth0 ID token');
  }

  return token;
}

export async function bootstrapAuthSession(
  loadIdTokenClaims: () => Promise<IdTokenClaims | undefined>,
): Promise<SessionUser> {
  const token = await getSessionToken(loadIdTokenClaims);
  return getCurrentUser(token);
}

export function isUnauthorizedSessionError(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 401;
}
