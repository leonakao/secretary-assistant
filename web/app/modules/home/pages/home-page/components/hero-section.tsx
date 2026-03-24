import { Bot, MessageCircle } from 'lucide-react';
import { Link } from 'react-router';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-surface-hero via-surface-hero-mid to-surface-hero px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <header className="mb-16 flex items-center justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand">
            <Bot className="h-7 w-7 text-brand-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-surface-hero-foreground">
            Secretary Assistant
          </span>
          <Link
            to="/login?mode=signin"
            className="rounded-full border border-surface-hero-muted/35 px-5 py-2 text-sm font-semibold text-surface-hero-foreground transition-colors hover:border-brand hover:text-brand-hover"
          >
            Login
          </Link>
        </header>

        <div className="text-center">

          <h1 className="text-4xl font-bold tracking-tight text-surface-hero-foreground sm:text-6xl">
            Your AI secretary,
            <br />
            <span className="text-brand-hover">always on WhatsApp</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-surface-hero-muted">
            Let an AI agent handle your WhatsApp customer messages automatically.
            Set it up in minutes, and focus on what matters while your secretary
            takes care of the rest.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#features"
              className="flex items-center gap-2 rounded-xl bg-brand px-8 py-3.5 text-sm font-semibold text-brand-foreground shadow-lg transition-colors hover:bg-brand-hover"
            >
              <MessageCircle className="h-4 w-4" />
              See how it works
            </a>
            <Link
              to="/login?mode=signup"
              className="rounded-xl border border-surface-hero-muted/40 px-8 py-3.5 text-sm font-semibold text-surface-hero-muted transition-colors hover:border-surface-hero-muted hover:text-surface-hero-foreground"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
      </div>
    </section>
  );
}
