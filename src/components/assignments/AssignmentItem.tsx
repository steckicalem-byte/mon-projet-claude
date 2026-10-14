import { CalendarClock, Check, Pencil, Trash2, AlertCircle } from 'lucide-react';
import type { Assignment } from '@/types';
import { PriorityBadge, SubjectBadge } from '@/components/ui/Badge';
import { daysUntil, relativeDue, formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

interface Props {
  assignment: Assignment;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function AssignmentItem({ assignment: a, onToggle, onEdit, onDelete, compact }: Props) {
  const done = a.status === 'done';
  const d = daysUntil(a.dueDate);
  const overdue = !done && d < 0;
  const soon = !done && d >= 0 && d <= 2;

  return (
    <li
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 transition hover:border-brand-500/40',
        overdue && 'border-red-500/40 bg-red-500/[0.04]',
        done && 'opacity-70',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Marquer « ${a.title} » comme à faire` : `Marquer « ${a.title} » comme terminé`}
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition',
          done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line hover:border-brand-500',
        )}
      >
        {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('font-medium leading-snug', done && 'text-muted line-through')}>{a.title}</p>
        {!compact && a.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{a.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SubjectBadge subject={a.subject} />
          <PriorityBadge priority={a.priority} />
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs',
              overdue ? 'font-semibold text-red-500' : soon ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted',
            )}
            title={`Échéance : ${formatDate(a.dueDate)}`}
          >
            {overdue ? <AlertCircle className="h-3.5 w-3.5" aria-hidden /> : <CalendarClock className="h-3.5 w-3.5" aria-hidden />}
            {done ? `Terminé · échéance ${formatDate(a.dueDate)}` : relativeDue(a.dueDate)}
          </span>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0 gap-0.5 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          {onEdit && (
            <button type="button" onClick={onEdit} className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-fg" aria-label={`Modifier « ${a.title} »`}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500" aria-label={`Supprimer « ${a.title} »`}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
