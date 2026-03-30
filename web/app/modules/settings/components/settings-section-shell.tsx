import type { ReactNode } from 'react';

interface SettingsSectionShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsSectionShell(props: SettingsSectionShellProps) {
  const { eyebrow, title, description, children } = props;

  return (
    <section className="space-y-5 rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          {eyebrow}
        </p>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}
