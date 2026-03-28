import { Building2, Sparkles, Store } from 'lucide-react';
import { useAuthenticatedAppShell } from '~/modules/app-shell/use-authenticated-app-shell';

export function CompanyPage() {
  const { sessionUser } = useAuthenticatedAppShell();

  return (
    <div className="space-y-6" data-testid="company-page">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand/10 p-3 text-brand">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                Minha empresa
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                Company profile placeholder
              </h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            This area will become the home of your business identity, assistant
            context, and operational setup. For now, it proves the authenticated
            shell can host a dedicated company module cleanly.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
            Current linked company
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-muted p-5">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-brand" />
                <p className="text-sm font-medium text-foreground">
                  {sessionUser.company?.name || 'No company linked yet'}
                </p>
              </div>
            </div>
            <div className="rounded-3xl bg-muted p-5">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-brand" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Future sections here can hold business profile, support tone,
                  service details, and assistant behavior inputs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
