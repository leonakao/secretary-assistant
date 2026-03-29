import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { buildUnauthorizedSessionRecoveryPath } from '~/modules/auth/session-recovery';
import { useAppAuth } from '~/modules/auth/auth-provider';
import {
  bootstrapAuthSession,
  isUnauthorizedSessionError,
} from '~/modules/auth/session';
import type { SessionUser } from '~/modules/auth/api/get-current-user';
import { resolveAuthenticatedEntryTarget } from '~/modules/auth/use-cases/resolve-authenticated-entry-target';
import {
  getAuth0AppOrigin,
  getAuth0LogoutReturnTo,
} from '~/lib/runtime-config.client';
import { AppBottomNav } from '../components/app-bottom-nav';
import { AppShellHeader } from '../components/app-shell-header';
import { AppSidebar } from '../components/app-sidebar';

function getExpiredSessionReturnTo(pathname: string): string {
  return new URL(
    buildUnauthorizedSessionRecoveryPath(pathname),
    getAuth0AppOrigin(),
  ).toString();
}

function logAppShellDebug(message: string, details?: unknown): void {
  if (details === undefined) {
    console.log(`[auth/app-shell] ${message}`);
    return;
  }

  console.log(`[auth/app-shell] ${message}`, details);
}

let appShellInstanceSequence = 0;

export interface AuthenticatedAppShellOutletContext {
  sessionUser: SessionUser;
}

export function AuthenticatedAppShell() {
  const location = useLocation();
  const { getIdTokenClaims, isAuthenticated, isLoading, logout } = useAppAuth();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecoveringSession, setIsRecoveringSession] = useState(false);
  const [recoveryRedirectTo, setRecoveryRedirectTo] = useState<string | null>(
    null,
  );
  const [shouldRedirectToOnboarding, setShouldRedirectToOnboarding] =
    useState(false);
  const isBootstrappingSessionRef = useRef(false);
  const isMountedRef = useRef(true);
  const getIdTokenClaimsRef = useRef(getIdTokenClaims);
  const logoutRef = useRef(logout);
  const instanceIdRef = useRef(++appShellInstanceSequence);

  useEffect(() => {
    getIdTokenClaimsRef.current = getIdTokenClaims;
    logoutRef.current = logout;
  }, [getIdTokenClaims, logout]);

  useEffect(() => {
    isMountedRef.current = true;
    logAppShellDebug('Mounted app shell instance', {
      instanceId: instanceIdRef.current,
    });

    return () => {
      logAppShellDebug('Unmounted app shell instance', {
        instanceId: instanceIdRef.current,
      });
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    logAppShellDebug('Rendered with shell state', {
      instanceId: instanceIdRef.current,
      pathname: location.pathname,
      isAuthenticated,
      isLoading,
      hasSessionUser: Boolean(sessionUser),
      error,
      isRecoveringSession,
      recoveryRedirectTo,
      shouldRedirectToOnboarding,
      isBootstrappingSession: isBootstrappingSessionRef.current,
    });
  }, [
    error,
    isAuthenticated,
    isLoading,
    isRecoveringSession,
    location.pathname,
    recoveryRedirectTo,
    sessionUser,
    shouldRedirectToOnboarding,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      logAppShellDebug('Resetting shell state because auth is unavailable', {
        instanceId: instanceIdRef.current,
      });
      isBootstrappingSessionRef.current = false;
      setSessionUser(null);
      setError(null);
      setIsRecoveringSession(false);
      setRecoveryRedirectTo(null);
      setShouldRedirectToOnboarding(false);
      return;
    }

    if (
      sessionUser ||
      error ||
      isRecoveringSession ||
      recoveryRedirectTo ||
      shouldRedirectToOnboarding ||
      isBootstrappingSessionRef.current
    ) {
      logAppShellDebug('Skipping shell bootstrap effect', {
        instanceId: instanceIdRef.current,
        hasSessionUser: Boolean(sessionUser),
        error,
        isRecoveringSession,
        recoveryRedirectTo,
        shouldRedirectToOnboarding,
        isBootstrappingSession: isBootstrappingSessionRef.current,
      });
      return;
    }

    isBootstrappingSessionRef.current = true;
    logAppShellDebug('Starting protected session bootstrap', {
      instanceId: instanceIdRef.current,
      pathname: location.pathname,
    });

    void bootstrapAuthSession(() => getIdTokenClaimsRef.current()).then(
      (nextUser) => {
        if (!isMountedRef.current) {
          logAppShellDebug('Protected bootstrap resolved after unmount', {
            instanceId: instanceIdRef.current,
          });
          return;
        }

        try {
          isBootstrappingSessionRef.current = false;
          logAppShellDebug('Protected bootstrap resolved successfully', {
            instanceId: instanceIdRef.current,
            nextUser,
          });

          const target = resolveAuthenticatedEntryTarget(nextUser);

          if (target === '/onboarding') {
            logAppShellDebug('Protected bootstrap resolved to onboarding redirect', {
              instanceId: instanceIdRef.current,
            });
            setShouldRedirectToOnboarding(true);
            setSessionUser(null);
            setError(null);
            setIsRecoveringSession(false);
            setRecoveryRedirectTo(null);
            return;
          }

          logAppShellDebug('Protected bootstrap resolved to workspace', {
            instanceId: instanceIdRef.current,
          });
          setSessionUser(nextUser);
          setError(null);
          setIsRecoveringSession(false);
          setRecoveryRedirectTo(null);
          setShouldRedirectToOnboarding(false);
        } catch (cause) {
          isBootstrappingSessionRef.current = false;
          logAppShellDebug('Protected bootstrap success handler failed', {
            instanceId: instanceIdRef.current,
            cause,
          });
          setSessionUser(null);
          setIsRecoveringSession(false);
          setRecoveryRedirectTo(null);
          setShouldRedirectToOnboarding(false);
          setError(
            cause instanceof Error
              ? cause.message
              : 'Failed to process the authenticated workspace session.',
          );
        }
      },
      (cause: unknown) => {
        if (!isMountedRef.current) {
          logAppShellDebug('Protected bootstrap rejected after unmount', {
            instanceId: instanceIdRef.current,
            cause,
          });
          return;
        }

        isBootstrappingSessionRef.current = false;

        if (isUnauthorizedSessionError(cause)) {
          const recoveryPath = buildUnauthorizedSessionRecoveryPath(
            location.pathname,
          );
          logAppShellDebug('Protected bootstrap rejected with unauthorized error', {
            instanceId: instanceIdRef.current,
            pathname: location.pathname,
            recoveryPath,
            cause,
          });
          setSessionUser(null);
          setError(null);
          setIsRecoveringSession(true);
          setRecoveryRedirectTo(recoveryPath);
          setShouldRedirectToOnboarding(false);
          logoutRef.current({
            logoutParams: {
              returnTo: getExpiredSessionReturnTo(location.pathname),
            },
          });
          return;
        }

        logAppShellDebug('Protected bootstrap rejected with non-401 error', {
          instanceId: instanceIdRef.current,
          cause,
        });
        setSessionUser(null);
        setError(
          cause instanceof Error
            ? cause.message
            : 'Failed to load the authenticated workspace.',
        );
        setIsRecoveringSession(false);
        setRecoveryRedirectTo(null);
        setShouldRedirectToOnboarding(false);
      },
    );
  }, [
    error,
    isAuthenticated,
    isRecoveringSession,
    location.pathname,
    recoveryRedirectTo,
    sessionUser,
    shouldRedirectToOnboarding,
  ]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading authentication state...
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        to={`/login?mode=signin&redirectTo=${encodeURIComponent(location.pathname)}`}
      />
    );
  }

  if (shouldRedirectToOnboarding) {
    return <Navigate replace to="/onboarding" />;
  }

  if (recoveryRedirectTo) {
    return <Navigate replace to={recoveryRedirectTo} />;
  }

  if (isRecoveringSession) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Your session expired. Redirecting to sign in...
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-xl rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      </main>
    );
  }

  if (!sessionUser) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Preparing your workspace...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/40 text-foreground lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen lg:h-screen">
        <AppSidebar
          onLogout={() =>
            logout({
              logoutParams: { returnTo: getAuth0LogoutReturnTo() },
            })
          }
          sessionUser={sessionUser}
        />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-28 lg:h-screen lg:min-h-0 lg:overflow-y-auto lg:pb-0">
          <AppShellHeader />
          <div className="flex-1 px-6 py-6">
            <div className="mx-auto max-w-6xl">
              <Outlet context={{ sessionUser }} />
            </div>
          </div>
        </div>
      </div>
      <AppBottomNav />
    </main>
  );
}
