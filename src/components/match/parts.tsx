import { AlertTriangle, Database, FlaskConical, RefreshCw } from 'lucide-react';
import type { Team } from '@/types';
import type { FormResult } from '@/lib/format';
import { pct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { COMPETITIONS } from '@/lib/competitions';
import { usePrefs } from '@/context/PrefsContext';
import { useData } from '@/context/DataContext';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { Button } from '@/components/ui/Button';

export function TeamCrest({ team, size = 'md' }: { team: Team; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-14 w-14 text-sm' : size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-9 w-9 text-[10px]';
  if (team.crest) return <img src={team.crest} alt="" className={cn(dim, 'shrink-0 object-contain')} loading="lazy" />;
  return (
    <span className={cn(dim, 'grid shrink-0 place-items-center rounded-full bg-elevated font-bold text-muted ring-1 ring-line')} aria-hidden>
      {team.tla}
    </span>
  );
}

/** Barre empilée 1 / N / 2. */
export function ProbBar({ home, draw, away }: { home: number; draw: number; away: number }) {
  const seg = [
    { label: '1', p: home, cls: 'bg-emerald-500' },
    { label: 'N', p: draw, cls: 'bg-slate-400 dark:bg-slate-500' },
    { label: '2', p: away, cls: 'bg-electric-500' },
  ];
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-elevated" role="img" aria-label={`Victoire domicile ${pct(home)}, nul ${pct(draw)}, victoire extérieur ${pct(away)}`}>
        {seg.map((s) => <div key={s.label} className={s.cls} style={{ width: `${s.p * 100}%` }} />)}
      </div>
      <div className="mt-1.5 grid grid-cols-3 text-xs tabular-nums" aria-hidden>
        <span><span className="font-semibold text-emerald-600 dark:text-emerald-400">1</span> {pct(home)}</span>
        <span className="text-center"><span className="font-semibold text-muted">N</span> {pct(draw)}</span>
        <span className="text-right"><span className="font-semibold text-electric-500">2</span> {pct(away)}</span>
      </div>
    </div>
  );
}

const formCls: Record<FormResult, string> = {
  V: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300',
  N: 'bg-slate-500/15 text-slate-600 ring-slate-500/30 dark:text-slate-300',
  D: 'bg-red-500/15 text-red-700 ring-red-500/30 dark:text-red-300',
};
const formTitle: Record<FormResult, string> = { V: 'Victoire', N: 'Nul', D: 'Défaite' };

export function FormChips({ form }: { form: Array<{ result: FormResult; label?: string }> }) {
  if (!form.length) return <span className="text-xs text-muted">—</span>;
  return (
    <span className="inline-flex gap-1">
      {form.map((f, i) => (
        <span key={i} title={f.label ?? formTitle[f.result]} className={cn('grid h-5 w-5 place-items-center rounded text-[10px] font-bold ring-1 ring-inset', formCls[f.result])}>
          {f.result}
        </span>
      ))}
    </span>
  );
}

/** Sélecteur de championnat + actualisation + origine des données. */
export function DataToolbar() {
  const { preferences, updatePreferences } = usePrefs();
  const { dataset, loading, refresh } = useData();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect aria-label="Championnat" value={preferences.competition} onChange={(e) => updatePreferences({ competition: e.target.value })}>
        {COMPETITIONS.map((c) => (
          <option key={c.code} value={c.code}>{c.name} ({c.country})</option>
        ))}
      </FilterSelect>
      <Button variant="secondary" size="icon" onClick={refresh} disabled={loading} aria-label="Actualiser les données" title="Actualiser">
        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      </Button>
      {dataset && (
        dataset.source === 'api' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300">
            <Database className="h-3.5 w-3.5" aria-hidden /> Données réelles
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Démo
          </span>
        )
      )}
    </div>
  );
}

export function DataNotice() {
  const { dataset } = useData();
  if (!dataset) return null;
  if (dataset.notice) {
    return (
      <div role="status" className="mb-5 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        <p>{dataset.notice}</p>
      </div>
    );
  }
  if (dataset.source === 'demo') {
    return (
      <div role="status" className="mb-5 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        <p>
          <strong>Mode démonstration :</strong> équipes fictives et résultats simulés, quel que soit le championnat choisi. Configurez une clé
          football-data.org (voir README) pour obtenir les vrais matchs.
        </p>
      </div>
    );
  }
  return null;
}

export function LoadingCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: 4 }, (_, i) => <div key={i} className="card h-36 animate-pulse bg-elevated/50" />)}
    </div>
  );
}
