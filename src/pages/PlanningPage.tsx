import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SessionFormModal } from '@/components/planning/SessionFormModal';
import { SessionItem } from '@/components/planning/SessionItem';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { addDays, formatDuration, formatShortDay, startOfWeek, toISODate, todayISO } from '@/lib/dates';
import { cn } from '@/lib/cn';
import type { StudySession } from '@/types';

const monthFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export function sortSessions(a: StudySession, b: StudySession) {
  return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
}

export function upcomingSessions(sessions: StudySession[], limit: number): StudySession[] {
  const now = new Date();
  const today = todayISO();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return sessions
    .filter((s) => !s.done && (s.date > today || (s.date === today && endTime(s) >= hhmm)))
    .sort(sortSessions)
    .slice(0, limit);
}

function endTime(s: StudySession): string {
  const [h, m] = s.startTime.split(':').map(Number);
  const t = h * 60 + m + s.durationMinutes;
  return `${String(Math.min(23, Math.floor(t / 60))).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function PlanningPage() {
  const { sessions, toggleSession, deleteSession, restoreSession } = useStore();
  const { notify } = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [toDelete, setToDelete] = useState<StudySession | null>(null);

  const today = todayISO();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const byDay = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    for (const s of [...sessions].sort(sortSessions)) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessions]);

  const weekSessions = days.flatMap((d) => byDay.get(toISODate(d)) ?? []);
  const weekMinutes = weekSessions.reduce((t, s) => t + s.durationMinutes, 0);
  const weekDoneMinutes = weekSessions.filter((s) => s.done).reduce((t, s) => t + s.durationMinutes, 0);
  const next = upcomingSessions(sessions, 5);

  const openNew = (date?: string) => {
    setEditing(null);
    setDefaultDate(date);
    setFormOpen(true);
  };

  const handleToggle = (s: StudySession) => {
    toggleSession(s.id);
    notify(s.done ? 'Session marquée comme non terminée' : 'Session terminée, bien joué !');
  };

  const handlers = (s: StudySession) => ({
    onToggle: () => handleToggle(s),
    onEdit: () => {
      setEditing(s);
      setFormOpen(true);
    },
    onDelete: () => setToDelete(s),
  });

  const weekLabel = `${monthFmt.format(days[0])} – ${monthFmt.format(days[6])}`;
  const isCurrentWeek = toISODate(weekStart) === toISODate(startOfWeek(new Date()));

  return (
    <>
      <PageHeader
        title="Planning de révision"
        description="Organisez vos sessions par jour et par matière."
        actions={<Button onClick={() => openNew()}><Plus className="h-4 w-4" aria-hidden />Nouvelle session</Button>}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Votre planning est vide"
          description="Planifiez des sessions de révision régulières (vous pouvez les répéter chaque semaine) pour avancer sans stress."
          action={<Button onClick={() => openNew()}><Plus className="h-4 w-4" aria-hidden />Planifier une session</Button>}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <section aria-labelledby="week-title" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="icon" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Semaine précédente">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Semaine suivante">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 id="week-title" className="ml-2 font-semibold" aria-live="polite">Semaine du {weekLabel}</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted">
                <span>{formatDuration(weekDoneMinutes)} / {formatDuration(weekMinutes)} réalisées</span>
                {!isCurrentWeek && <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>Cette semaine</Button>}
              </div>
            </div>

            <ol className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {days.map((d) => {
                const iso = toISODate(d);
                const list = byDay.get(iso) ?? [];
                const isToday = iso === today;
                return (
                  <li key={iso} className={cn('card flex flex-col p-3', isToday && 'ring-1 ring-brand-500/50')}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">
                        {formatShortDay(d)} {d.getDate()}
                        {isToday && <span className="ml-2 rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-medium text-brand-400">Aujourd'hui</span>}
                      </h3>
                      <button
                        type="button"
                        onClick={() => openNew(iso)}
                        className="rounded-lg p-1 text-muted transition hover:bg-elevated hover:text-brand-400"
                        aria-label={`Ajouter une session le ${formatShortDay(d)} ${d.getDate()}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {list.length ? (
                      <ul className="grid gap-2">{list.map((s) => <SessionItem key={s.id} session={s} {...handlers(s)} />)}</ul>
                    ) : (
                      <p className="py-3 text-center text-xs text-muted">Aucune session</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <aside aria-labelledby="next-title" className="card h-fit p-4 xl:sticky xl:top-10">
            <h2 id="next-title" className="mb-3 flex items-center gap-2 font-semibold">
              <CalendarCheck className="h-4 w-4 text-brand-400" aria-hidden />Prochaines sessions
            </h2>
            {next.length ? (
              <ul className="grid gap-2">{next.map((s) => <SessionItem key={s.id} session={s} showDate onToggle={() => handleToggle(s)} />)}</ul>
            ) : (
              <p className="text-sm text-muted">Aucune session à venir. Planifiez-en une !</p>
            )}
          </aside>
        </div>
      )}

      <SessionFormModal open={formOpen} editing={editing} defaultDate={defaultDate} onClose={() => { setFormOpen(false); setEditing(null); }} />
      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette session ?"
        message="La session sera retirée de votre planning."
        onConfirm={() => {
          if (!toDelete) return;
          const removed = deleteSession(toDelete.id);
          setToDelete(null);
          if (removed) notify('Session supprimée', 'success', { label: 'Annuler', onClick: () => restoreSession(removed) });
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
