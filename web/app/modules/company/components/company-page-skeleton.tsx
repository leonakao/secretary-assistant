export function CompanyPageSkeleton() {
  return (
    <div
      className="animate-pulse space-y-6 pb-8 sm:space-y-8 sm:pb-12"
      data-testid="company-page-skeleton"
    >
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="mt-4 h-10 w-72 rounded-full bg-muted" />
        <div className="mt-4 h-8 w-40 rounded-full bg-muted" />
        <div className="mt-5 space-y-3">
          <div className="h-4 w-full rounded-full bg-muted" />
          <div className="h-4 w-4/5 rounded-full bg-muted" />
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="h-3 w-20 rounded-full bg-muted" />
          <div className="mt-4 h-8 w-44 rounded-full bg-muted" />
          <div className="mt-6 space-y-4">
            <div className="h-20 rounded-[1.5rem] bg-muted" />
            <div className="h-20 rounded-[1.5rem] bg-muted" />
            <div className="h-10 w-28 rounded-xl bg-muted" />
          </div>
        </div>
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="h-3 w-32 rounded-full bg-muted" />
          <div className="mt-4 h-8 w-60 rounded-full bg-muted" />
          <div className="mt-6 rounded-[1.75rem] border border-border/60 p-6">
            <div className="space-y-4">
              <div className="h-4 w-28 rounded-full bg-muted" />
              <div className="h-8 w-2/5 rounded-full bg-muted" />
              <div className="h-4 w-full rounded-full bg-muted" />
              <div className="h-4 w-5/6 rounded-full bg-muted" />
              <div className="h-4 w-3/4 rounded-full bg-muted" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
