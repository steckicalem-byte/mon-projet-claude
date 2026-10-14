import { describe, expect, it } from 'vitest';
import { normalizeMatch, type ApiMatch } from './normalize';

const base: ApiMatch = {
  id: 1,
  utcDate: '2026-05-30T19:00:00Z',
  status: 'FINISHED',
  matchday: null,
  season: { startDate: '2025-09-16' },
  homeTeam: { id: 1, name: 'Paris Saint-Germain FC', shortName: 'PSG', tla: 'PSG' },
  awayTeam: { id: 2, name: 'FC Internazionale Milano', shortName: 'Inter', tla: 'INT' },
  score: { fullTime: { home: 1, away: 0 } },
};

describe('normalizeMatch', () => {
  it('garde le score final pour un match en temps réglementaire', () => {
    expect(normalizeMatch(base)?.score).toEqual({ home: 1, away: 0 });
    expect(normalizeMatch(base)?.season).toBe(2025);
  });

  it('utilise le score à 90 minutes après prolongation ou tirs au but', () => {
    const pens = normalizeMatch({ ...base, score: { duration: 'PENALTY_SHOOTOUT', fullTime: { home: 5, away: 4 }, regularTime: { home: 1, away: 1 } } });
    expect(pens?.score).toEqual({ home: 1, away: 1 });
  });

  it("n'a pas de score pour un match à venir et ignore les équipes non définies", () => {
    expect(normalizeMatch({ ...base, status: 'TIMED', score: { fullTime: { home: null, away: null } } })?.score).toBeNull();
    expect(normalizeMatch({ ...base, homeTeam: { id: 0, name: '' } })).toBeNull();
  });
});
