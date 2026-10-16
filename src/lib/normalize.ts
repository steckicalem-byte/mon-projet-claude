/**
 * Conversion des matchs football-data.org (v4) vers le format de l'application.
 * Sans dépendance au navigateur : utilisé aussi côté serveur (`server/analysis.ts`).
 */
import type { Match, MatchStatus, Team } from '@/types';

interface ApiTeam {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
}
interface ApiScore {
  home: number | null;
  away: number | null;
}
export interface ApiMatch {
  id: number;
  utcDate: string;
  status: MatchStatus;
  matchday: number | null;
  season: { startDate: string };
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    duration?: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';
    fullTime: ApiScore;
    regularTime?: ApiScore;
  };
}
function team(t: ApiTeam): Team {
  return { id: t.id, name: t.name, shortName: t.shortName || t.name, tla: t.tla || t.name.slice(0, 3).toUpperCase(), crest: t.crest || undefined };
}

export function normalizeMatch(m: ApiMatch): Match | null {
  // Matchs sans équipes définies (ex. barrages à venir) : inutilisables.
  if (!m.homeTeam?.id || !m.awayTeam?.id) return null;
  // Après prolongation ou tirs au but, fullTime inclut ces buts : le modèle (et les paris 1N2) portent sur les 90 minutes.
  const ft = m.score?.duration && m.score.duration !== 'REGULAR' && m.score.regularTime ? m.score.regularTime : m.score?.fullTime;
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    matchday: m.matchday,
    season: Number(m.season.startDate.slice(0, 4)),
    home: team(m.homeTeam),
    away: team(m.awayTeam),
    score: m.status === 'FINISHED' && ft?.home != null && ft?.away != null ? { home: ft.home, away: ft.away } : null,
  };
}
