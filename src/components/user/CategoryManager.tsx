import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUserData } from '@/context/UserDataContext';
import { categoryStyle } from './CategoryPill';

const HUES = [145, 190, 45, 330, 265, 20, 100, 215];

/** Gestion des catégories : créer, renommer, changer la couleur, supprimer. */
export function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addCategory, updateCategory, removeCategory } = useUserData();
  const [name, setName] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <Modal open={open} onClose={onClose} title="Catégories" description="Organisez vos favoris comme vous le souhaitez." footer={<Button onClick={onClose}>Terminé</Button>}>
      <ul className="space-y-2">
        {data.categories.map((c) => {
          const used = data.bookmarks.filter((b) => b.categoryIds.includes(c.id)).length;
          return (
            <li key={c.id} className="flex items-center gap-2 rounded-xl bg-elevated/60 p-2">
              <button
                type="button"
                className="h-7 w-7 shrink-0 rounded-full"
                style={categoryStyle(c.hue)}
                title="Changer la couleur"
                aria-label={`Changer la couleur de ${c.name}`}
                onClick={() => updateCategory(c.id, { hue: HUES[(HUES.indexOf(c.hue) + 1) % HUES.length] })}
              />
              <input
                className="field h-9 flex-1 py-0"
                defaultValue={c.name}
                maxLength={40}
                aria-label={`Nom de la catégorie ${c.name}`}
                onBlur={(e) => e.target.value.trim() !== c.name && updateCategory(c.id, { name: e.target.value })}
              />
              <span className="w-14 text-right text-xs text-muted">{used} fav.</span>
              {confirmId === c.id ? (
                <Button size="sm" variant="danger" onClick={() => { removeCategory(c.id); setConfirmId(null); }}>Supprimer</Button>
              ) : (
                <Button size="icon" variant="ghost" aria-label={`Supprimer la catégorie ${c.name}`} onClick={() => setConfirmId(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          );
        })}
        {data.categories.length === 0 && <li className="text-sm text-muted">Aucune catégorie.</li>}
      </ul>
      {confirmId && <p className="mt-2 text-xs text-muted">La catégorie sera retirée de vos favoris (les favoris eux-mêmes sont conservés).</p>}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addCategory(name);
          setName('');
        }}
      >
        <input className="field h-10" placeholder="Nouvelle catégorie" aria-label="Nom de la nouvelle catégorie" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={!name.trim()}>
          <Plus className="h-4 w-4" aria-hidden /> Ajouter
        </Button>
      </form>
    </Modal>
  );
}
