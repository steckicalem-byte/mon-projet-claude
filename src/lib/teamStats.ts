/**
 * Statistiques d'équipe calculées uniquement à partir des matchs chargés
 * (aucune donnée inventée) : bilans global / domicile / extérieur et confrontations directes.
 */
import type { Match } from '@/types';

export interface Record_ {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
}

export interface TeamSplits {
  /** Saison décrite (la saison en cours si l'équipe y a joué, sinon la précédente). */
  season: number;
  overall: Record_;
  home: Record_;
  away: Record_;
}

const empty = (): Record_ => ({ played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, cleanSheets: 0 });

function add(r: Record_, gf: number, ga: number) {
  r.played++;
  r.goalsFor += gf;
  r.goalsAgainst += ga;
  if (ga === 0) r.cleanSheets++;
  if (gf > ga) r.won++;
  else if (gf === ga) r.drawn++;
  else r.lost++;
}

function played(m: Match, before: string): m is Match & { score: { home: number; away: number } } {
  return m.status === 'FINISHED' && m.score != null && m.utcDate < before;
}

export function teamSplits(matches: Match[], teamId: number, currentSeason: number, before: string): TeamSplits {
  const involved = matches.filter((m) => played(m, before) && (m.home.id === teamId || m.away.id === teamId));
  const season = involved.some((m) => m.season === currentSeason) ? currentSeason : currentSeason - 1;
  const out: TeamSplits = { season, overall: empty(), home: empty(), away: empty() };
  for (const m of involved) {
    if (m.season !== season) continue;
    const isHome = m.home.id === teamId;
    const gf = isHome ? m.score!.home : m.score!.away;
    const ga = isHome ? m.score!.away : m.score!.home;
    add(out.overall, gf, ga);
    add(isHome ? out.home : out.away, gf, ga);
  }
  return out;
}

/** Dernières confrontations entre deux équipes (toutes saisons chargées), de la plus récente à la plus ancienne. */
export function headToHead(matches: Match[], a: number, b: number, before: string, limit = 5): Match[] {
  return matches
    .filter((m) => played(m, before) && ((m.home.id === a && m.away.id === b) || (m.home.id === b && m.away.id === a)))
    .sort((x, y) => y.utcDate.localeCompare(x.utcDate))
    .slice(0, limit);
}

/** Nombre de matchs terminés d'une équipe dans les données (base de la fiabilité). */
export function observedMatches(matches: Match[], teamId: number, before: string): number {
  return matches.filter((m) => played(m, before) && (m.home.id === teamId || m.away.id === teamId)).length;
}

export type Reliability = 'élevée' | 'moyenne' | 'faible';

/** Fiabilité des statistiques d'un match selon l'équipe la moins observée. */
export function matchReliability(matches: Match[], homeId: number, awayId: number, before: string): { level: Reliability; minObserved: number } {
  const minObserved = Math.min(observedMatches(matches, homeId, before), observedMatches(matches, awayId, before));
  return { level: minObserved >= 15 ? 'élevée' : minObserved >= 6 ? 'moyenne' : 'faible', minObserved };
}

export const perGame = (total: number, n: number) => (n ? total / n : 0);
