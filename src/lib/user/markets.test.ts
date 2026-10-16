import { describe, expect, it } from 'vitest';
import type { Match } from '@/types';
import { settle } from './markets';

const t = (id: number) => ({ id, name: `T${id}`, shortName: `T${id}`, tla: `T${id}` });
const m = (status: Match['status'], score: Match['score']): Match => ({ id: 1, utcDate: '2026-10-01T19:00:00Z', status, matchday: 1, season: 2026, home: t(1), away: t(2), score });

describe('règlement automatique des pronostics', () => {
  it('reste en attente tant que le match n’est pas terminé', () => {
    expect(settle(m('TIMED', null), '1X2', '1')).toBe('pending');
    expect(settle(m('IN_PLAY', null), 'BTTS', 'YES')).toBe('pending');
    expect(settle(m('POSTPONED', null), '1X2', '1')).toBe('pending');
  });
  it('annule si le match est annulé', () => {
    expect(settle(m('CANCELLED', null), '1X2', '1')).toBe('void');
  });
  it('règle 1N2 et double chance', () => {
    const r = m('FINISHED', { home: 2, away: 1 });
    expect(settle(r, '1X2', '1')).toBe('won');
    expect(settle(r, '1X2', 'X')).toBe('lost');
    expect(settle(r, 'DC', '1X')).toBe('won');
    expect(settle(r, 'DC', 'X2')).toBe('lost');
    expect(settle(m('FINISHED', { home: 1, away: 1 }), 'DC', '12')).toBe('lost');
  });
  it('règle plus/moins de buts et BTTS', () => {
    const r = m('FINISHED', { home: 2, away: 1 });
    expect(settle(r, 'OU25', 'OVER')).toBe('won');
    expect(settle(r, 'OU35', 'UNDER')).toBe('won');
    expect(settle(r, 'OU15', 'UNDER')).toBe('lost');
    expect(settle(r, 'BTTS', 'YES')).toBe('won');
    expect(settle(m('FINISHED', { home: 0, away: 0 }), 'BTTS', 'NO')).toBe('won');
  });
});
