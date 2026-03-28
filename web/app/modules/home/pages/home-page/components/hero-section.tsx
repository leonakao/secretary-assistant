import { Bot, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

const chatMessages = [
  { from: 'client', text: 'Hi! I need to schedule a repair for my AC unit.', time: '09:41' },
  {
    from: 'agent',
    text: "Hi! I'm the Secretary Assistant for CoolFix Services. I'd be happy to help you schedule a repair. Could you share your address and preferred time?",
    time: '09:41',
  },
  { from: 'client', text: 'Sure! 340 Oak Street, tomorrow afternoon.', time: '09:43' },
  {
    from: 'agent',
    text: 'Perfect — I created a service request for tomorrow at 2pm. You\'ll get a confirmation shortly. Anything else?',
    time: '09:43',
  },
  { from: 'client', text: 'That was fast! Thank you 👍', time: '09:44' },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-surface-hero">
      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand">
            <Bot className="h-4.5 w-4.5 text-brand-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-surface-hero-foreground">
            Secretary Assistant
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login?mode=signin"
            className="text-sm font-medium text-surface-hero-muted transition-colors hover:text-surface-hero-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/login?mode=signup"
            className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-mid"
          >
            Get started
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero body */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1fr_480px] lg:pt-20">
        {/* Left: copy */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            WhatsApp AI agent · live in minutes
          </div>

          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-surface-hero-foreground sm:text-5xl lg:text-6xl">
            Your business,
            <br />
            <span className="text-brand-mid">answered 24/7</span>
            <br />
            on WhatsApp.
          </h1>

          <p className="max-w-lg text-lg leading-7 text-surface-hero-muted">
            Deploy a personal AI secretary that handles your customer
            conversations on WhatsApp — creating service requests, answering
            questions, and escalating only when you need to step in.
          </p>

          <ul className="space-y-2.5 text-sm text-surface-hero-muted">
            {[
              'Set up in under 5 minutes',
              'Service request tracking built in',
              'Escalates to you when it matters',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-brand-mid" />
                {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login?mode=signup"
              className="flex items-center justify-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand-hover hover:shadow-brand/30"
            >
              Start for free
            </Link>
            <a
              href="#features"
              className="flex items-center justify-center gap-2 rounded-xl border border-surface-hero-muted/25 px-7 py-3.5 text-sm font-semibold text-surface-hero-muted transition-colors hover:border-surface-hero-muted/50 hover:text-surface-hero-foreground"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Right: WhatsApp chat mockup */}
        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-surface-hero-card shadow-2xl shadow-black/40">
            {/* WhatsApp-style header */}
            <div className="flex items-center gap-3 border-b border-white/8 bg-surface-hero-mid px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand">
                <Bot className="h-5 w-5 text-brand-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-surface-hero-foreground">
                  CoolFix Services
                </p>
                <p className="text-xs text-brand-mid">AI Secretary · online</p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-1 w-1 rounded-full bg-surface-hero-muted" />
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3 bg-[oklch(0.155_0.014_260)] px-4 py-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.from === 'client' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                      msg.from === 'client'
                        ? 'rounded-tl-sm bg-surface-hero-card text-surface-hero-foreground'
                        : 'rounded-tr-sm bg-brand text-brand-foreground'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        msg.from === 'client'
                          ? 'text-surface-hero-muted'
                          : 'text-brand-foreground/60'
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              <div className="flex justify-end">
                <div className="flex items-center gap-1 rounded-2xl rounded-tr-sm bg-brand/20 px-3.5 py-2.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-brand-mid"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating stat badge */}
          <div className="absolute -bottom-4 -right-4 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-surface-hero-mid px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20">
              <Check className="h-4 w-4 text-brand-mid" />
            </div>
            <div>
              <p className="text-xs font-semibold text-surface-hero-foreground">
                Service request created
              </p>
              <p className="text-[10px] text-surface-hero-muted">
                AC Repair · Tomorrow 2pm
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[600px] w-[600px] rounded-full bg-brand/6 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-brand/4 blur-[100px]" />
      </div>
    </section>
  );
}
