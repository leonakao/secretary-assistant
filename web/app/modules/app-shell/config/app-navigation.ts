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
    label: 'Dashboard',
    shortLabel: 'Início',
    description: 'Overview of your workspace and current setup.',
    icon: LayoutDashboard,
  },
  {
    to: '/app/company',
    label: 'Minha empresa',
    shortLabel: 'Empresa',
    description: 'Business profile, setup, and assistant context.',
    icon: Building2,
  },
  {
    to: '/app/contacts',
    label: 'Contatos',
    shortLabel: 'Contatos',
    description: 'Customer directory and conversation relationships.',
    icon: Users,
  },
  {
    to: '/app/settings',
    label: 'Configurações',
    shortLabel: 'Ajustes',
    description: 'Workspace preferences and assistant settings.',
    icon: Settings,
  },
];
