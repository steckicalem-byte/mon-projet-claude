import { BarChart3, Shield, Target, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Pronostics', short: 'Pronos', icon: Target },
  { to: '/equipes', label: 'Équipes', short: 'Équipes', icon: Shield },
  { to: '/performance', label: 'Performance', short: 'Perf.', icon: BarChart3 },
  { to: '/parametres', label: 'Paramètres', short: 'Réglages', icon: Settings },
];
