import { useId } from 'react';
import { TextField } from './Field';

interface Props {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  error?: string;
}

/** Champ matière avec suggestions des matières déjà utilisées. */
export function SubjectInput({ value, onChange, suggestions, error }: Props) {
  const listId = useId();
  return (
    <>
      <TextField
        label="Matière"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={listId}
        placeholder="Ex. Mathématiques"
        maxLength={40}
        error={error}
        autoComplete="off"
      />
      <datalist id={listId}>
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>
    </>
  );
}
