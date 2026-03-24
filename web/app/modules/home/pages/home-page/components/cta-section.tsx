import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section id="cta" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Ready to automate your support?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Set up your AI secretary in minutes and start answering customer
          messages on WhatsApp automatically.
        </p>
        <div className="mt-8">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/80"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl border-t border-border pt-8">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Secretary Assistant. Built for small
          business owners.
        </p>
      </div>
    </section>
  );
}
