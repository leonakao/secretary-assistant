import type { MetaFunction } from 'react-router';
import { AuthenticatedAppShell } from '~/modules/app-shell/layouts/authenticated-app-shell';

export const meta: MetaFunction = () => [
  { title: 'App | Secretary Assistant' },
  {
    name: 'description',
    content: 'Authenticated workspace for Secretary Assistant owners.',
  },
];

export default function AppRoute() {
  return <AuthenticatedAppShell />;
}
