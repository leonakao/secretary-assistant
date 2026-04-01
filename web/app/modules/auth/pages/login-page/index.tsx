import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, Bot, LoaderCircle, LogIn, UserRoundPlus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  getAuth0AppOrigin,
  getAuth0RedirectUri,
} from '~/lib/runtime-config.client';
import {
  buildUnauthorizedSessionRecoveryPath,
  isUnauthorizedSessionRecovery,
} from '~/modules/auth/session-recovery';
import { useAppAuth } from '~/modules/auth/auth-provider';
import {
  bootstrapAuthSession,
  isUnauthorizedSessionError,
} from '~/modules/auth/session';
import { resolveAuthenticatedEntryTarget } from '~/modules/auth/use-cases/resolve-authenticated-entry-target';

type AuthMode = 'signin' | 'signup';

function getSafeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith('/')) {
    return '/app';
  }

  return value;
}

function resolvePostLoginNavigationTarget(
  redirectTo: string,
  authenticatedEntryTarget: ReturnType<typeof resolveAuthenticatedEntryTarget>,
): string {
  if (authenticatedEntryTarget === '/onboarding') {
    return '/onboarding';
  }

  return redirectTo.startsWith('/app') ? redirectTo : '/app';
}

function resolveAuthReturnTo(nextMode: AuthMode, redirectTo: string): string {
  if (nextMode === 'signup') {
    return '/onboarding';
  }

  return redirectTo;
}

export function LoginPage() {
  const {
    clearSession,
    error,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    getIdTokenClaims,
  } =
    useAppAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isResolvingSession, setIsResolvingSession] = useState(false);
  const [sessionBootstrapError, setSessionBootstrapError] = useState<string | null>(null);
  const [sessionBootstrapAttempt, setSessionBootstrapAttempt] = useState(0);
  const hasBootstrappedSessionAttemptRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const clearSessionRef = useRef(clearSession);
  const getIdTokenClaimsRef = useRef(getIdTokenClaims);

  const mode: AuthMode =
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'));
  const isUnauthorizedRecovery = isUnauthorizedSessionRecovery(searchParams);

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

  const handleAuth = (nextMode: AuthMode) =>
    loginWithRedirect({
      appState: {
        returnTo: resolveAuthReturnTo(nextMode, redirectTo),
      },
      authorizationParams: {
        redirect_uri: getAuth0RedirectUri(),
        ...(isUnauthorizedRecovery && nextMode === 'signin'
          ? { prompt: 'login' }
          : {}),
        ...(nextMode === 'signup' ? { screen_hint: 'signup' } : {}),
      },
    });

  useEffect(() => {
    if (isLoading || !isAuthenticated || isUnauthorizedRecovery) {
      hasBootstrappedSessionAttemptRef.current = null;
      setSessionBootstrapError(null);
      setIsResolvingSession(false);
      return;
    }

    if (hasBootstrappedSessionAttemptRef.current === sessionBootstrapAttempt) {
      return;
    }

    hasBootstrappedSessionAttemptRef.current = sessionBootstrapAttempt;
    setIsResolvingSession(true);
    setSessionBootstrapError(null);

    void bootstrapAuthSession(() => getIdTokenClaimsRef.current()).then(
      (sessionUser) => {
        if (!isMountedRef.current) {
          return;
        }

        try {
          setIsResolvingSession(false);
          setSessionBootstrapError(null);
          const target = resolvePostLoginNavigationTarget(
            redirectTo,
            resolveAuthenticatedEntryTarget(sessionUser),
          );
          void navigate(target, { replace: true });
        } catch (cause) {
          setIsResolvingSession(false);
          setSessionBootstrapError(
            cause instanceof Error
              ? cause.message
              : 'We could not process your authenticated session.',
          );
        }
      },
      (cause: unknown) => {
        if (!isMountedRef.current) {
          return;
        }

        setIsResolvingSession(false);
        if (isUnauthorizedSessionError(cause)) {
          const recoveryPath = buildUnauthorizedSessionRecoveryPath(redirectTo);
          void clearSessionRef.current().finally(() => {
            window.location.replace(
              new URL(recoveryPath, getAuth0AppOrigin()).toString(),
            );
          });
          return;
        }

        setSessionBootstrapError(
          cause instanceof Error
            ? cause.message
            : 'We could not validate your session. Please try again.',
        );
      },
    );
  }, [
    isAuthenticated,
    isLoading,
    isUnauthorizedRecovery,
    navigate,
    redirectTo,
    sessionBootstrapAttempt,
  ]);

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden bg-background"
      data-testid="login-page"
    >
      {/* Ambient top glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      >
        <div className="h-[320px] w-[700px] rounded-full bg-brand/8 blur-[100px]" />
      </div>

      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
            <Bot className="h-4 w-4 text-brand-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Secretary Assistant
          </span>
        </Link>
        <Link
          to="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to home
        </Link>
      </nav>

      {/* Centered auth card */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-black/5 ring-1 ring-border/50">
            {/* Card top accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />

            <div className="p-8">
              {isLoading || isResolvingSession ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
                    <LoaderCircle className="h-5 w-5 animate-spin text-brand" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isResolvingSession
                      ? 'Resolving your session...'
                      : 'Checking your session...'}
                  </p>
                </div>
              ) : sessionBootstrapError ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      We couldn&apos;t validate your session
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sessionBootstrapError}
                    </p>
                  </div>
                  <Button
                    className="rounded-xl"
                    data-testid="login-session-retry-button"
                    onClick={() => setSessionBootstrapAttempt((current) => current + 1)}
                    size="sm"
                  >
                    Try again
                  </Button>
                </div>
              ) : isAuthenticated && !isUnauthorizedRecovery ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
                    <LoaderCircle className="h-5 w-5 animate-spin text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand">Active session</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Taking you to the right place...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="space-y-1 text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand">
                        <Bot className="h-6 w-6 text-brand-foreground" />
                      </div>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      {isUnauthorizedRecovery
                        ? 'Session rejected'
                        : mode === 'signup'
                          ? 'Create your account'
                          : 'Welcome back'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {isUnauthorizedRecovery
                        ? 'Sign in again to start a fresh session.'
                        : mode === 'signup'
                          ? 'Get your AI secretary up and running.'
                          : 'Sign in to your Secretary Assistant dashboard.'}
                    </p>
                  </div>

                  {/* Warning banner */}
                  {isUnauthorizedRecovery ? (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-amber-700 dark:text-amber-300">
                          The API rejected your session with{' '}
                          <strong>401 Unauthorized</strong>. Sign in again to retry
                          with a fresh token.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Error banner */}
                  {error ? (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                      {error.message}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="grid gap-2.5">
                    <Button
                      className="w-full rounded-xl"
                      data-testid="login-signin-button"
                      onClick={() => handleAuth('signin')}
                      size="lg"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </Button>
                    <Button
                      className="w-full rounded-xl"
                      data-testid="login-signup-button"
                      onClick={() => handleAuth('signup')}
                      size="lg"
                      variant="outline"
                    >
                      <UserRoundPlus className="h-4 w-4" />
                      Create account
                    </Button>
                  </div>

                  {/* Footer hint */}
                  <p className="text-center text-xs leading-5 text-muted-foreground">
                    {isUnauthorizedRecovery
                      ? 'Sign in forces a fresh Auth0 login prompt.'
                      : 'New here? Start with "Create account". Already a member? Sign in to go straight to your dashboard.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Below card link */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <span className="text-foreground underline-offset-4 hover:underline cursor-pointer">
              Terms of Service
            </span>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
