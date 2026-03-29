import { getCurrentUser, type SessionUser } from './api/get-current-user';
import { ApiError } from '~/lib/api.client';

interface IdTokenClaims {
  __raw?: string;
}

const SESSION_BOOTSTRAP_TIMEOUT_MS = 15000;

function logSessionDebug(message: string, details?: unknown): void {
  if (details === undefined) {
    console.log(`[auth/session] ${message}`);
    return;
  }

  console.log(`[auth/session] ${message}`, details);
}

export async function getSessionToken(
  loadIdTokenClaims: () => Promise<IdTokenClaims | undefined>,
): Promise<string> {
  logSessionDebug('Loading ID token claims');
  const claims = await loadIdTokenClaims();
  const token = claims?.__raw;

  if (!token) {
    logSessionDebug('ID token missing from claims');
    throw new Error('Missing Auth0 ID token');
  }

  logSessionDebug('Resolved raw ID token', { tokenLength: token.length });
  return token;
}

export async function bootstrapAuthSession(
  loadIdTokenClaims: () => Promise<IdTokenClaims | undefined>,
  timeoutMs: number = SESSION_BOOTSTRAP_TIMEOUT_MS,
): Promise<SessionUser> {
  logSessionDebug('Bootstrapping authenticated session', { timeoutMs });
  const token = await getSessionToken(loadIdTokenClaims);

  return new Promise<SessionUser>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      logSessionDebug('Session bootstrap timed out');
      reject(
        new Error(
          'Session bootstrap timed out while validating the authenticated user.',
        ),
      );
    }, timeoutMs);

    logSessionDebug('Requesting /users/me');
    void getCurrentUser(token).then(
      (user) => {
        clearTimeout(timeoutId);
        logSessionDebug('Resolved /users/me', {
          userId: user.id,
          onboarding: user.onboarding,
          companyId: user.company?.id ?? null,
        });
        resolve(user);
      },
      (cause) => {
        clearTimeout(timeoutId);
        logSessionDebug('Rejected /users/me', cause);
        reject(cause);
      },
    );
  });
}

export function isUnauthorizedSessionError(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 401;
}
