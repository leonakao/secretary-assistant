import { cn } from '~/lib/utils';

interface ContactStatusBadgeProps {
  isIgnored: boolean;
}

export function ContactStatusBadge({
  isIgnored,
}: ContactStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        isIgnored
          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      )}
    >
      {isIgnored ? 'Pausado' : 'Respondendo'}
    </span>
  );
}
