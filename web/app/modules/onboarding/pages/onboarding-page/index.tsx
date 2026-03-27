import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { CompanyBootstrapForm } from './components/company-bootstrap-form';
import { OnboardingChat } from './components/onboarding-chat';
import {
  loadOnboardingPageData,
  type OnboardingPageLoaderData,
} from '../../use-cases/load-onboarding-page-data';
import { resolveOnboardingStep } from '../../use-cases/resolve-onboarding-step';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingPageLoaderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await loadOnboardingPageData();
      setData(nextData);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Failed to load onboarding state.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data) return;

    if (resolveOnboardingStep(data) === 'complete') {
      void navigate('/dashboard', { replace: true });
    }
  }, [data, navigate]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading onboarding...
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

  if (!data) {
    return null;
  }

  const step = resolveOnboardingStep(data);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.10),_transparent_35%),linear-gradient(180deg,_var(--color-background),_var(--color-muted))] px-6 py-10">
      <section className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            Company onboarding
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Set up your AI secretary
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Complete a quick company setup and then continue the guided onboarding
            chat. Your progress is saved automatically.
          </p>
        </header>

        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          {step === 'company-bootstrap' ? (
            <CompanyBootstrapForm onSuccess={() => void loadData()} />
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {data.company?.name ?? 'Your company'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tell the assistant about your business so it can configure your
                  service profile.
                </p>
              </div>
              <div className="h-[32rem]">
                <OnboardingChat
                  conversation={
                    data.conversation ?? { threadId: null, messages: [] }
                  }
                  onComplete={() => {
                    void navigate('/dashboard', { replace: true });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
