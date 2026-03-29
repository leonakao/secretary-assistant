import { getCurrentUser, type SessionUser } from './api/get-current-user';
import { ApiError } from '~/lib/api.client';

interface IdTokenClaims {
  __raw?: string;
}

const SESSION_BOOTSTRAP_TIMEOUT_MS = 15000;

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
  timeoutMs: number = SESSION_BOOTSTRAP_TIMEOUT_MS,
): Promise<SessionUser> {
  const token = await getSessionToken(loadIdTokenClaims);

  return new Promise<SessionUser>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          'Session bootstrap timed out while validating the authenticated user.',
        ),
      );
    }, timeoutMs);

    void getCurrentUser(token).then(
      (user) => {
        clearTimeout(timeoutId);
        resolve(user);
      },
      (cause) => {
        clearTimeout(timeoutId);
        reject(cause);
      },
    );
  });
}

export function isUnauthorizedSessionError(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 401;
}
