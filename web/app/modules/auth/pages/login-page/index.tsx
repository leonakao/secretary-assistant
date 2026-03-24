import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, LoaderCircle, LogIn, UserRoundPlus } from 'lucide-react';
import { Button, buttonVariants } from '~/components/ui/base/button';
import { getAuth0RedirectUri } from '~/lib/runtime-config.client';
import { isUnauthorizedSessionRecovery } from '~/modules/auth/session-recovery';
import { useAppAuth } from '~/modules/auth/auth-provider';

type AuthMode = 'signin' | 'signup';

function getSafeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith('/')) {
    return '/dashboard';
  }

  return value;
}

export function LoginPage() {
  const { error, isAuthenticated, isLoading, loginWithRedirect } =
    useAppAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode: AuthMode =
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const redirectTo = getSafeRedirectTarget(searchParams.get('redirectTo'));
  const isUnauthorizedRecovery = isUnauthorizedSessionRecovery(searchParams);

  const headline =
    mode === 'signup' ? 'Create your owner account' : 'Sign in to your dashboard';
  const description =
    mode === 'signup'
      ? 'Create your Secretary Assistant account and land directly in the protected dashboard.'
      : 'Use the dedicated sign-in page to access the protected dashboard.';

  const handleAuth = (nextMode: AuthMode) =>
    loginWithRedirect({
      appState: {
        returnTo: redirectTo,
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
    if (!isLoading && isAuthenticated && !isUnauthorizedRecovery) {
      void navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, isUnauthorizedRecovery, navigate, redirectTo]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_35%),linear-gradient(180deg,_var(--color-background),_var(--color-muted))] px-6 py-10">
      <div className="mx-auto flex max-w-5xl justify-between gap-4">
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-brand"
        >
          Secretary Assistant
        </Link>
        <Link
          to="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to home
        </Link>
      </div>

      <section className="mx-auto mt-16 grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
            Owner access
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {headline}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            {description}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">
                Protected routing
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Successful sign in lands on <strong>/dashboard</strong> instead
                of returning to the marketing page.
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">
                API session check
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The dashboard validates the backend session through the protected{' '}
                <strong>/users/me</strong> endpoint.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card/95 p-8 shadow-xl shadow-brand/5">
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Checking your session...
            </div>
          ) : isAuthenticated && !isUnauthorizedRecovery ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-brand">
                Active session detected
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Redirecting to your dashboard
              </h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Taking you to the protected area now.
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                If the redirect does not happen automatically, you can continue
                manually below.
              </p>
              <Link
                className={buttonVariants({
                  className: 'w-full',
                  size: 'lg',
                })}
                to={redirectTo}
              >
                Open dashboard now
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand">
                  Dedicated auth page
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  {isUnauthorizedRecovery
                    ? 'Your dashboard session was rejected'
                    : 'Choose how you want to enter'}
                </h2>
              </div>

              {isUnauthorizedRecovery ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Auth0 still recognizes your browser session, but the API rejected
                      it with <strong>401 Unauthorized</strong>. Automatic redirect is
                      paused here to avoid a login loop. Sign in again to retry with a
                      fresh session.
                    </p>
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error.message}
                </p>
              ) : null}

              <div className="grid gap-3">
                <Button
                  className="w-full"
                  onClick={() => handleAuth('signin')}
                  size="lg"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Button>
                <Button
                  className="w-full"
                  onClick={() => handleAuth('signup')}
                  size="lg"
                  variant="outline"
                >
                  <UserRoundPlus className="h-4 w-4" />
                  Sign up
                </Button>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                {isUnauthorizedRecovery
                  ? 'Use sign in to force a fresh Auth0 login before trying the dashboard again.'
                  : 'New users can start with sign up. Existing owners can sign in and continue straight to the dashboard.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
