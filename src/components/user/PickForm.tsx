import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import type { Match } from '@/types';
import type { Prediction } from '@/lib/model/poisson';
import { expectedValue, fairOdds } from '@/lib/model/betting';
import { MARKETS, modelProbability } from '@/lib/user/markets';
import type { MarketKey } from '@/lib/user/types';
import { num, parseOdds, pct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { useUserData } from '@/context/UserDataContext';

/** Enregistre une sélection (type de pari, cote, mise) pour un match. */
export function PickForm({ match, competition, prediction }: { match: Match; competition: string; prediction: Prediction | null }) {
  const { addPick } = useUserData();
  const [market, setMarket] = useState<MarketKey>('1X2');
  const [selection, setSelection] = useState('1');
  const [odds, setOdds] = useState('');
  const [stake, setStake] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const prob = prediction ? modelProbability(prediction, market, selection) : null;
  const parsedOdds = parseOdds(odds);
  const ev = prob != null && parsedOdds ? expectedValue(prob, parsedOdds) : null;

  const submit = () => {
    if (!parsedOdds) {
      setError('Indiquez la cote obtenue (nombre supérieur à 1, ex. 1,85).');
      return;
    }
    const s = stake.trim() ? Number(stake.replace(',', '.')) : null;
    if (s != null && !(Number.isFinite(s) && s >= 0)) {
      setError('Mise invalide.');
      return;
    }
    addPick(match, competition, { market, selection, odds: parsedOdds, stake: s, modelProbability: prob, note });
    setOdds('');
    setStake('');
    setNote('');
    setError(null);
  };

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <SelectField
        label="Type de pari"
        value={market}
        onChange={(e) => {
          const m = e.target.value as MarketKey;
          setMarket(m);
          setSelection(MARKETS[m].selections[0].key);
        }}
      >
        {(Object.keys(MARKETS) as MarketKey[]).map((k) => <option key={k} value={k}>{MARKETS[k].label}</option>)}
      </SelectField>
      <SelectField label="Sélection" value={selection} onChange={(e) => setSelection(e.target.value)}>
        {MARKETS[market].selections.map((s) => <option key={s.key} value={s.key}>{s.label(match)}</option>)}
      </SelectField>
      <TextField
        label="Cote obtenue"
        inputMode="decimal"
        required
        placeholder={prob ? `Cote juste : ${num(fairOdds(prob))}` : 'ex. 1,85'}
        value={odds}
        onChange={(e) => setOdds(e.target.value)}
        error={error ?? undefined}
      />
      <TextField label="Mise (€, facultatif)" inputMode="decimal" placeholder="ex. 5" value={stake} onChange={(e) => setStake(e.target.value)} />
      <TextField wrapperClassName="sm:col-span-2" label="Note (facultatif)" maxLength={1000} placeholder="Pourquoi ce pari ?" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <p className="text-xs text-muted">
          {prob != null ? <>Probabilité du modèle : <strong className="text-fg">{pct(prob, 1)}</strong></> : 'Probabilité du modèle indisponible.'}
          {ev != null && (
            <> · Espérance : <strong className={cn(ev > 0 ? 'text-brand-700 dark:text-brand-400' : 'text-red-600 dark:text-red-400')}>{ev > 0 ? '+' : ''}{pct(ev, 1)}</strong></>
          )}
        </p>
        <Button type="submit">
          <PlusCircle className="h-4 w-4" aria-hidden /> Enregistrer le pronostic
        </Button>
      </div>
    </form>
  );
}
