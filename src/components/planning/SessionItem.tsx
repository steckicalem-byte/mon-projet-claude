import { Check, Clock, Pencil, Trash2 } from 'lucide-react';
import type { StudySession } from '@/types';
import { SubjectBadge } from '@/components/ui/Badge';
import { formatDuration, relativeDue } from '@/lib/dates';
import { cn } from '@/lib/cn';

interface Props {
  session: StudySession;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}

export function SessionItem({ session: s, onToggle, onEdit, onDelete, showDate }: Props) {
  const label = s.topic || s.subject;
  return (
    <li className={cn('group flex items-start gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-brand-500/40', s.done && 'opacity-70')}>
      <button
        type="button"
        role="checkbox"
        aria-checked={s.done}
        onClick={onToggle}
        aria-label={s.done ? `Marquer la session « ${label} » comme non terminée` : `Marquer la session « ${label} » comme terminée`}
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition',
          s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line hover:border-brand-500',
        )}
      >
        {s.done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <SubjectBadge subject={s.subject} />
        </div>
        {s.topic && <p className={cn('mt-1 text-sm font-medium', s.done && 'line-through text-muted')}>{s.topic}</p>}
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {showDate && <>{relativeDue(s.date)} · </>}
          {s.startTime} · {formatDuration(s.durationMinutes)}
        </p>
      </div>
      {(onEdit || onDelete) && (
        <div className="flex shrink-0 flex-col gap-0.5 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          {onEdit && (
            <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label={`Modifier la session « ${label} »`}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500" aria-label={`Supprimer la session « ${label} »`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
