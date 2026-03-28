import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LoaderCircle, Building2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { CompanyBootstrapForm } from './components/company-bootstrap-form';
import { OnboardingChat } from './components/onboarding-chat';
import { loadOnboardingPageData } from '../../use-cases/load-onboarding-page-data';
import { resolveOnboardingStep } from '../../use-cases/resolve-onboarding-step';
import { usePageLoader } from '~/lib/api-client-context';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { data, error, isLoading, reload } = usePageLoader(
    loadOnboardingPageData,
    '/onboarding',
  );

  useEffect(() => {
    reload();
  }, []);

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
  const steps = [
    { id: 'company-bootstrap', label: 'Company setup', icon: Building2 },
    { id: 'assistant-chat', label: 'Configure assistant', icon: MessageSquare },
    { id: 'complete', label: 'Ready to go', icon: CheckCircle2 },
  ] as const;
  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <main className="flex min-h-screen bg-background" data-testid="onboarding-page">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col justify-between border-r border-border bg-[var(--color-surface-hero)] px-8 py-10 lg:flex">
        <div className="space-y-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
              Secretary Assistant
            </p>
            <h1 className="mt-3 text-xl font-semibold leading-snug text-white">
              Set up your AI secretary
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/50">
              A few steps to get your WhatsApp assistant live.
            </p>
          </div>

          <nav className="space-y-2">
            {steps.slice(0, 2).map((s, i) => {
              const Icon = s.icon;
              const isDone = i < currentStepIndex;
              const isActive = i === currentStepIndex;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : isDone
                        ? 'text-white/40'
                        : 'text-white/25'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={isDone ? 'line-through' : ''}>{s.label}</span>
                  {isDone && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-brand" />}
                </div>
              );
            })}
          </nav>

          {data.company && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-white/40">Company</p>
              <p className="mt-0.5 text-sm font-medium text-white">{data.company.name}</p>
            </div>
          )}
        </div>

        <p className="text-xs text-white/25">
          Your progress is saved automatically.
        </p>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {step === 'company-bootstrap' ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <div
              className="w-full max-w-md space-y-6"
              data-testid="onboarding-step-company-bootstrap"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                  Step 1 of 2
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Tell us about your company
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  This helps the assistant introduce itself correctly to your customers.
                </p>
              </div>
              <CompanyBootstrapForm onSuccess={reload} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div
              className="border-b border-border px-6 py-4"
              data-testid="onboarding-step-assistant-chat"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Step 2 of 2
              </p>
              <h2 className="mt-0.5 text-base font-semibold text-foreground">
                Configure your assistant
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <OnboardingChat
                conversation={
                  data.conversation ?? {
                    threadId: null,
                    isInitialized: false,
                    messages: [],
                  }
                }
                onComplete={() => {
                  void navigate('/dashboard', { replace: true });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
