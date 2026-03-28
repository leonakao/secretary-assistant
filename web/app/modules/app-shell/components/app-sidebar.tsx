import { Bot, LogOut } from 'lucide-react';
import { Button } from '~/components/ui/button';
import type { SessionUser } from '~/modules/auth/api/get-current-user';
import { APP_NAVIGATION } from '../config/app-navigation';
import { AppNavLink } from './app-nav-link';

interface AppSidebarProps {
  onLogout: () => void;
  sessionUser: SessionUser;
}

export function AppSidebar({ onLogout, sessionUser }: AppSidebarProps) {
  return (
    <aside className="hidden w-80 shrink-0 border-r border-border bg-[var(--color-surface-hero)] px-8 py-8 text-white lg:flex lg:flex-col">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand">
            <Bot className="h-5 w-5 text-brand-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Secretary Assistant
            </p>
            <p className="text-xs text-white/50">Authenticated workspace</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-white/40">
            Minha empresa
          </p>
          <p className="mt-2 text-lg font-semibold">{sessionUser.company?.name || 'Setup pending'}</p>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Use the navigation to expand your assistant workspace without losing
            the shared logged-in context.
          </p>
        </div>

        <nav className="space-y-2">
          {APP_NAVIGATION.map((item) => (
            <AppNavLink key={item.to} item={item} variant="sidebar" />
          ))}
        </nav>
      </div>

      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-sm font-medium">{sessionUser.name}</p>
          <p className="mt-1 text-xs text-white/50">{sessionUser.email}</p>
        </div>
        <Button
          className="w-full justify-center rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
          onClick={onLogout}
          variant="outline"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
