import type { MetaFunction } from 'react-router';
import { LoginPage } from '~/modules/auth/pages/login-page';

export const meta: MetaFunction = () => [
  { title: 'Sign In | Secretary Assistant' },
  {
    name: 'description',
    content:
      'Sign in or sign up to access the protected Secretary Assistant dashboard.',
  },
];

export default function LoginRoute() {
  return <LoginPage />;
}
