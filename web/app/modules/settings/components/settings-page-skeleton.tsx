export function SettingsPageSkeleton() {
  return (
    <div
      className="space-y-6 pb-8 sm:space-y-8 sm:pb-12"
      data-testid="settings-page-skeleton"
    >
      <section className="space-y-4 rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
        <div className="h-3 w-40 rounded-full bg-muted" />
        <div className="h-8 w-56 rounded-2xl bg-muted" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-28 rounded-[1.5rem] bg-muted" />
          <div className="h-28 rounded-[1.5rem] bg-muted" />
        </div>
      </section>
    </div>
  );
}
