import { AlertTriangle, Database, FlaskConical, RefreshCw } from 'lucide-react';
import type { Match, Team } from '@/types';
import type { FormResult } from '@/lib/format';
import { pct, timeLabel } from '@/lib/format';
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
    { label: '1', p: home, cls: 'bg-brand-500' },
    { label: 'N', p: draw, cls: 'bg-slate-400 dark:bg-slate-500' },
    { label: '2', p: away, cls: 'bg-electric-500' },
  ];
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-elevated" role="img" aria-label={`Victoire domicile ${pct(home)}, nul ${pct(draw)}, victoire extérieur ${pct(away)}`}>
        {seg.map((s) => <div key={s.label} className={s.cls} style={{ width: `${s.p * 100}%` }} />)}
      </div>
      <div className="mt-1.5 grid grid-cols-3 text-xs tabular-nums" aria-hidden>
        <span><span className="font-semibold text-brand-700 dark:text-brand-400">1</span> {pct(home)}</span>
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
  const { dataset, refresh, loading } = useData();
  if (!dataset) return null;
  if (dataset.notice) {
    return (
      <div role="status" className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        <p className="flex-1">{dataset.notice}</p>
        <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden /> Réessayer
        </Button>
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

/** Squelette d'une carte de match, de la même forme que la vraie carte. */
export function MatchCardSkeleton() {
  return (
    <div className="card space-y-4 p-4" aria-hidden>
      <div className="flex justify-between"><div className="skeleton h-3 w-24" /><div className="skeleton h-3 w-12" /></div>
      <div className="space-y-2.5">
        <div className="flex items-center gap-3"><div className="skeleton h-8 w-8 rounded-full" /><div className="skeleton h-4 w-32" /></div>
        <div className="flex items-center gap-3"><div className="skeleton h-8 w-8 rounded-full" /><div className="skeleton h-4 w-28" /></div>
      </div>
      <div className="skeleton h-2.5 w-full rounded-full" />
    </div>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Chargement des matchs">
      {Array.from({ length: count }, (_, i) => <MatchCardSkeleton key={i} />)}
    </div>
  );
}

const LIVE = new Set(['IN_PLAY', 'PAUSED']);
const OFF = new Set(['POSTPONED', 'SUSPENDED', 'CANCELLED']);

/** Heure du coup d'envoi, ou statut (en direct, terminé, reporté…). */
export function MatchStatus({ match }: { match: Match }) {
  if (LIVE.has(match.status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-500/30 dark:text-red-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden /> En direct
      </span>
    );
  }
  if (match.status === 'FINISHED') return <span className="rounded-full bg-elevated px-2 py-0.5 text-xs font-medium text-muted">Terminé</span>;
  if (OFF.has(match.status)) {
    const label = match.status === 'POSTPONED' ? 'Reporté' : match.status === 'CANCELLED' ? 'Annulé' : 'Suspendu';
    return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">{label}</span>;
  }
  return <span className="text-sm font-semibold tabular-nums">{timeLabel(match.utcDate)}</span>;
}
