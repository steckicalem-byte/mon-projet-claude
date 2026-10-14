import type { Competition } from '@/types';

/** Championnats de l'offre gratuite de football-data.org (doit correspondre à `server/footballData.ts`). */
export const COMPETITIONS: Competition[] = [
  { code: 'FL1', name: 'Ligue 1', country: 'France' },
  { code: 'PL', name: 'Premier League', country: 'Angleterre' },
  { code: 'PD', name: 'LaLiga', country: 'Espagne' },
  { code: 'SA', name: 'Serie A', country: 'Italie' },
  { code: 'BL1', name: 'Bundesliga', country: 'Allemagne' },
  { code: 'DED', name: 'Eredivisie', country: 'Pays-Bas' },
  { code: 'PPL', name: 'Primeira Liga', country: 'Portugal' },
  { code: 'ELC', name: 'Championship', country: 'Angleterre' },
  { code: 'BSA', name: 'Brasileirão', country: 'Brésil' },
];

export function competitionByCode(code: string): Competition {
  return COMPETITIONS.find((c) => c.code === code) ?? COMPETITIONS[0];
}
