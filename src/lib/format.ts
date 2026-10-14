import type { Match, Outcome } from '@/types';
import { outcomeOf } from './model/poisson';

export const pct = (p: number, digits = 0) => `${(p * 100).toFixed(digits).replace('.', ',')} %`;
export const num = (n: number, digits = 2) => (Number.isFinite(n) ? n.toFixed(digits).replace('.', ',') : '—');
export const euros = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

export const OUTCOME_LABEL: Record<Outcome, string> = { H: '1', D: 'N', A: '2' };

export type FormResult = 'V' | 'N' | 'D';

/** Derniers résultats d'une équipe (du plus ancien au plus récent). */
export function teamForm(matches: Match[], teamId: number, before: string, count = 5): Array<{ match: Match; result: FormResult }> {
  return matches
    .filter((m) => m.status === 'FINISHED' && m.score && m.utcDate < before && (m.home.id === teamId || m.away.id === teamId))
    .slice(-count)
    .map((match) => {
      const o = outcomeOf(match.score!);
      const home = match.home.id === teamId;
      const result: FormResult = o === 'D' ? 'N' : (o === 'H') === home ? 'V' : 'D';
      return { match, result };
    });
}

export function parseOdds(s: string): number | undefined {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n > 1 ? n : undefined;
}
