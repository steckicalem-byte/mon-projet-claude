import { Link } from 'react-router-dom';
import { Gem } from 'lucide-react';
import type { Match } from '@/types';
import type { Prediction } from '@/lib/model/poisson';
import { expectedValue } from '@/lib/model/betting';
import { OUTCOME_LABEL, pct, timeLabel } from '@/lib/format';
import { usePrefs } from '@/context/PrefsContext';
import { ProbBar, TeamCrest } from './parts';

export function MatchCard({ match, prediction }: { match: Match; prediction: Prediction }) {
  const { odds, preferences } = usePrefs();
  const o = odds[match.id];
  const best = o
    ? ([['1', prediction.home, o.home], ['N', prediction.draw, o.draw], ['2', prediction.away, o.away]] as const)
        .filter(([, , q]) => q)
        .map(([label, p, q]) => ({ label, ev: expectedValue(p, q!) }))
        .sort((a, b) => b.ev - a.ev)[0]
    : undefined;
  const score = prediction.topScores[0];

  return (
    <Link to={`/match/${match.id}`} className="card card-hover block p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span>{timeLabel(match.utcDate)}{match.matchday ? ` · J${match.matchday}` : ''}</span>
        {best && best.ev * 100 >= preferences.minEdge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 font-semibold text-brand-600 ring-1 ring-inset ring-brand-500/30 dark:text-brand-300">
            <Gem className="h-3 w-3" aria-hidden /> Value {best.label} +{pct(best.ev)}
          </span>
        )}
      </div>
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TeamCrest team={match.home} />
          <span className="truncate text-sm font-semibold">{match.home.shortName}</span>
        </div>
        <span className="rounded-lg bg-elevated px-2 py-1 text-sm font-bold tabular-nums" title="Score le plus probable">
          {score.home} – {score.away}
        </span>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-semibold">{match.away.shortName}</span>
          <TeamCrest team={match.away} />
        </div>
      </div>
      <ProbBar home={prediction.home} draw={prediction.draw} away={prediction.away} />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2.5 text-xs text-muted">
        <span>Prono : <strong className="text-fg">{OUTCOME_LABEL[prediction.pick]}</strong></span>
        <span>+2,5 buts : <strong className="text-fg">{pct(prediction.over25)}</strong></span>
        <span>Les 2 marquent : <strong className="text-fg">{pct(prediction.btts)}</strong></span>
      </div>
    </Link>
  );
}
