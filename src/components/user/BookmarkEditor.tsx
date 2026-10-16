import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';
import { useUserData } from '@/context/UserDataContext';
import { cn } from '@/lib/cn';
import type { Bookmark } from '@/lib/user/types';
import { categoryStyle } from './CategoryPill';

/** Fenêtre d'édition d'un favori : catégories personnalisées + note personnelle. */
export function BookmarkEditor({ bookmark, open, onClose }: { bookmark: Bookmark | null; open: boolean; onClose: () => void }) {
  const { data, addCategory, updateBookmark } = useUserData();
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    if (open && bookmark) {
      setSelected(bookmark.categoryIds);
      setNote(bookmark.note);
      setNewCat('');
    }
  }, [open, bookmark]);

  if (!bookmark) return null;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const create = () => {
    const cat = addCategory(newCat);
    if (cat) setSelected((s) => (s.includes(cat.id) ? s : [...s, cat.id]));
    setNewCat('');
  };
  const save = () => {
    // On ignore les catégories supprimées entre-temps.
    const valid = selected.filter((id) => data.categories.some((c) => c.id === id));
    updateBookmark(bookmark.id, { categoryIds: valid, note });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modifier le favori"
      description={`${bookmark.match.home.name} – ${bookmark.match.away.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </>
      }
    >
      <fieldset>
        <legend className="label">Catégories</legend>
        <div className="flex flex-wrap gap-2">
          {data.categories.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.id)}
                className={cn('inline-flex h-8 items-center gap-1 rounded-full px-3 text-sm font-medium transition [--pill-l:38%] dark:[--pill-l:70%]', !on && 'opacity-60 hover:opacity-100')}
                style={categoryStyle(c.hue)}
              >
                {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                {c.name}
              </button>
            );
          })}
          {data.categories.length === 0 && <p className="text-sm text-muted">Aucune catégorie pour l’instant : créez-en une ci-dessous (ex. « Combiné du week-end », « À surveiller »).</p>}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <input className="field h-10" placeholder="Nouvelle catégorie" aria-label="Nom de la nouvelle catégorie" maxLength={40} value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button type="submit" variant="secondary" disabled={!newCat.trim()}>
            <Plus className="h-4 w-4" aria-hidden /> Créer
          </Button>
        </form>
      </fieldset>

      <TextAreaField
        wrapperClassName="mt-5"
        label="Note personnelle"
        placeholder="Ex. : attendre la compo, surveiller la cote du nul…"
        maxLength={2000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        hint={`${note.length} / 2000`}
      />
    </Modal>
  );
}
