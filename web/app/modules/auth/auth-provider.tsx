import {
  Auth0Provider,
  useAuth0,
  type LogoutOptions,
  type RedirectLoginOptions,
  type User,
} from '@auth0/auth0-react';
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  getAuth0ClientId,
  getAuth0Domain,
  getAuth0RedirectUri,
} from '~/lib/runtime-config.client';
import {
  createExistingSigninIdentity,
  createFreshSignupIdentity,
} from './e2e-auth';

interface AppAuthContextValue {
  error?: Error;
  getIdTokenClaims: () => Promise<{ __raw?: string } | undefined>;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithRedirect: (options?: RedirectLoginOptions) => Promise<void>;
  logout: (options?: LogoutOptions) => void;
  user?: User;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

const MOCK_ENABLED_STORAGE_KEY = 'secretary-assistant:e2e-auth-enabled';
const MOCK_STORAGE_KEY = 'secretary-assistant:e2e-auth';

interface MockSession {
  token: string;
  user: User;
}

function isMockAuthEnabled(): boolean {
  if (import.meta.env.VITE_E2E_AUTH_MOCK === 'true') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(MOCK_ENABLED_STORAGE_KEY) === 'true';
}

function readMockSession(): MockSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawSession = window.localStorage.getItem(MOCK_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as MockSession;
  } catch {
    window.localStorage.removeItem(MOCK_STORAGE_KEY);
    return null;
  }
}

function writeMockSession(session: MockSession | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(MOCK_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(session));
}

function createMockSession(screenHint?: string): MockSession {
  const identity =
    screenHint === 'signup'
      ? createFreshSignupIdentity()
      : createExistingSigninIdentity();

  return {
    token: identity.token,
    user: identity.user,
  };
}

function MockAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MockSession | null>(() =>
    readMockSession(),
  );

  const value: AppAuthContextValue = {
    getIdTokenClaims: async () =>
      session
        ? {
            __raw: session.token,
          }
        : undefined,
    isAuthenticated: Boolean(session),
    isLoading: false,
    loginWithRedirect: async (options?: RedirectLoginOptions) => {
      const nextSession = createMockSession(
        options?.authorizationParams?.screen_hint,
      );

      writeMockSession(nextSession);
      setSession(nextSession);

      if (typeof window !== 'undefined') {
        window.location.replace(options?.appState?.returnTo || '/dashboard');
      }
    },
    logout: (options?: LogoutOptions) => {
      writeMockSession(null);
      setSession(null);

      if (typeof window !== 'undefined') {
        window.location.replace(options?.logoutParams?.returnTo || '/');
      }
    },
    user: session?.user,
  };

  return (
    <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
  );
}

function RealAuthProvider({ children }: { children: ReactNode }) {
  return (
    <Auth0Provider
      cacheLocation="localstorage"
      domain={getAuth0Domain()}
      clientId={getAuth0ClientId()}
      authorizationParams={{ redirect_uri: getAuth0RedirectUri() }}
      authorizeTimeoutInSeconds={10}
      httpTimeoutInSeconds={10}
      onRedirectCallback={(appState) => {
        if (typeof window !== 'undefined') {
          window.location.replace(appState?.returnTo || '/dashboard');
        }
      }}
    >
      <Auth0ContextBridge>{children}</Auth0ContextBridge>
    </Auth0Provider>
  );
}

function Auth0ContextBridge({ children }: { children: ReactNode }) {
  const auth0 = useAuth0();

  const value: AppAuthContextValue = {
    error: auth0.error,
    getIdTokenClaims: async () => auth0.getIdTokenClaims(),
    isAuthenticated: auth0.isAuthenticated,
    isLoading: auth0.isLoading,
    loginWithRedirect: auth0.loginWithRedirect,
    logout: auth0.logout,
    user: auth0.user,
  };

  return (
    <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
  );
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  if (isMockAuthEnabled()) {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }

  return <RealAuthProvider>{children}</RealAuthProvider>;
}

export function useAppAuth(): AppAuthContextValue {
  const context = useContext(AppAuthContext);

  if (!context) {
    throw new Error('useAppAuth must be used within AppAuthProvider');
  }

  return context;
}
