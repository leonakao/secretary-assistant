import { Bot, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

export function CtaSection() {
  return (
    <>
      {/* CTA section */}
      <section id="cta" className="bg-surface-hero px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Free to get started
          </div>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-surface-hero-foreground sm:text-5xl">
            Ready to stop answering
            <br />
            the same messages?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-7 text-surface-hero-muted">
            Set up your AI secretary in minutes. Connect your WhatsApp, describe
            your business, and let the agent handle the rest — 24 hours a day.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login?mode=signup"
              className="flex items-center gap-2 rounded-xl bg-brand px-8 py-3.5 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand-hover"
            >
              Start for free
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login?mode=signin"
              className="rounded-xl border border-surface-hero-muted/25 px-8 py-3.5 text-sm font-semibold text-surface-hero-muted transition-colors hover:border-surface-hero-muted/50 hover:text-surface-hero-foreground"
            >
              Sign in to dashboard
            </Link>
          </div>
        </div>

        {/* Ambient glow */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 flex justify-center overflow-hidden">
          <div className="h-[300px] w-[800px] rounded-full bg-brand/5 blur-[100px]" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand">
              <Bot className="h-3.5 w-3.5 text-brand-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Secretary Assistant
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Secretary Assistant. Built for small business owners.
          </p>
        </div>
      </footer>
    </>
  );
}
