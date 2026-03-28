import { useEffect, useState } from 'react';
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

export interface AuthenticatedAppShellOutletContext {
  sessionUser: SessionUser;
}

export function AuthenticatedAppShell() {
  const location = useLocation();
  const { getIdTokenClaims, isAuthenticated, isLoading, logout } = useAppAuth();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecoveringSession, setIsRecoveringSession] = useState(false);
  const [shouldRedirectToOnboarding, setShouldRedirectToOnboarding] =
    useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSessionUser(null);
      setError(null);
      setIsRecoveringSession(false);
      setShouldRedirectToOnboarding(false);
      return;
    }

    let cancelled = false;

    void bootstrapAuthSession(() => getIdTokenClaims()).then(
      (nextUser) => {
        if (cancelled) {
          return;
        }

        const target = resolveAuthenticatedEntryTarget(nextUser);

        if (target === '/onboarding') {
          setShouldRedirectToOnboarding(true);
          setSessionUser(null);
          setError(null);
          setIsRecoveringSession(false);
          return;
        }

        setSessionUser(nextUser);
        setError(null);
        setIsRecoveringSession(false);
        setShouldRedirectToOnboarding(false);
      },
      (cause: unknown) => {
        if (cancelled) {
          return;
        }

        if (isUnauthorizedSessionError(cause)) {
          setSessionUser(null);
          setError(null);
          setIsRecoveringSession(true);
          setShouldRedirectToOnboarding(false);
          logout({
            logoutParams: {
              returnTo: getExpiredSessionReturnTo(location.pathname),
            },
          });
          return;
        }

        setSessionUser(null);
        setError(
          cause instanceof Error
            ? cause.message
            : 'Failed to load the authenticated workspace.',
        );
        setIsRecoveringSession(false);
        setShouldRedirectToOnboarding(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [getIdTokenClaims, isAuthenticated, logout]);

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
    <main className="min-h-screen bg-muted/40 text-foreground">
      <div className="flex min-h-screen">
        <AppSidebar
          onLogout={() =>
            logout({
              logoutParams: { returnTo: getAuth0LogoutReturnTo() },
            })
          }
          sessionUser={sessionUser}
        />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-28 lg:pb-0">
          <AppShellHeader sessionUser={sessionUser} />
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
