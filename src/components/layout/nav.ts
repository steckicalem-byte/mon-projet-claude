import { BarChart3, CalendarDays, LayoutDashboard, Shield, Settings, Star, Target, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Affiché dans la barre du bas sur mobile (les autres vont dans « Plus »). */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Tableau de bord', short: 'Accueil', icon: LayoutDashboard, primary: true },
  { to: '/matchs', label: 'Matchs & pronostics', short: 'Matchs', icon: CalendarDays, primary: true },
  { to: '/favoris', label: 'Mes favoris', short: 'Favoris', icon: Star, primary: true },
  { to: '/paris', label: 'Mes pronostics', short: 'Paris', icon: Target, primary: true },
  { to: '/equipes', label: 'Équipes', short: 'Équipes', icon: Shield },
  { to: '/performance', label: 'Fiabilité du modèle', short: 'Modèle', icon: BarChart3 },
  { to: '/parametres', label: 'Paramètres', short: 'Réglages', icon: Settings },
];
