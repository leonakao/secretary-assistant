const SESSION_ERROR_PARAM = 'sessionError';
const UNAUTHORIZED_SESSION_ERROR = 'unauthorized';

export function buildUnauthorizedSessionRecoveryPath(
  redirectTo: string = '/app',
): string {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', 'signin');
  searchParams.set('redirectTo', redirectTo);
  searchParams.set(SESSION_ERROR_PARAM, UNAUTHORIZED_SESSION_ERROR);

  return `/login?${searchParams.toString()}`;
}

export function isUnauthorizedSessionRecovery(
  searchParams: URLSearchParams,
): boolean {
  return (
    searchParams.get(SESSION_ERROR_PARAM) === UNAUTHORIZED_SESSION_ERROR
  );
}
