export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest?: string;
}

export type MatchStatus = 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED' | 'AWARDED';

/** Match normalisé (indépendant de la source de données). */
export interface Match {
  id: number;
  utcDate: string;
  status: MatchStatus;
  matchday: number | null;
  /** Année de début de la saison (ex. 2026 pour 2026-27). */
  season: number;
  home: Team;
  away: Team;
  /** Score final, renseigné uniquement pour les matchs terminés. */
  score: { home: number; away: number } | null;
}

export interface Competition {
  code: string;
  name: string;
  country: string;
}

export type DataSource = 'api' | 'demo';

export interface Dataset {
  competition: Competition;
  source: DataSource;
  /** Saison courante puis saison précédente, triées par date. */
  matches: Match[];
  currentSeason: number;
  fetchedAt: string;
}

export type Outcome = 'H' | 'D' | 'A';

export interface Odds {
  home?: number;
  draw?: number;
  away?: number;
}

export interface Preferences {
  theme: 'dark' | 'light';
  competition: string;
  bankroll: number;
  /** Fraction du critère de Kelly appliquée (0.25 = quart de Kelly). */
  kellyFraction: number;
  /** Avantage minimum (en %) pour signaler une cote « value ». */
  minEdge: number;
}
