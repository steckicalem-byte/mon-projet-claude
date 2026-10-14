import { describe, expect, it } from 'vitest';
import type { Match } from '@/types';
import { headToHead, matchReliability, teamSplits } from './teamStats';
import { buildAutoAnalysis } from './autoAnalysis';
import { fitModel, predict } from './model/poisson';

const t = (id: number) => ({ id, name: `Équipe ${id}`, shortName: `E${id}`, tla: `E${id}` });
let n = 0;
const m = (h: number, a: number, sh: number | null, sa: number | null, date: string, season = 2026): Match => ({
  id: ++n, utcDate: date, status: sh == null ? 'TIMED' : 'FINISHED', matchday: 1, season, home: t(h), away: t(a), score: sh == null ? null : { home: sh, away: sa! },
});

const data = [
  m(1, 2, 2, 0, '2025-10-01T19:00:00Z', 2025),
  m(2, 1, 1, 1, '2026-02-01T19:00:00Z', 2025),
  m(1, 3, 3, 1, '2026-09-01T19:00:00Z'),
  m(3, 1, 0, 2, '2026-09-08T19:00:00Z'),
  m(1, 2, 1, 0, '2026-09-15T19:00:00Z'),
  m(2, 3, 2, 2, '2026-09-22T19:00:00Z'),
  m(1, 2, null, null, '2026-10-20T19:00:00Z'),
];
const BEFORE = '2026-10-20T19:00:00Z';

describe('statistiques d’équipe', () => {
  it('calcule les bilans global, domicile et extérieur de la saison', () => {
    const s = teamSplits(data, 1, 2026, BEFORE);
    expect(s.season).toBe(2026);
    expect(s.overall).toMatchObject({ played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, cleanSheets: 2 });
    expect(s.home).toMatchObject({ played: 2, won: 2 });
    expect(s.away).toMatchObject({ played: 1, won: 1, goalsFor: 2 });
  });

  it('ne compte que les matchs joués avant la date du match', () => {
    expect(teamSplits(data, 1, 2026, '2026-09-10T00:00:00Z').overall.played).toBe(2);
  });

  it('liste les confrontations directes, de la plus récente à la plus ancienne', () => {
    const h = headToHead(data, 1, 2, BEFORE);
    expect(h.map((x) => x.utcDate.slice(0, 7))).toEqual(['2026-09', '2026-02', '2025-10']);
  });

  it('donne une fiabilité faible quand une équipe est peu observée', () => {
    expect(matchReliability(data, 1, 3, BEFORE)).toEqual({ level: 'faible', minObserved: 3 });
  });

  it('rédige une analyse dont les chiffres viennent des données', () => {
    const params = fitModel(data, Date.parse(BEFORE));
    const target = data.at(-1)!;
    const p = predict(params, 1, 2);
    const a = buildAutoAnalysis(data, target, p, params, 2026);
    expect(a.summary).toContain('E1');
    const h2h = a.factors.find((f) => f.text.includes('confrontations'));
    expect(h2h?.text).toContain('3 dernières confrontations : 2 victoires pour E1, 1 nul, 0 victoire pour E2');
  });
});
