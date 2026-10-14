import { Link } from 'react-router-dom';
import { Gem } from 'lucide-react';
import type { Match } from '@/types';
import type { Prediction } from '@/lib/model/poisson';
import { expectedValue } from '@/lib/model/betting';
import { OUTCOME_LABEL, pct, shortDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { usePrefs } from '@/context/PrefsContext';
import { useData } from '@/context/DataContext';
import { BookmarkButton } from '@/components/user/BookmarkButton';
import { MatchStatus, ProbBar, TeamCrest } from './parts';

/** Meilleure espérance parmi les cotes saisies par l'utilisateur pour ce match. */
export function bestValue(match: Match, p: Prediction, odds: ReturnType<typeof usePrefs>['odds']) {
  const o = odds[match.id];
  if (!o) return undefined;
  return ([['1', p.home, o.home], ['N', p.draw, o.draw], ['2', p.away, o.away]] as const)
    .filter(([, , q]) => q)
    .map(([label, prob, q]) => ({ label, ev: expectedValue(prob, q!) }))
    .sort((a, b) => b.ev - a.ev)[0];
}

function TeamRow({ match, side, p }: { match: Match; side: 'home' | 'away'; p: number | null }) {
  const team = match[side];
  const goals = match.score?.[side];
  const fav = p != null && p >= 0.5;
  return (
    <div className="flex items-center gap-3">
      <TeamCrest team={team} />
      <span className={cn('min-w-0 flex-1 truncate text-[15px]', fav ? 'font-semibold' : 'font-medium')} title={team.name}>{team.shortName}</span>
      {goals != null ? (
        <span className="text-lg font-bold tabular-nums">{goals}</span>
      ) : p != null ? (
        <span className={cn('text-sm tabular-nums', fav ? 'font-semibold text-brand-700 dark:text-brand-400' : 'text-muted')}>{pct(p)}</span>
      ) : null}
    </div>
  );
}

export function MatchCard({
  match,
  prediction,
  showDate = false,
  competition,
  competitionCode,
}: {
  match: Match;
  prediction: Prediction | null;
  showDate?: boolean;
  /** Nom de la compétition à afficher (vues mélangeant plusieurs compétitions). */
  competition?: string;
  /** Code de la compétition du match (par défaut : celle affichée). */
  competitionCode?: string;
}) {
  const { odds, preferences } = usePrefs();
  const { dataset } = useData();
  const code = competitionCode ?? dataset?.competition.code ?? '';
  const best = prediction ? bestValue(match, prediction, odds) : undefined;
  const score = prediction?.topScores[0];

  return (
    <Link
      to={`/match/${match.id}?c=${code}`}
      className="card group block p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-glow focus-visible:border-brand-500"
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">
          {showDate && <span className="font-medium text-fg">{shortDate(match.utcDate)} · </span>}
          {competition ? `${competition}${match.matchday ? ` · J${match.matchday}` : ''}` : match.matchday ? `Journée ${match.matchday}` : ''}
        </span>
        <span className="flex items-center gap-1">
          <MatchStatus match={match} />
          <BookmarkButton match={match} competition={code} className="-my-1.5 -mr-2" />
        </span>
      </div>

      <div className="space-y-2">
        <TeamRow match={match} side="home" p={prediction?.home ?? null} />
        <TeamRow match={match} side="away" p={prediction?.away ?? null} />
      </div>

      {prediction && score && (
        <>
          <div className="mt-3.5">
            <ProbBar home={prediction.home} draw={prediction.draw} away={prediction.away} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
            <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 font-semibold text-brand-700 dark:text-brand-400">Prono {OUTCOME_LABEL[prediction.pick]}</span>
            <span>Score probable <strong className="text-fg tabular-nums">{score.home}-{score.away}</strong></span>
            <span>+2,5 buts <strong className="text-fg">{pct(prediction.over25)}</strong></span>
            <span>BTTS <strong className="text-fg">{pct(prediction.btts)}</strong></span>
            {best && best.ev * 100 >= preferences.minEdge && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 font-semibold text-brand-700 ring-1 ring-inset ring-brand-500/30 dark:text-brand-300">
                <Gem className="h-3 w-3" aria-hidden /> Value {best.label} +{pct(best.ev)}
              </span>
            )}
          </div>
        </>
      )}
    </Link>
  );
}
