import { describe, expect, it } from 'vitest';
import type { Match } from '@/types';
import type { Pick, PickStatus } from './types';
import { computeStats, cumulativeUnits, hitRateByMarket } from './stats';

const match = { id: 1, utcDate: '2026-10-01T19:00:00Z', status: 'FINISHED', matchday: 1, season: 2026, home: { id: 1, name: 'A', shortName: 'A', tla: 'A' }, away: { id: 2, name: 'B', shortName: 'B', tla: 'B' }, score: { home: 1, away: 0 } } as Match;
let i = 0;
const pick = (status: PickStatus, odds: number, stake: number | null, market: Pick['market'] = '1X2', day = 1): Pick => ({
  id: String(++i), matchId: 1, competition: 'FL1', match, market, selection: '1', odds, stake, modelProbability: null, status, manual: false, note: '',
  createdAt: '2026-09-30', updatedAt: '2026-10-01', settledAt: status === 'pending' ? null : `2026-10-0${day}T22:00:00Z`,
});

describe('statistiques des pronostics', () => {
  const picks = [pick('won', 2, 10, '1X2', 1), pick('lost', 1.5, 10, 'OU25', 2), pick('void', 3, 10, '1X2', 3), pick('pending', 1.8, 5), pick('won', 1.5, null, 'BTTS', 4)];
  const s = computeStats(picks);

  it('compte chaque statut', () => {
    expect(s.byStatus).toEqual({ pending: 1, won: 2, lost: 1, void: 1 });
  });
  it('calcule le taux de réussite uniquement sur les pronostics réglés gagnés/perdus', () => {
    expect(s.hitRate).toBeCloseTo(2 / 3);
  });
  it('calcule gains, mises et ROI (annulés et sans mise exclus des euros)', () => {
    expect(s.profit).toBeCloseTo(10 - 10);
    expect(s.staked).toBe(20);
    expect(s.roi).toBeCloseTo(0);
    expect(s.units).toBeCloseTo(1 - 1 + 0 + 0.5);
  });
  it('trace le gain cumulé dans l’ordre chronologique', () => {
    expect(cumulativeUnits(picks).map((p) => p.units)).toEqual([1, 0, 0, 0.5]);
  });
  it('donne le taux de réussite par type de pari', () => {
    const r = hitRateByMarket(picks);
    expect(r.find((x) => x.market === 'OU25')).toMatchObject({ won: 0, decided: 1, rate: 0 });
    expect(r.find((x) => x.market === '1X2')).toMatchObject({ won: 1, decided: 1 });
  });
  it('ne donne pas de taux sans pronostic réglé', () => {
    expect(computeStats([pick('pending', 2, 1)]).hitRate).toBeNull();
  });
});
