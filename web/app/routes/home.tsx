import type { MetaFunction } from 'react-router';
import { HomePage } from '~/modules/home/pages/home-page';

export const meta: MetaFunction = () => [
  { title: 'Secretary Assistant' },
  {
    name: 'description',
    content:
      'AI-powered WhatsApp secretary for small business owners. Automate customer support with your personal AI agent.',
  },
];

export default function HomeRoute() {
  return <HomePage />;
}
