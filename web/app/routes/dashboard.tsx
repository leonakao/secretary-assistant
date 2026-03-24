import type { MetaFunction } from 'react-router';
import { DashboardPage } from '~/modules/dashboard/pages/dashboard-page';

export const meta: MetaFunction = () => [
  { title: 'Dashboard | Secretary Assistant' },
  {
    name: 'description',
    content:
      'Protected dashboard for Secretary Assistant owners after sign in or sign up.',
  },
];

export default function DashboardRoute() {
  return <DashboardPage />;
}
