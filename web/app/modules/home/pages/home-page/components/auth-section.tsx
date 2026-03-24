import { useAuth0 } from '@auth0/auth0-react';
import {
  ArrowRight,
  LoaderCircle,
  LogIn,
  LogOut,
  UserRoundPlus,
} from 'lucide-react';
import { Button } from '~/components/ui/base/button';
import {
  getAuth0AppOrigin,
  getAuth0RedirectUri,
} from '~/lib/runtime-config.client';

export function AuthSection() {
  const {
    error,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();

  const handleSignup = () =>
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: getAuth0RedirectUri(),
        screen_hint: 'signup',
      },
    });

  const handleLogout = () =>
    logout({ logoutParams: { returnTo: getAuth0RedirectUri() } });

  return (
    <section id="cta" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Connect your dashboard to Auth0
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            This app is configured for Auth0 on <strong>{getAuth0RedirectUri()}</strong>
            .
            Use the actions below to sign up, log in, and verify the SDK is working.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-background/80 p-6">
          <div className="mb-6 rounded-xl bg-muted p-4 text-left text-xs leading-6 text-muted-foreground">
            <p>
              <strong>Auth0 debug</strong>
            </p>
            <p>`isLoading`: {String(isLoading)}</p>
            <p>`isAuthenticated`: {String(isAuthenticated)}</p>
            <p>`error`: {error?.message || 'none'}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Checking your Auth0 session...
            </div>
          ) : isAuthenticated ? (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Logged in as
                </p>
                <p className="text-xl font-semibold text-foreground">
                  {user?.email || user?.name || 'Authenticated user'}
                </p>
              </div>

              <div className="rounded-2xl bg-muted p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  User Profile
                </h3>
                <pre className="overflow-x-auto text-left text-xs leading-6 text-muted-foreground">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>

              <div className="flex justify-center">
                <Button onClick={handleLogout} size="lg" variant="outline">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {error ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Error: {error.message}
                </p>
              ) : null}

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button onClick={handleSignup} size="lg">
                  <UserRoundPlus className="h-4 w-4" />
                  Signup
                </Button>
                <Button
                  onClick={() =>
                    loginWithRedirect({
                      authorizationParams: {
                        redirect_uri: getAuth0RedirectUri(),
                      },
                    })
                  }
                  size="lg"
                  variant="outline"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                After login, Auth0 will redirect back to{' '}
                <strong>{getAuth0RedirectUri()}</strong>. The allowed web origin is{' '}
                <strong>{getAuth0AppOrigin()}</strong>.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <a
            href="#features"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Review app features
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl border-t border-border pt-8">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Secretary Assistant. Built for small
          business owners.
        </p>
      </div>
    </section>
  );
}
