import type { Match } from '@/types';

/** Version du format des données personnelles (pour les migrations futures). */
export const USER_DATA_VERSION = 1;

export interface Category {
  id: string;
  name: string;
  /** Teinte (0-360) de la pastille. */
  hue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  /** `${competition}:${matchId}` : un seul favori par match (pas de doublon). */
  id: string;
  matchId: number;
  competition: string;
  /** Copie du match, rafraîchie quand la compétition est rechargée (statut, score). */
  match: Match;
  categoryIds: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketKey = '1X2' | 'DC' | 'OU15' | 'OU25' | 'OU35' | 'BTTS';
export type PickStatus = 'pending' | 'won' | 'lost' | 'void';

export interface Pick {
  id: string;
  matchId: number;
  competition: string;
  match: Match;
  market: MarketKey;
  selection: string;
  /** Cote obtenue (décimale). */
  odds: number;
  /** Mise en euros (facultative). */
  stake: number | null;
  /** Probabilité du modèle au moment du pronostic. */
  modelProbability: number | null;
  status: PickStatus;
  /** Statut fixé à la main : le règlement automatique ne le modifie plus. */
  manual: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
}

export interface UserData {
  version: number;
  bookmarks: Bookmark[];
  categories: Category[];
  picks: Pick[];
}

export type ItemKind = 'bookmarks' | 'categories' | 'picks';
export type AnyItem = Bookmark | Category | Pick;

export const EMPTY_DATA: UserData = { version: USER_DATA_VERSION, bookmarks: [], categories: [], picks: [] };

export function bookmarkId(competition: string, matchId: number): string {
  return `${competition}:${matchId}`;
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
