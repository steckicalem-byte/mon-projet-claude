import { LayoutDashboard, ClipboardList, CalendarDays, NotebookPen, Sparkles, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Tableau de bord', short: 'Accueil', icon: LayoutDashboard },
  { to: '/devoirs', label: 'Devoirs', short: 'Devoirs', icon: ClipboardList },
  { to: '/planning', label: 'Planning', short: 'Planning', icon: CalendarDays },
  { to: '/notes', label: 'Notes de cours', short: 'Notes', icon: NotebookPen },
  { to: '/assistant', label: 'Assistant IA', short: 'IA', icon: Sparkles },
];

export const SETTINGS_ITEM: NavItem = { to: '/parametres', label: 'Profil et paramètres', short: 'Profil', icon: Settings };
