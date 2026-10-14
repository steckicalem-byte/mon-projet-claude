import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { subjectClasses } from '@/lib/subjects';
import type { Priority } from '@/types';

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', className)}>
      {children}
    </span>
  );
}

export function SubjectBadge({ subject }: { subject: string }) {
  return <Badge className={subjectClasses(subject)}>{subject}</Badge>;
}

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };

const priorityClass: Record<Priority, string> = {
  low: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-slate-500/25',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30',
  high: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/30',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge className={priorityClass[priority]}>
      <span className={cn('h-1.5 w-1.5 rounded-full', priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400')} aria-hidden />
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
