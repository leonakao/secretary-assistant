import { Bot, Clock, MessageSquare, Settings, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'AI-powered responses',
    description:
      'Your agent understands context and replies naturally to customer questions, just like you would.',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp native',
    description:
      'Connects directly to your WhatsApp number via Evolution API. No extra apps for your customers.',
  },
  {
    icon: Clock,
    title: '24/7 availability',
    description:
      'Your secretary never sleeps. Customers get instant answers at any hour, even on weekends.',
  },
  {
    icon: Settings,
    title: 'Easy configuration',
    description:
      'Set your business name, service types, and agent personality from a simple dashboard.',
  },
  {
    icon: Zap,
    title: 'Service request management',
    description:
      'The agent creates and tracks service requests automatically, keeping you and your customers updated.',
  },
  {
    icon: Shield,
    title: 'Owner escalation',
    description:
      "When a situation needs your attention, the agent routes the conversation to you — and only then.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-muted px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything your business needs
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Secretary Assistant handles the full customer support lifecycle on
            WhatsApp, so you can focus on delivering great service.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle">
                <Icon className="h-5 w-5 text-brand" />
              </div>
              <h3 className="mb-2 font-semibold text-card-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
