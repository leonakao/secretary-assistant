import type { MetaFunction } from 'react-router';
import { AuthenticatedAppShell } from '~/modules/app-shell/layouts/authenticated-app-shell';

export const meta: MetaFunction = () => [
  { title: 'App | Secretary Assistant' },
  {
    name: 'description',
    content: 'Área autenticada para proprietários do Secretary Assistant.',
  },
];

export default function AppRoute() {
  return <AuthenticatedAppShell />;
}
