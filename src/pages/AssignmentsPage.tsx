import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Plus, Search, FilterX } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AssignmentFormModal } from '@/components/assignments/AssignmentFormModal';
import { AssignmentItem } from '@/components/assignments/AssignmentItem';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { uniqueSubjects } from '@/lib/subjects';
import { daysUntil } from '@/lib/dates';
import type { Assignment, Priority } from '@/types';

type StatusFilter = 'all' | 'todo' | 'done' | 'overdue';
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function AssignmentsPage() {
  const { assignments, toggleAssignment, deleteAssignment, restoreAssignment } = useStore();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();

  const [formOpen, setFormOpen] = useState(params.get('nouveau') === '1');
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [toDelete, setToDelete] = useState<Assignment | null>(null);

  // L'état local est la source de vérité ; l'URL est synchronisée pour permettre les liens directs.
  const [filters, setFilters] = useState(() => ({
    statut: (params.get('statut') as StatusFilter) || 'all',
    matiere: params.get('matiere') || 'all',
    priorite: (params.get('priorite') as Priority | 'all') || 'all',
  }));
  const { statut: status, matiere: subject, priorite: priority } = filters;
  const [query, setQuery] = useState('');

  useEffect(() => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v !== 'all') next.set(k, v);
    setParams(next, { replace: true });
  }, [filters, setParams]);

  const setFilter = (key: keyof typeof filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const subjects = useMemo(() => uniqueSubjects(assignments), [assignments]);
  const overdueCount = assignments.filter((a) => a.status === 'todo' && daysUntil(a.dueDate) < 0).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments
      .filter((a) => {
        if (status === 'todo' && a.status !== 'todo') return false;
        if (status === 'done' && a.status !== 'done') return false;
        if (status === 'overdue' && !(a.status === 'todo' && daysUntil(a.dueDate) < 0)) return false;
        if (subject !== 'all' && a.subject.toLowerCase() !== subject.toLowerCase()) return false;
        if (priority !== 'all' && a.priority !== priority) return false;
        if (q && !`${a.title} ${a.description} ${a.subject}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'todo' ? -1 : 1;
        const byDate = a.status === 'done' ? b.dueDate.localeCompare(a.dueDate) : a.dueDate.localeCompare(b.dueDate);
        return byDate || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      });
  }, [assignments, status, subject, priority, query]);

  const filtersActive = status !== 'all' || subject !== 'all' || priority !== 'all' || query.trim() !== '';

  const overdue = filtered.filter((a) => a.status === 'todo' && daysUntil(a.dueDate) < 0);
  const upcoming = filtered.filter((a) => a.status === 'todo' && daysUntil(a.dueDate) >= 0);
  const done = filtered.filter((a) => a.status === 'done');

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleToggle = (a: Assignment) => {
    toggleAssignment(a.id);
    notify(a.status === 'done' ? 'Devoir remis à faire' : 'Bravo, devoir terminé !');
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const removed = deleteAssignment(toDelete.id);
    setToDelete(null);
    if (removed) notify('Devoir supprimé', 'success', { label: 'Annuler', onClick: () => restoreAssignment(removed) });
  };

  const renderList = (list: Assignment[]) => (
    <ul className="grid gap-2.5">
      {list.map((a) => (
        <AssignmentItem
          key={a.id}
          assignment={a}
          onToggle={() => handleToggle(a)}
          onEdit={() => {
            setEditing(a);
            setFormOpen(true);
          }}
          onDelete={() => setToDelete(a)}
        />
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader
        title="Devoirs"
        description="Ajoutez, suivez et terminez vos devoirs."
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" aria-hidden />Nouveau devoir</Button>}
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun devoir pour l'instant"
          description="Ajoutez votre premier devoir avec sa matière et sa date limite : StudyMate vous aidera à ne rien oublier."
          action={<Button onClick={openNew}><Plus className="h-4 w-4" aria-hidden />Ajouter un devoir</Button>}
        />
      ) : (
        <>
          {overdueCount > 0 && status !== 'overdue' && (
            <button
              type="button"
              onClick={() => setFilter('statut', 'overdue')}
              className="mb-4 flex w-full items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-left text-sm transition hover:bg-red-500/10"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" aria-hidden />
              <span className="flex-1">
                <strong>{overdueCount} devoir{overdueCount > 1 ? 's' : ''} en retard.</strong>{' '}
                <span className="text-muted">Afficher uniquement les devoirs en retard</span>
              </span>
            </button>
          )}

          <div className="card mb-5 flex flex-col gap-2 p-3 md:flex-row md:items-center" role="search">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un devoir…"
                aria-label="Rechercher un devoir"
                className="field h-10 pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <FilterSelect aria-label="Filtrer par statut" value={status} onChange={(e) => setFilter('statut', e.target.value)}>
                <option value="all">Tous les statuts</option>
                <option value="todo">À faire</option>
                <option value="overdue">En retard</option>
                <option value="done">Terminés</option>
              </FilterSelect>
              <FilterSelect aria-label="Filtrer par priorité" value={priority} onChange={(e) => setFilter('priorite', e.target.value)}>
                <option value="all">Toutes priorités</option>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </FilterSelect>
              <FilterSelect aria-label="Filtrer par matière" value={subject} onChange={(e) => setFilter('matiere', e.target.value)} className="col-span-2">
                <option value="all">Toutes matières</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </FilterSelect>
              {filtersActive && (
                <Button
                  variant="ghost"
                  className="col-span-2"
                  onClick={() => {
                    setQuery('');
                    setFilters({ statut: 'all', matiere: 'all', priorite: 'all' });
                  }}
                >
                  <FilterX className="h-4 w-4" aria-hidden />Réinitialiser
                </Button>
              )}
            </div>
          </div>

          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {filtered.length} devoir{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
          </p>

          {filtered.length === 0 ? (
            <EmptyState icon={FilterX} title="Aucun résultat" description="Aucun devoir ne correspond à ces filtres. Essayez d'en retirer un." />
          ) : (
            <div className="space-y-6">
              {overdue.length > 0 && (
                <section aria-labelledby="h-overdue">
                  <h2 id="h-overdue" className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-red-500">En retard ({overdue.length})</h2>
                  {renderList(overdue)}
                </section>
              )}
              {upcoming.length > 0 && (
                <section aria-labelledby="h-upcoming">
                  <h2 id="h-upcoming" className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-muted">À faire ({upcoming.length})</h2>
                  {renderList(upcoming)}
                </section>
              )}
              {done.length > 0 && (
                <section aria-labelledby="h-done">
                  <h2 id="h-done" className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-muted">Terminés ({done.length})</h2>
                  {renderList(done)}
                </section>
              )}
            </div>
          )}
        </>
      )}

      <AssignmentFormModal
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce devoir ?"
        message={toDelete ? `« ${toDelete.title} » sera supprimé définitivement.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
