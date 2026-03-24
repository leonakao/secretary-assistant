import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { LoaderCircle, LogOut } from 'lucide-react';
import { Button, buttonVariants } from '~/components/ui/base/button';
import { bootstrapAuthSession } from '~/modules/auth/session';
import type { SessionUser } from '~/modules/auth/api/get-current-user';
import { getAuth0LogoutReturnTo } from '~/lib/runtime-config.client';
import { useAppAuth } from '~/modules/auth/auth-provider';

export function DashboardPage() {
  const { getIdTokenClaims, isAuthenticated, isLoading, logout, user } =
    useAppAuth();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setSessionUser(null);
      return;
    }

    let cancelled = false;

    void bootstrapAuthSession(() => getIdTokenClaims()).then(
      (nextUser) => {
        if (!cancelled) {
          setSessionUser(nextUser);
          setError(null);
        }
      },
      (cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Failed to load the protected session.',
          );
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [getIdTokenClaims, isAuthenticated]);

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
        to="/login?mode=signin&redirectTo=%2Fdashboard"
      />
    );
  }

  return (
    <main className="min-h-screen bg-muted/50 px-6 py-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            Protected dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, {sessionUser?.name || user?.name || 'owner'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className={buttonVariants({
              size: 'sm',
              variant: 'outline',
            })}
            to="/"
          >
            Home
          </Link>
          <Button
            onClick={() =>
              logout({
                logoutParams: { returnTo: getAuth0LogoutReturnTo() },
              })
            }
            size="sm"
            variant="outline"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>

      <section className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold text-brand">Session status</p>
          {error ? (
            <p className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : sessionUser ? (
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Name
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground">
                  {sessionUser.name}
                </dd>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground">
                  {sessionUser.email}
                </dd>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Phone
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground">
                  {sessionUser.phone || 'Not provided yet'}
                </dd>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  User ID
                </dt>
                <dd className="mt-2 break-all text-sm font-medium text-foreground">
                  {sessionUser.id}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Validating your protected API session...
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold text-brand">Next step</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Dashboard shell is protected
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            This page is now the authenticated entry point after sign in or sign
            up. It also confirms the backend session by calling the guarded{' '}
            <strong>/users/me</strong> endpoint.
          </p>
        </div>
      </section>
    </main>
  );
}
