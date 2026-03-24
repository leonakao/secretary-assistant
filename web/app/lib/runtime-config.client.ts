export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || '/api';
}

const AUTH0_LOGIN_PATH = '/login';

export function getAuth0Domain(): string {
  return (
    import.meta.env.VITE_AUTH0_DOMAIN ||
    'dev-du3tsou284mgwefg.us.auth0.com'
  );
}

export function getAuth0ClientId(): string {
  return (
    import.meta.env.VITE_AUTH0_CLIENT_ID ||
    'SJtvoRN584unasTOBo2fYogJM8HaWjWU'
  );
}

export function getAuth0AppOrigin(): string {
  return import.meta.env.VITE_AUTH0_APP_ORIGIN || 'http://localhost:5173';
}

export function getAuth0RedirectUri(): string {
  return new URL(AUTH0_LOGIN_PATH, getAuth0AppOrigin()).toString();
}

export function getAuth0LogoutReturnTo(): string {
  return new URL('/', getAuth0AppOrigin()).toString();
}
