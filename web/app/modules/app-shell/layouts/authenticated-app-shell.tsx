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
  getAuth0LogoutReturnTo,
} from '~/lib/runtime-config.client';
import { AppBottomNav } from '../components/app-bottom-nav';
import { AppShellHeader } from '../components/app-shell-header';
import { AppSidebar } from '../components/app-sidebar';

export interface AuthenticatedAppShellOutletContext {
  sessionUser: SessionUser;
}

export function AuthenticatedAppShell() {
  const location = useLocation();
  const { clearSession, getIdTokenClaims, isAuthenticated, isLoading, logout } =
    useAppAuth();
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
  const clearSessionRef = useRef(clearSession);
  const getIdTokenClaimsRef = useRef(getIdTokenClaims);

  useEffect(() => {
    clearSessionRef.current = clearSession;
    getIdTokenClaimsRef.current = getIdTokenClaims;
  }, [clearSession, getIdTokenClaims]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
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
      return;
    }

    isBootstrappingSessionRef.current = true;

    void bootstrapAuthSession(() => getIdTokenClaimsRef.current()).then(
      (nextUser) => {
        if (!isMountedRef.current) {
          return;
        }

        try {
          isBootstrappingSessionRef.current = false;

          const target = resolveAuthenticatedEntryTarget(nextUser);

          if (target === '/onboarding') {
            setShouldRedirectToOnboarding(true);
            setSessionUser(null);
            setError(null);
            setIsRecoveringSession(false);
            setRecoveryRedirectTo(null);
            return;
          }

          setSessionUser(nextUser);
          setError(null);
          setIsRecoveringSession(false);
          setRecoveryRedirectTo(null);
          setShouldRedirectToOnboarding(false);
        } catch (cause) {
          isBootstrappingSessionRef.current = false;
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
          return;
        }

        isBootstrappingSessionRef.current = false;

        if (isUnauthorizedSessionError(cause)) {
          const recoveryPath = buildUnauthorizedSessionRecoveryPath(
            location.pathname,
          );
          setSessionUser(null);
          setError(null);
          setIsRecoveringSession(true);
          setRecoveryRedirectTo(recoveryPath);
          setShouldRedirectToOnboarding(false);
          void clearSessionRef.current();
          return;
        }

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
