export function ContactsPageSkeleton() {
  return (
    <div
      className="space-y-6 pb-8 sm:space-y-8 sm:pb-12"
      data-testid="contacts-page-skeleton"
    >
      <section className="space-y-4 rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="h-10 w-56 rounded-full bg-muted" />
        <div className="h-4 w-full max-w-2xl rounded-full bg-muted" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
        <div className="space-y-3 rounded-[1.75rem] border border-border bg-card/80 p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div className="space-y-2">
              <div className="h-3 w-28 rounded-full bg-muted" />
              <div className="h-3 w-24 rounded-full bg-muted" />
            </div>
            <div className="h-7 w-24 rounded-full bg-muted" />
          </div>
          <div className="rounded-[1.5rem] border border-border/80 bg-background/60">
            <div className="hidden grid-cols-[minmax(0,1.2fr)_150px_120px] gap-4 border-b border-border/80 px-5 py-3 sm:grid">
              <div className="h-3 rounded-full bg-muted" />
              <div className="h-3 rounded-full bg-muted" />
              <div className="h-3 rounded-full bg-muted" />
            </div>
            <div className="space-y-0">
              <div className="border-b border-border/70 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-muted" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-40 rounded-full bg-muted" />
                    <div className="h-3 w-28 rounded-full bg-muted" />
                    <div className="h-3 w-full max-w-sm rounded-full bg-muted" />
                  </div>
                </div>
              </div>
              <div className="border-b border-border/70 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-muted" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-36 rounded-full bg-muted" />
                    <div className="h-3 w-24 rounded-full bg-muted" />
                    <div className="h-3 w-full max-w-xs rounded-full bg-muted" />
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-muted" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-32 rounded-full bg-muted" />
                    <div className="h-3 w-24 rounded-full bg-muted" />
                    <div className="h-3 w-full max-w-sm rounded-full bg-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-[1.75rem] border border-brand/15 bg-card p-5 shadow-lg shadow-brand/5 sm:rounded-[2rem] sm:p-6">
          <div className="space-y-2 border-b border-border/80 pb-4">
            <div className="h-3 w-24 rounded-full bg-muted" />
            <div className="h-7 w-48 rounded-full bg-muted" />
          </div>
          <div className="h-32 rounded-[1.5rem] bg-muted" />
          <div className="h-48 rounded-[1.5rem] bg-muted" />
          <div className="h-36 rounded-[1.5rem] bg-muted" />
        </div>
      </section>
    </div>
  );
}
