import { describe, expect, it } from 'vitest';
import type { Match } from '@/types';
import { applyMatchUpdates } from './sync';
import { EMPTY_DATA, type Pick } from './types';

const team = (id: number) => ({ id, name: `T${id}`, shortName: `T${id}`, tla: `T${id}` });
const match = (homeId: number, status: Match['status'], score: Match['score']): Match => ({ id: 108, utcDate: '2026-10-20T19:00:00Z', status, matchday: 1, season: 2026, home: team(homeId), away: team(2), score });
const pick: Pick = { id: 'p', matchId: 108, competition: 'FL1', match: match(1, 'TIMED', null), market: '1X2', selection: '1', odds: 2, stake: 10, modelProbability: 0.5, status: 'pending', manual: false, note: '', createdAt: 'x', updatedAt: 'x', settledAt: null };
const data = { ...EMPTY_DATA, picks: [pick] };

describe('mise à jour des matchs suivis', () => {
  it('règle un pronostic quand son match se termine', () => {
    const { picks } = applyMatchUpdates(data, 'FL1', [match(1, 'FINISHED', { home: 2, away: 0 })], 'now');
    expect(picks[0]).toMatchObject({ status: 'won', settledAt: 'now' });
  });
  it('ignore un match d’une autre source qui réutilise le même identifiant', () => {
    const { picks } = applyMatchUpdates(data, 'FL1', [match(999, 'FINISHED', { home: 0, away: 3 })], 'now');
    expect(picks).toHaveLength(0);
  });
  it('ignore les autres compétitions et ne touche pas un statut manuel', () => {
    expect(applyMatchUpdates(data, 'PL', [match(1, 'FINISHED', { home: 2, away: 0 })], 'now').picks).toHaveLength(0);
    const manual = { ...EMPTY_DATA, picks: [{ ...pick, manual: true, status: 'void' as const }] };
    expect(applyMatchUpdates(manual, 'FL1', [match(1, 'FINISHED', { home: 2, away: 0 })], 'now').picks[0].status).toBe('void');
  });
});
