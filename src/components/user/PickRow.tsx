import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import type { Pick, PickStatus } from '@/lib/user/types';
import { MARKETS, selectionLabel, STATUS_LABEL } from '@/lib/user/markets';
import { euros, num, pct, shortDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { competitionByCode } from '@/lib/competitions';
import { Button } from '@/components/ui/Button';
import { useUserData } from '@/context/UserDataContext';

const statusCls: Record<PickStatus, string> = {
  pending: 'bg-slate-500/15 text-slate-600 ring-slate-500/30 dark:text-slate-300',
  won: 'bg-brand-500/15 text-brand-700 ring-brand-500/30 dark:text-brand-300',
  lost: 'bg-red-500/15 text-red-700 ring-red-500/30 dark:text-red-300',
  void: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300',
};

export function StatusBadge({ status }: { status: PickStatus }) {
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', statusCls[status])}>{STATUS_LABEL[status]}</span>;
}

/** Gain net d'un pronostic réglé (mise requise) : gagné = mise × (cote − 1), perdu = −mise, annulé = 0. */
export function pickProfit(p: Pick): number | null {
  if (p.stake == null || p.status === 'pending') return null;
  return p.status === 'won' ? p.stake * (p.odds - 1) : p.status === 'lost' ? -p.stake : 0;
}

/** Ligne de pronostic avec changement de statut manuel et suppression. */
export function PickRow({ pick, showMatch = false }: { pick: Pick; showMatch?: boolean }) {
  const { updatePick, removePick } = useUserData();
  const m = pick.match;
  const profit = pickProfit(pick);

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        {showMatch && (
          <Link to={`/match/${pick.matchId}?c=${pick.competition}`} className="block truncate text-sm font-semibold hover:underline">
            {m.home.shortName} – {m.away.shortName}
            {m.score && <span className="ml-1.5 font-normal text-muted tabular-nums">({m.score.home}-{m.score.away})</span>}
          </Link>
        )}
        <p className={cn('text-sm', showMatch ? 'text-muted' : 'font-medium')}>
          {MARKETS[pick.market].label} · <span className="text-fg">{selectionLabel(pick.market, pick.selection, m)}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {showMatch && <>{competitionByCode(pick.competition).name} · {shortDate(m.utcDate)} · </>}
          Cote <strong className="text-fg tabular-nums">{num(pick.odds)}</strong>
          {pick.stake != null && <> · Mise {euros(pick.stake)}</>}
          {pick.modelProbability != null && <> · Modèle {pct(pick.modelProbability)}</>}
          {profit != null && <> · <strong className={profit > 0 ? 'text-brand-700 dark:text-brand-400' : profit < 0 ? 'text-red-600 dark:text-red-400' : ''}>{profit > 0 ? '+' : ''}{euros(profit)}</strong></>}
        </p>
        {pick.note && <p className="mt-1 text-xs italic text-muted">« {pick.note} »</p>}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={pick.status} />
        <select
          className="field h-8 w-auto py-0 pl-2 pr-2 text-xs"
          aria-label="Statut du pronostic"
          value={pick.manual ? pick.status : 'auto'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'auto') updatePick(pick.id, { manual: false });
            else updatePick(pick.id, { status: v as PickStatus, manual: true });
          }}
        >
          <option value="auto">Automatique</option>
          <option value="won">Gagné</option>
          <option value="lost">Perdu</option>
          <option value="void">Annulé</option>
          <option value="pending">En attente</option>
        </select>
        <Button size="icon" variant="ghost" aria-label="Supprimer le pronostic" onClick={() => removePick(pick.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
