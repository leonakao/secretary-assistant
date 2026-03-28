import { Bell, Settings, Shield, SlidersHorizontal } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-6" data-testid="settings-page">
      <section className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand/10 p-3 text-brand">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
              Configurações
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Settings placeholder
            </h2>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground">
          This area is reserved for account preferences, assistant setup, and
          future workspace controls. It is intentionally distinct from company
          data and contacts so each domain can grow independently.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: SlidersHorizontal,
            title: 'Preferences',
            copy: 'General product and workspace defaults.',
          },
          {
            icon: Bell,
            title: 'Notifications',
            copy: 'Alerts, follow-up rules, and operational reminders.',
          },
          {
            icon: Shield,
            title: 'Security',
            copy: 'Session, access, and account-level protection controls.',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-[2rem] border border-border bg-card p-6 shadow-sm"
            >
              <Icon className="h-5 w-5 text-brand" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.copy}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
