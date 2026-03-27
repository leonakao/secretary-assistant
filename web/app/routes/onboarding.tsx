import type { MetaFunction } from 'react-router';
import { Navigate } from 'react-router';
import { bootstrapAuthSession, isUnauthorizedSessionError } from '~/modules/auth/session';
import { buildUnauthorizedSessionRecoveryPath } from '~/modules/auth/session-recovery';
import { resolveAuthenticatedEntryTarget } from '~/modules/auth/use-cases/resolve-authenticated-entry-target';
import { useAppAuth } from '~/modules/auth/auth-provider';
import { OnboardingPage } from '~/modules/onboarding/pages/onboarding-page';
import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

export const meta: MetaFunction = () => [
  { title: 'Onboarding | Secretary Assistant' },
  {
    name: 'description',
    content: 'Complete your company setup and onboarding chat.',
  },
];

export default function OnboardingRoute() {
  const { getIdTokenClaims, isAuthenticated, isLoading } = useAppAuth();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setRedirectTo('/login?mode=signin&redirectTo=%2Fonboarding');
      setIsChecking(false);
      return;
    }

    let cancelled = false;

    void bootstrapAuthSession(() => getIdTokenClaims()).then(
      (user) => {
        if (cancelled) return;
        const target = resolveAuthenticatedEntryTarget(user);
        if (target === '/dashboard') {
          setRedirectTo('/dashboard');
        } else {
          setIsAllowed(true);
        }
        setIsChecking(false);
      },
      (cause: unknown) => {
        if (cancelled) return;
        if (isUnauthorizedSessionError(cause)) {
          setRedirectTo(buildUnauthorizedSessionRecoveryPath('/onboarding'));
        } else {
          setRedirectTo('/login?mode=signin&redirectTo=%2Fonboarding');
        }
        setIsChecking(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [getIdTokenClaims, isAuthenticated, isLoading]);

  if (isLoading || isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading onboarding route...
      </main>
    );
  }

  if (redirectTo) {
    return <Navigate replace to={redirectTo} />;
  }

  if (!isAllowed) {
    return null;
  }

  return <OnboardingPage />;
}
