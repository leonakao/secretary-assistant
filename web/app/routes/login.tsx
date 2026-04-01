import type { MetaFunction } from 'react-router';
import { LoginPage } from '~/modules/auth/pages/login-page';

export const meta: MetaFunction = () => [
  { title: 'Entrar | Secretary Assistant' },
  {
    name: 'description',
    content:
      'Entre ou crie sua conta para acessar a área protegida do Secretary Assistant.',
  },
];

export default function LoginRoute() {
  return <LoginPage />;
}
