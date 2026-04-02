import {
  Building2,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface AppNavigationItem {
  description: string;
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  to: '/app' | '/app/company' | '/app/contacts' | '/app/settings';
}

export const APP_NAVIGATION: AppNavigationItem[] = [
  {
    to: '/app',
    label: 'Painel',
    shortLabel: 'Painel',
    description: 'Visão geral da área de trabalho e dos próximos passos do assistente.',
    icon: LayoutDashboard,
  },
  {
    to: '/app/company',
    label: 'Minha empresa',
    shortLabel: 'Empresa',
    description: 'Perfil básico da empresa e base de conhecimento do assistente.',
    icon: Building2,
  },
  {
    to: '/app/contacts',
    label: 'Contatos',
    shortLabel: 'Contatos',
    description: 'Base de contatos e relacionamento com clientes.',
    icon: Users,
  },
  {
    to: '/app/settings',
    label: 'Configurações',
    shortLabel: 'Configurações',
    description: 'Preferências do workspace e ajustes gerais do assistente.',
    icon: Settings,
  },
];
