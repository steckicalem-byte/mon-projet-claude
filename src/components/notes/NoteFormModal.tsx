import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { SubjectInput } from '@/components/ui/SubjectInput';
import { useStore, type NoteInput } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { uniqueSubjects } from '@/lib/subjects';
import type { Note } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Note | null;
  defaultSubject?: string;
}

type Errors = Partial<Record<keyof NoteInput, string>>;

export function validateNote(v: NoteInput): Errors {
  const e: Errors = {};
  if (!v.title.trim()) e.title = 'Le titre est obligatoire.';
  else if (v.title.trim().length > 120) e.title = '120 caractères maximum.';
  if (!v.subject.trim()) e.subject = 'Indiquez la matière.';
  if (!v.content.trim()) e.content = 'La note est vide.';
  else if (v.content.length > 50000) e.content = '50 000 caractères maximum.';
  return e;
}

export function NoteFormModal({ open, onClose, editing, defaultSubject }: Props) {
  const { assignments, sessions, notes, addNote, updateNote } = useStore();
  const { notify } = useToast();
  const [values, setValues] = useState<NoteInput>({ title: '', subject: '', content: '' });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setValues(editing ? { title: editing.title, subject: editing.subject, content: editing.content } : { title: '', subject: defaultSubject ?? '', content: '' });
  }, [open, editing, defaultSubject]);

  const set = <K extends keyof NoteInput>(k: K, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateNote(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const clean = { title: values.title.trim(), subject: values.subject.trim(), content: values.content };
    if (editing) {
      updateNote(editing.id, clean);
      notify('Note enregistrée');
    } else {
      addNote(clean);
      notify('Note créée');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Modifier la note' : 'Nouvelle note'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="note-form">Enregistrer</Button>
        </>
      }
    >
      <form id="note-form" noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label="Titre" required autoFocus value={values.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex. Révolution française — causes" maxLength={140} error={errors.title} />
        <SubjectInput value={values.subject} onChange={(v) => set('subject', v)} suggestions={uniqueSubjects(notes, assignments, sessions)} error={errors.subject} />
        <TextAreaField
          wrapperClassName="sm:col-span-2"
          label="Contenu"
          required
          value={values.content}
          onChange={(e) => set('content', e.target.value)}
          placeholder="Écrivez votre note de cours…"
          className="min-h-[260px] font-mono text-[13px] leading-relaxed"
          error={errors.content}
          hint={`${values.content.length.toLocaleString('fr-FR')} caractères`}
        />
      </form>
    </Modal>
  );
}
