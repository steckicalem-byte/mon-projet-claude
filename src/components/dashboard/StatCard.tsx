import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  to: string;
  tone: 'violet' | 'blue' | 'green' | 'red';
  hint?: string;
}

const tones = {
  violet: 'from-brand-500/25 to-brand-500/5 text-brand-400',
  blue: 'from-electric-500/25 to-electric-500/5 text-electric-400',
  green: 'from-emerald-500/25 to-emerald-500/5 text-emerald-400',
  red: 'from-red-500/25 to-red-500/5 text-red-400',
};

export function StatCard({ label, value, icon: Icon, to, tone, hint }: Props) {
  return (
    <Link to={to} className="card card-hover block p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className={cn('rounded-xl bg-gradient-to-br p-2', tones[tone])}><Icon className="h-4 w-4" aria-hidden /></span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Link>
  );
}
