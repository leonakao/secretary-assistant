import { APP_NAVIGATION } from '../config/app-navigation';
import { AppNavLink } from './app-nav-link';

export function AppBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2 rounded-[1.75rem] border border-border bg-card/95 p-2 shadow-lg shadow-black/5">
        {APP_NAVIGATION.map((item) => (
          <AppNavLink key={item.to} item={item} variant="bottom" />
        ))}
      </div>
    </nav>
  );
}
