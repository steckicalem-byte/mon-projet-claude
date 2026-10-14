import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { SubjectInput } from '@/components/ui/SubjectInput';
import { useStore, type AssignmentInput } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { todayISO, addDays, toISODate, daysUntil } from '@/lib/dates';
import { uniqueSubjects } from '@/lib/subjects';
import type { Assignment } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Assignment | null;
}

type Errors = Partial<Record<keyof AssignmentInput, string>>;

const empty = (): AssignmentInput => ({
  title: '',
  subject: '',
  description: '',
  priority: 'medium',
  dueDate: toISODate(addDays(new Date(), 7)),
});

export function validateAssignment(v: AssignmentInput): Errors {
  const e: Errors = {};
  if (!v.title.trim()) e.title = 'Le titre est obligatoire.';
  else if (v.title.trim().length > 120) e.title = '120 caractères maximum.';
  if (!v.subject.trim()) e.subject = 'Indiquez la matière.';
  if (!v.dueDate) e.dueDate = 'Choisissez une date limite.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.dueDate) || Number.isNaN(Date.parse(v.dueDate))) e.dueDate = 'Date invalide.';
  if (v.description.length > 2000) e.description = '2000 caractères maximum.';
  return e;
}

export function AssignmentFormModal({ open, onClose, editing }: Props) {
  const { assignments, sessions, notes, addAssignment, updateAssignment } = useStore();
  const { notify } = useToast();
  const [values, setValues] = useState<AssignmentInput>(empty);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setValues(
      editing
        ? { title: editing.title, subject: editing.subject, description: editing.description, priority: editing.priority, dueDate: editing.dueDate }
        : empty(),
    );
  }, [open, editing]);

  const set = <K extends keyof AssignmentInput>(k: K, v: AssignmentInput[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateAssignment(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const clean = { ...values, title: values.title.trim(), subject: values.subject.trim(), description: values.description.trim() };
    if (editing) {
      updateAssignment(editing.id, clean);
      notify('Devoir mis à jour');
    } else {
      addAssignment(clean);
      notify('Devoir ajouté');
    }
    onClose();
  };

  const pastDue = values.dueDate && daysUntil(values.dueDate) < 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Modifier le devoir' : 'Nouveau devoir'}
      description="Les champs marqués d'un * sont obligatoires."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="assignment-form">{editing ? 'Enregistrer' : 'Ajouter le devoir'}</Button>
        </>
      }
    >
      <form id="assignment-form" noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField
          wrapperClassName="sm:col-span-2"
          label="Titre"
          required
          autoFocus
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Ex. Exercices chapitre 4"
          maxLength={140}
          error={errors.title}
        />
        <SubjectInput
          value={values.subject}
          onChange={(v) => set('subject', v)}
          suggestions={uniqueSubjects(assignments, sessions, notes)}
          error={errors.subject}
        />
        <SelectField label="Priorité" value={values.priority} onChange={(e) => set('priority', e.target.value as AssignmentInput['priority'])}>
          <option value="low">Basse</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
        </SelectField>
        <TextField
          wrapperClassName="sm:col-span-2"
          type="date"
          label="Date limite"
          required
          value={values.dueDate}
          min={editing ? undefined : todayISO()}
          onChange={(e) => set('dueDate', e.target.value)}
          error={errors.dueDate}
          hint={pastDue ? 'Cette date est déjà passée : le devoir apparaîtra en retard.' : undefined}
        />
        <TextAreaField
          wrapperClassName="sm:col-span-2"
          label="Description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Consignes, pages à lire, liens…"
          error={errors.description}
        />
      </form>
    </Modal>
  );
}
