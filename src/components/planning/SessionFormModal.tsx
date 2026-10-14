import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { SubjectInput } from '@/components/ui/SubjectInput';
import { useStore, type SessionInput } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { addDays, parseISODate, toISODate, todayISO } from '@/lib/dates';
import { uniqueSubjects } from '@/lib/subjects';
import type { StudySession } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: StudySession | null;
  defaultDate?: string;
}

type Errors = Partial<Record<keyof SessionInput | 'repeat', string>>;

export function validateSession(v: SessionInput): Errors {
  const e: Errors = {};
  if (!v.subject.trim()) e.subject = 'Indiquez la matière.';
  if (v.topic.length > 120) e.topic = '120 caractères maximum.';
  if (!v.date || Number.isNaN(Date.parse(v.date))) e.date = 'Choisissez un jour valide.';
  if (!/^\d{2}:\d{2}$/.test(v.startTime)) e.startTime = 'Heure invalide.';
  if (!Number.isFinite(v.durationMinutes) || v.durationMinutes < 10 || v.durationMinutes > 480)
    e.durationMinutes = 'Entre 10 et 480 minutes.';
  return e;
}

export function SessionFormModal({ open, onClose, editing, defaultDate }: Props) {
  const { assignments, sessions, notes, addSession, updateSession } = useStore();
  const { notify } = useToast();
  const [values, setValues] = useState<SessionInput>({ subject: '', topic: '', date: todayISO(), startTime: '18:00', durationMinutes: 60 });
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setRepeatWeeks(1);
    setValues(
      editing
        ? { subject: editing.subject, topic: editing.topic, date: editing.date, startTime: editing.startTime, durationMinutes: editing.durationMinutes }
        : { subject: '', topic: '', date: defaultDate ?? todayISO(), startTime: '18:00', durationMinutes: 60 },
    );
  }, [open, editing, defaultDate]);

  const set = <K extends keyof SessionInput>(k: K, v: SessionInput[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateSession(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const clean = { ...values, subject: values.subject.trim(), topic: values.topic.trim() };
    if (editing) {
      updateSession(editing.id, clean);
      notify('Session mise à jour');
    } else {
      const start = parseISODate(clean.date);
      for (let w = 0; w < repeatWeeks; w++) addSession({ ...clean, date: toISODate(addDays(start, 7 * w)) });
      notify(repeatWeeks > 1 ? `${repeatWeeks} sessions planifiées` : 'Session planifiée');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Modifier la session' : 'Nouvelle session de révision'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="session-form">{editing ? 'Enregistrer' : 'Planifier'}</Button>
        </>
      }
    >
      <form id="session-form" noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SubjectInput value={values.subject} onChange={(v) => set('subject', v)} suggestions={uniqueSubjects(assignments, sessions, notes)} error={errors.subject} />
        <TextField label="Sujet / chapitre" value={values.topic} onChange={(e) => set('topic', e.target.value)} placeholder="Ex. Les dérivées" maxLength={140} error={errors.topic} />
        <TextField type="date" label="Jour" required value={values.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />
        <TextField type="time" label="Heure de début" required value={values.startTime} onChange={(e) => set('startTime', e.target.value)} error={errors.startTime} />
        <SelectField label="Durée" value={String(values.durationMinutes)} onChange={(e) => set('durationMinutes', Number(e.target.value))} error={errors.durationMinutes}>
          {[15, 25, 30, 45, 60, 90, 120, 150, 180].map((m) => (
            <option key={m} value={m}>{m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`}</option>
          ))}
        </SelectField>
        {!editing && (
          <SelectField label="Répéter" value={String(repeatWeeks)} onChange={(e) => setRepeatWeeks(Number(e.target.value))} hint="Crée la même session chaque semaine.">
            <option value="1">Une seule fois</option>
            {[2, 3, 4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>Pendant {n} semaines</option>)}
          </SelectField>
        )}
      </form>
    </Modal>
  );
}
