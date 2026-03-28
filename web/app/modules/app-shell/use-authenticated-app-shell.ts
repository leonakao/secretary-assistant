import { useOutletContext } from 'react-router';
import type { AuthenticatedAppShellOutletContext } from './layouts/authenticated-app-shell';

export function useAuthenticatedAppShell() {
  return useOutletContext<AuthenticatedAppShellOutletContext>();
}
