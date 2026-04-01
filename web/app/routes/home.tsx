import type { MetaFunction } from 'react-router';
import { HomePage } from '~/modules/home/pages/home-page';

export const meta: MetaFunction = () => [
  { title: 'Secretary Assistant' },
  {
    name: 'description',
    content:
      'Secretária de WhatsApp com IA para pequenos negócios. Automatize o atendimento com seu agente de IA.',
  },
];

export default function HomeRoute() {
  return <HomePage />;
}
