import { Bot, Clock, MessageSquare, Settings, Shield, Zap } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="features" className="bg-background px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything your business
            <br />
            needs to scale support.
          </h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            From the first customer message to a confirmed service appointment —
            your AI secretary handles it without you lifting a finger.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Large featured card — spans 2 cols */}
          <div className="group relative overflow-hidden rounded-3xl bg-foreground p-8 text-background sm:col-span-2">
            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand">
                <Bot className="h-6 w-6 text-brand-foreground" />
              </div>
              <div>
                <h3 className="mb-3 text-xl font-bold text-background">
                  AI-powered conversations
                </h3>
                <p className="max-w-md text-sm leading-6 text-background/60">
                  Your agent understands context, tone, and intent. It replies
                  naturally to customer questions — and knows when to create a
                  service request, when to ask for more info, and when to hand
                  off to you.
                </p>
              </div>
              {/* Inline stat row */}
              <div className="flex flex-wrap gap-6">
                {[
                  { label: 'Avg. response time', value: '< 2s' },
                  { label: 'Languages supported', value: 'Any' },
                  { label: 'Human handoff', value: 'Instant' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-2xl font-bold text-brand">{value}</p>
                    <p className="text-xs text-background/50">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Background glow */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/12 blur-3xl" />
          </div>

          {/* WhatsApp native */}
          <div className="rounded-3xl border border-border bg-card p-7">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle">
              <MessageSquare className="h-5 w-5 text-brand" />
            </div>
            <h3 className="mb-2 font-semibold text-card-foreground">
              WhatsApp native
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Connects directly to your number via Evolution API. No new apps
              for your customers — they message you like always.
            </p>
          </div>

          {/* 24/7 availability */}
          <div className="rounded-3xl border border-border bg-canvas p-7">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle">
              <Clock className="h-5 w-5 text-brand" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">
              24/7 availability
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Your secretary never sleeps. Customers get instant answers at
              any hour, even on weekends and holidays.
            </p>
          </div>

          {/* Service requests — accent card */}
          <div className="rounded-3xl bg-brand p-7">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-foreground/15">
              <Zap className="h-5 w-5 text-brand-foreground" />
            </div>
            <h3 className="mb-2 font-semibold text-brand-foreground">
              Service request tracking
            </h3>
            <p className="text-sm leading-6 text-brand-foreground/70">
              The agent creates and tracks requests automatically — keeping
              you and your customers informed at every step.
            </p>
          </div>

          {/* Easy configuration */}
          <div className="rounded-3xl border border-border bg-card p-7">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle">
              <Settings className="h-5 w-5 text-brand" />
            </div>
            <h3 className="mb-2 font-semibold text-card-foreground">
              Simple setup
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Set your business name, services, and agent personality from a
              clean dashboard. Live in minutes.
            </p>
          </div>

          {/* Owner escalation — wide card */}
          <div className="rounded-3xl border border-border bg-card p-7 sm:col-span-2 lg:col-span-1">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle">
              <Shield className="h-5 w-5 text-brand" />
            </div>
            <h3 className="mb-2 font-semibold text-card-foreground">
              Smart escalation
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              When a situation genuinely needs your attention, the agent
              routes the conversation to you — and only then.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
