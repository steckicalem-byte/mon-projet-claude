/** Statistiques des pronostics personnels (uniquement à partir des pronostics enregistrés). */
import type { MarketKey, Pick, PickStatus } from './types';

export interface PickStats {
  total: number;
  byStatus: Record<PickStatus, number>;
  /** Taux de réussite sur les pronostics réglés gagnés/perdus (les annulés sont exclus). */
  hitRate: number | null;
  /** Gain net en unités (1 unité misée par pronostic réglé). */
  units: number;
  /** Gain net en euros, sur les pronostics réglés qui ont une mise. */
  profit: number;
  staked: number;
  roi: number | null;
  avgOdds: number | null;
}

/** Date de règlement (ou du match, à défaut) : axe du temps des graphiques. */
export const settledDate = (p: Pick) => p.settledAt ?? p.match.utcDate;

export function unitResult(p: Pick): number {
  return p.status === 'won' ? p.odds - 1 : p.status === 'lost' ? -1 : 0;
}

export function computeStats(picks: Pick[]): PickStats {
  const byStatus: Record<PickStatus, number> = { pending: 0, won: 0, lost: 0, void: 0 };
  let units = 0, profit = 0, staked = 0, oddsSum = 0;
  for (const p of picks) {
    byStatus[p.status]++;
    oddsSum += p.odds;
    if (p.status === 'pending') continue;
    units += unitResult(p);
    if (p.stake != null && p.status !== 'void') {
      staked += p.stake;
      profit += p.status === 'won' ? p.stake * (p.odds - 1) : -p.stake;
    }
  }
  const decided = byStatus.won + byStatus.lost;
  return {
    total: picks.length,
    byStatus,
    hitRate: decided ? byStatus.won / decided : null,
    units,
    profit,
    staked,
    roi: staked ? profit / staked : null,
    avgOdds: picks.length ? oddsSum / picks.length : null,
  };
}

/** Gain cumulé (unités) après chaque pronostic réglé, dans l'ordre chronologique. */
export function cumulativeUnits(picks: Pick[]): Array<{ date: string; units: number; label: string }> {
  let acc = 0;
  return picks
    .filter((p) => p.status !== 'pending')
    .sort((a, b) => settledDate(a).localeCompare(settledDate(b)))
    .map((p) => {
      acc += unitResult(p);
      return { date: settledDate(p), units: Math.round(acc * 100) / 100, label: `${p.match.home.shortName} – ${p.match.away.shortName}` };
    });
}

/** Taux de réussite par type de pari (marchés ayant au moins un pronostic gagné ou perdu). */
export function hitRateByMarket(picks: Pick[]): Array<{ market: MarketKey; won: number; decided: number; rate: number }> {
  const map = new Map<MarketKey, { won: number; decided: number }>();
  for (const p of picks) {
    if (p.status !== 'won' && p.status !== 'lost') continue;
    const m = map.get(p.market) ?? { won: 0, decided: 0 };
    m.decided++;
    if (p.status === 'won') m.won++;
    map.set(p.market, m);
  }
  return [...map].map(([market, v]) => ({ market, ...v, rate: v.won / v.decided })).sort((a, b) => b.decided - a.decided);
}
