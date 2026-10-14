import { useMemo, useState } from 'react';
import { Copy, NotebookPen, Pencil, Plus, Search, Trash2, FilterX } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SubjectBadge } from '@/components/ui/Badge';
import { NoteFormModal } from '@/components/notes/NoteFormModal';
import { Modal } from '@/components/ui/Modal';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { uniqueSubjects } from '@/lib/subjects';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/cn';
import type { Note } from '@/types';

const updatedFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function NotesPage() {
  const { notes, deleteNote, restoreNote } = useStore();
  const { notify } = useToast();
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [viewing, setViewing] = useState<Note | null>(null);
  const [toDelete, setToDelete] = useState<Note | null>(null);

  const subjects = useMemo(() => uniqueSubjects(notes), [notes]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.subject.toLowerCase(), (m.get(n.subject.toLowerCase()) ?? 0) + 1);
    return m;
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => (subject === 'all' || n.subject.toLowerCase() === subject.toLowerCase()) && (!q || `${n.title}\n${n.content}\n${n.subject}`.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, query, subject]);

  const grouped = useMemo(() => {
    const m = new Map<string, Note[]>();
    for (const n of filtered) {
      const key = subjects.find((s) => s.toLowerCase() === n.subject.toLowerCase()) ?? n.subject;
      m.set(key, [...(m.get(key) ?? []), n]);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'));
  }, [filtered, subjects]);

  const copy = async (n: Note) => {
    const ok = await copyText(`${n.title}\n\n${n.content}`);
    notify(ok ? 'Note copiée dans le presse-papiers' : 'Impossible de copier automatiquement', ok ? 'success' : 'error');
  };

  const openEdit = (n: Note) => {
    setViewing(null);
    setEditing(n);
    setFormOpen(true);
  };

  const chip = (value: string, label: string, count: number) => (
    <button
      key={value}
      type="button"
      onClick={() => setSubject(value)}
      aria-pressed={subject.toLowerCase() === value.toLowerCase()}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        subject.toLowerCase() === value.toLowerCase()
          ? 'border-brand-500/50 bg-brand-500/15 text-fg'
          : 'border-line text-muted hover:border-brand-500/40 hover:text-fg',
      )}
    >
      {label} <span className="ml-1 opacity-60">{count}</span>
    </button>
  );

  return (
    <>
      <PageHeader
        title="Notes de cours"
        description="Rédigez, retrouvez et organisez vos notes par matière."
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" aria-hidden />Nouvelle note</Button>}
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Aucune note pour l'instant"
          description="Prenez vos notes de cours ici : elles sont classées par matière et faciles à retrouver grâce à la recherche."
          action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" aria-hidden />Créer une note</Button>}
        />
      ) : (
        <>
          <div className="mb-5 space-y-3">
            <div className="relative" role="search">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher dans les titres et le contenu…" aria-label="Rechercher une note" className="field h-11 pl-9" />
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrer par matière">
              {chip('all', 'Toutes', notes.length)}
              {subjects.map((s) => chip(s, s, counts.get(s.toLowerCase()) ?? 0))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={FilterX} title="Aucune note trouvée" description="Essayez un autre mot-clé ou une autre matière." />
          ) : (
            <div className="space-y-8">
              {grouped.map(([subj, list]) => (
                <section key={subj} aria-label={`Notes de ${subj}`}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><SubjectBadge subject={subj} /><span className="text-muted">{list.length} note{list.length > 1 ? 's' : ''}</span></h2>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((n) => (
                      <li key={n.id} className="card card-hover group relative flex flex-col p-4">
                        <h3 className="font-semibold leading-snug">
                          <button type="button" onClick={() => setViewing(n)} className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-500">
                            {n.title}
                          </button>
                        </h3>
                        <p className="mt-2 line-clamp-4 flex-1 whitespace-pre-line text-sm text-muted">{n.content}</p>
                        <div className="relative z-10 mt-4 flex items-center justify-between">
                          <span className="text-xs text-muted">Modifiée le {updatedFmt.format(new Date(n.updatedAt))}</span>
                          <div className="flex gap-0.5">
                            <button type="button" onClick={() => copy(n)} className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label={`Copier « ${n.title} »`}><Copy className="h-4 w-4" /></button>
                            <button type="button" onClick={() => openEdit(n)} className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label={`Modifier « ${n.title} »`}><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setToDelete(n)} className="rounded-lg p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500" aria-label={`Supprimer « ${n.title} »`}><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing?.title ?? ''}
        description={viewing ? `${viewing.subject} · modifiée le ${updatedFmt.format(new Date(viewing.updatedAt))}` : undefined}
        footer={
          viewing && (
            <>
              <Button variant="secondary" onClick={() => copy(viewing)}><Copy className="h-4 w-4" aria-hidden />Copier</Button>
              <Button onClick={() => openEdit(viewing)}><Pencil className="h-4 w-4" aria-hidden />Modifier</Button>
            </>
          )
        }
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{viewing?.content}</div>
      </Modal>

      <NoteFormModal open={formOpen} editing={editing} defaultSubject={subject !== 'all' ? subject : undefined} onClose={() => { setFormOpen(false); setEditing(null); }} />
      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette note ?"
        message={toDelete ? `« ${toDelete.title} » sera supprimée.` : ''}
        onConfirm={() => {
          if (!toDelete) return;
          const removed = deleteNote(toDelete.id);
          setToDelete(null);
          if (removed) notify('Note supprimée', 'success', { label: 'Annuler', onClick: () => restoreNote(removed) });
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
