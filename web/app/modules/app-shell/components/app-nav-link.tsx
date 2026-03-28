import { NavLink } from 'react-router';
import { cn } from '~/lib/utils';
import type { AppNavigationItem } from '../config/app-navigation';

interface AppNavLinkProps {
  item: AppNavigationItem;
  variant: 'bottom' | 'sidebar';
}

export function AppNavLink({ item, variant }: AppNavLinkProps) {
  const Icon = item.icon;

  return (
    <NavLink
      aria-label={item.label}
      className={({ isActive }) =>
        cn(
          variant === 'sidebar'
            ? 'flex items-start gap-3 rounded-2xl px-3 py-3 text-sm transition-colors'
            : 'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs transition-colors',
          isActive
            ? variant === 'sidebar'
              ? 'bg-brand text-brand-foreground shadow-lg shadow-brand/20'
              : 'bg-brand/10 text-brand'
            : variant === 'sidebar'
              ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'text-muted-foreground hover:text-foreground',
        )
      }
      end={item.to === '/app'}
      to={item.to}
    >
      <Icon
        className={cn(
          'shrink-0',
          variant === 'sidebar' ? 'mt-0.5 h-4 w-4' : 'h-4 w-4',
        )}
      />
      {variant === 'sidebar' ? (
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{item.label}</p>
          <p className="text-xs leading-5 opacity-80">{item.description}</p>
        </div>
      ) : (
        <span className="truncate font-medium">{item.shortLabel}</span>
      )}
    </NavLink>
  );
}
