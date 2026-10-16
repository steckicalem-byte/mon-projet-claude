/** Types de paris, libellés, probabilité du modèle et règlement automatique. */
import type { Match } from '@/types';
import type { Prediction } from '@/lib/model/poisson';
import type { MarketKey, PickStatus } from './types';

interface MarketDef {
  label: string;
  selections: Array<{ key: string; label: (m: Match) => string }>;
}

export const MARKETS: Record<MarketKey, MarketDef> = {
  '1X2': {
    label: 'Résultat (1N2)',
    selections: [
      { key: '1', label: (m) => `1 · ${m.home.shortName}` },
      { key: 'X', label: () => 'N · Match nul' },
      { key: '2', label: (m) => `2 · ${m.away.shortName}` },
    ],
  },
  DC: {
    label: 'Double chance',
    selections: [
      { key: '1X', label: (m) => `1N · ${m.home.shortName} ou nul` },
      { key: 'X2', label: (m) => `N2 · nul ou ${m.away.shortName}` },
      { key: '12', label: () => '12 · pas de nul' },
    ],
  },
  OU15: { label: 'Plus/moins 1,5 buts', selections: [{ key: 'OVER', label: () => 'Plus de 1,5' }, { key: 'UNDER', label: () => 'Moins de 1,5' }] },
  OU25: { label: 'Plus/moins 2,5 buts', selections: [{ key: 'OVER', label: () => 'Plus de 2,5' }, { key: 'UNDER', label: () => 'Moins de 2,5' }] },
  OU35: { label: 'Plus/moins 3,5 buts', selections: [{ key: 'OVER', label: () => 'Plus de 3,5' }, { key: 'UNDER', label: () => 'Moins de 3,5' }] },
  BTTS: { label: 'Les deux équipes marquent', selections: [{ key: 'YES', label: () => 'Oui' }, { key: 'NO', label: () => 'Non' }] },
};

export function selectionLabel(market: MarketKey, selection: string, match: Match): string {
  return MARKETS[market].selections.find((s) => s.key === selection)?.label(match) ?? selection;
}

/** Probabilité estimée par le modèle pour une sélection. */
export function modelProbability(p: Prediction, market: MarketKey, selection: string): number | null {
  const ou = (over: number) => (selection === 'OVER' ? over : 1 - over);
  switch (market) {
    case '1X2':
      return selection === '1' ? p.home : selection === 'X' ? p.draw : selection === '2' ? p.away : null;
    case 'DC':
      return selection === '1X' ? p.home + p.draw : selection === 'X2' ? p.draw + p.away : selection === '12' ? p.home + p.away : null;
    case 'OU15':
      return ou(p.over15);
    case 'OU25':
      return ou(p.over25);
    case 'OU35':
      return ou(p.over35);
    case 'BTTS':
      return selection === 'YES' ? p.btts : 1 - p.btts;
  }
}

/** Résultat d'une sélection d'après le statut et le score (90 minutes) du match. */
export function settle(match: Match, market: MarketKey, selection: string): PickStatus {
  if (match.status === 'CANCELLED') return 'void';
  if (match.status !== 'FINISHED' || !match.score) return 'pending';
  const { home, away } = match.score;
  const total = home + away;
  const result = home > away ? '1' : home < away ? '2' : 'X';
  let won: boolean;
  switch (market) {
    case '1X2':
      won = selection === result;
      break;
    case 'DC':
      won = selection.includes(result);
      break;
    case 'OU15':
    case 'OU25':
    case 'OU35': {
      const line = market === 'OU15' ? 1.5 : market === 'OU25' ? 2.5 : 3.5;
      won = selection === 'OVER' ? total > line : total < line;
      break;
    }
    case 'BTTS':
      won = (home > 0 && away > 0) === (selection === 'YES');
      break;
  }
  return won ? 'won' : 'lost';
}

export const STATUS_LABEL: Record<PickStatus, string> = { pending: 'En attente', won: 'Gagné', lost: 'Perdu', void: 'Annulé' };
