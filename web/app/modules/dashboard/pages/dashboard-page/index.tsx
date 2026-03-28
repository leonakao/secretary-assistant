import { Activity, Building2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { useAuthenticatedAppShell } from '~/modules/app-shell/use-authenticated-app-shell';

export function DashboardPage() {
  const { sessionUser } = useAuthenticatedAppShell();

  return (
    <div className="space-y-6" data-testid="app-home-page">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
            Workspace overview
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, {sessionUser.name}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            This is now the home of the authenticated workspace. From here you
            can expand your company setup, contacts, and settings without
            rebuilding the shell each time.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-muted p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand/10 p-2 text-brand">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Protected session</p>
                  <p className="text-xs text-muted-foreground">Confirmed via /users/me</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{sessionUser.email}</p>
            </div>
            <div className="rounded-3xl bg-muted p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand/10 p-2 text-brand">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Company status</p>
                  <p className="text-xs text-muted-foreground">Current workspace owner</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {sessionUser.company?.name || 'No company linked yet'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
            Next steps
          </p>
          <div className="mt-6 space-y-4">
            {[
              {
                icon: MessageSquareText,
                title: 'Shape your assistant',
                copy: 'Use the new workspace sections to evolve setup without crowding the dashboard.',
              },
              {
                icon: Activity,
                title: 'Keep the structure growing cleanly',
                copy: 'Each context now has a route and space to grow independently.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl bg-muted p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-brand/10 p-2 text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.copy}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
