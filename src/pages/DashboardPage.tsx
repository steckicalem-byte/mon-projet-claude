import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, ClipboardList, Clock3, Plus, Sparkles, UserRound } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/dashboard/StatCard';
import { AssignmentItem } from '@/components/assignments/AssignmentItem';
import { AssignmentFormModal } from '@/components/assignments/AssignmentFormModal';
import { SessionItem } from '@/components/planning/SessionItem';
import { upcomingSessions } from './PlanningPage';
import { addDays, daysUntil, formatLongDate, formatShortDay, startOfWeek, toISODate, todayISO } from '@/lib/dates';
import type { WeeklyPoint } from '@/components/dashboard/WeeklyChart';

const WeeklyChart = lazy(() => import('@/components/dashboard/WeeklyChart'));

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5 || h >= 18) return 'Bonsoir';
  return 'Bonjour';
}

export function DashboardPage() {
  const { assignments, sessions, preferences, toggleAssignment, toggleSession } = useStore();
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);

  const todo = assignments.filter((a) => a.status === 'todo');
  const doneCount = assignments.length - todo.length;
  const overdueCount = todo.filter((a) => daysUntil(a.dueDate) < 0).length;
  const deadlines = [...todo].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const nextSessions = upcomingSessions(sessions, 3);

  const week = useMemo(() => {
    const start = startOfWeek(new Date());
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const data: WeeklyPoint[] = days.map((d) => {
      const iso = toISODate(d);
      return {
        day: formatShortDay(d),
        devoirs: assignments.filter((a) => a.completedAt && toISODate(new Date(a.completedAt)) === iso).length,
        sessions: sessions.filter((s) => s.done && s.date === iso).length,
      };
    });
    const startISO = toISODate(start);
    const endISO = toISODate(days[6]);
    const dueThisWeek = assignments.filter((a) => a.dueDate >= startISO && a.dueDate <= endISO);
    const plannedThisWeek = sessions.filter((s) => s.date >= startISO && s.date <= endISO);
    return {
      data,
      totalDone: data.reduce((t, p) => t + p.devoirs + p.sessions, 0),
      dueThisWeek: dueThisWeek.length,
      dueDone: dueThisWeek.filter((a) => a.status === 'done').length,
      planned: plannedThisWeek.length,
      plannedDone: plannedThisWeek.filter((s) => s.done).length,
    };
  }, [assignments, sessions]);

  const name = preferences.studentName.trim().split(/\s+/)[0];
  const pct = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 100));
  const duePct = pct(week.dueDone, week.dueThisWeek);
  const sessionPct = pct(week.plannedDone, week.planned);

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand-600/20 via-surface to-electric-600/15 p-6 sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
        <p className="text-sm text-muted">{formatLongDate(todayISO())}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-4xl">
          {greeting()}{name ? <>, <span className="gradient-text">{name}</span></> : ''} 👋
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
          {todo.length === 0
            ? assignments.length === 0
              ? 'Bienvenue sur StudyMate AI. Commencez par ajouter vos devoirs pour garder le contrôle de vos échéances.'
              : 'Tous vos devoirs sont terminés. Profitez-en pour avancer vos révisions !'
            : `Vous avez ${todo.length} devoir${todo.length > 1 ? 's' : ''} en cours${overdueCount ? `, dont ${overdueCount} en retard` : ''}.`}
        </p>
        <div className="relative mt-5 flex flex-wrap gap-2">
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" aria-hidden />Nouveau devoir</Button>
          <Link to="/planning" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-elevated/70 px-4 text-sm font-medium transition hover:border-brand-500/50">
            <CalendarCheck className="h-4 w-4" aria-hidden />Planifier une révision
          </Link>
          {!name && (
            <Link to="/parametres" className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-muted transition hover:bg-elevated hover:text-fg">
              <UserRound className="h-4 w-4" aria-hidden />Indiquer mon prénom
            </Link>
          )}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Devoirs en cours" value={todo.length} icon={ClipboardList} tone="violet" to="/devoirs?statut=todo" />
        <StatCard label="Devoirs terminés" value={doneCount} icon={CheckCircle2} tone="green" to="/devoirs?statut=done" />
        <StatCard label="En retard" value={overdueCount} icon={AlertTriangle} tone="red" to="/devoirs?statut=overdue" />
        <StatCard label="Sessions à venir" value={upcomingSessions(sessions, Infinity).length} icon={Clock3} tone="blue" to="/planning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3" aria-labelledby="progress-title">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="progress-title" className="font-semibold">Progression de la semaine</h2>
              <p className="text-xs text-muted">Calculée uniquement à partir de vos devoirs et sessions.</p>
            </div>
            <div className="flex gap-4 text-right text-xs text-muted">
              <div>
                <p className="text-lg font-bold text-fg">{duePct === null ? '—' : `${duePct} %`}</p>
                <p>échéances de la semaine faites ({week.dueDone}/{week.dueThisWeek})</p>
              </div>
              <div>
                <p className="text-lg font-bold text-fg">{sessionPct === null ? '—' : `${sessionPct} %`}</p>
                <p>sessions réalisées ({week.plannedDone}/{week.planned})</p>
              </div>
            </div>
          </div>
          {week.totalDone === 0 ? (
            <div className="grid h-64 place-items-center rounded-xl border border-dashed border-line text-center">
              <p className="max-w-xs text-sm text-muted">Le graphique se remplira dès que vous terminerez un devoir ou une session de révision cette semaine.</p>
            </div>
          ) : (
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-elevated/60" />}>
              <WeeklyChart data={week.data} />
            </Suspense>
          )}
        </section>

        <section className="card p-5 lg:col-span-2" aria-labelledby="deadlines-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="deadlines-title" className="font-semibold">Prochaines échéances</h2>
            <Link to="/devoirs" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-400 hover:bg-brand-500/10">
              Tout voir <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {deadlines.length ? (
            <ul className="grid gap-2">
              {deadlines.map((a) => (
                <AssignmentItem key={a.id} compact assignment={a} onToggle={() => { toggleAssignment(a.id); notify('Bravo, devoir terminé !'); }} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Aucune échéance"
              description="Ajoutez un devoir pour le voir apparaître ici."
              action={<Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" aria-hidden />Ajouter</Button>}
            />
          )}
        </section>

        <section className="card p-5 lg:col-span-3" aria-labelledby="sessions-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="sessions-title" className="font-semibold">Prochaines sessions de révision</h2>
            <Link to="/planning" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-400 hover:bg-brand-500/10">
              Planning <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {nextSessions.length ? (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {nextSessions.map((s) => <SessionItem key={s.id} session={s} showDate onToggle={() => { toggleSession(s.id); notify('Session terminée, bien joué !'); }} />)}
            </ul>
          ) : (
            <p className="text-sm text-muted">Aucune session prévue. <Link to="/planning" className="font-medium text-brand-400 hover:underline">Créer un planning</Link></p>
          )}
        </section>

        <Link to="/assistant" className="card card-hover group flex items-center gap-4 p-5 lg:col-span-2">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-electric-500 shadow-glow">
            <Sparkles className="h-6 w-6 text-white" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Assistant d'étude</span>
            <span className="block text-sm text-muted">Résumés, fiches de révision et quiz à partir de vos notes.</span>
          </span>
          <ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-brand-400" aria-hidden />
        </Link>
      </div>

      <AssignmentFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
}
