import { useLocation } from 'react-router';
import type { SessionUser } from '~/modules/auth/api/get-current-user';
import { APP_NAVIGATION } from '../config/app-navigation';

export function AppShellHeader({ sessionUser }: { sessionUser: SessionUser }) {
  const location = useLocation();
  const currentItem =
    APP_NAVIGATION.find((item) =>
      item.to === '/app'
        ? location.pathname === '/app'
        : location.pathname.startsWith(item.to),
    ) ?? APP_NAVIGATION[0];

  return (
    <header className="border-b border-border bg-background/80 px-6 py-5 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
            {currentItem.label}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {currentItem.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {currentItem.description}
          </p>
        </div>
        <div className="hidden rounded-2xl border border-border bg-card px-4 py-3 text-right sm:block">
          <p className="text-sm font-medium text-foreground">{sessionUser.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sessionUser.company?.name || 'No company linked yet'}
          </p>
        </div>
      </div>
    </header>
  );
}
