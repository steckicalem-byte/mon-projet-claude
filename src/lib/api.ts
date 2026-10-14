/**
 * Chargement des matchs : API football-data.org via le relais `/api/football`,
 * avec cache local, et repli sur les données de démonstration si l'API n'est pas configurée.
 */
import type { Competition, Dataset, Match } from '@/types';
import { generateDemoMatches } from './demoData';
import { normalizeMatch, type ApiMatch } from './normalize';
import { readJSON, writeJSON } from './storage';

interface ApiResponse {
  matches: ApiMatch[];
}

export { normalizeMatch };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const CACHE_MINUTES = { current: 10, previous: 60 * 24 * 7 };

async function fetchSeason(code: string, season: number | null, ttlMinutes: number, force: boolean): Promise<Match[]> {
  const key = `cache:${code}:${season ?? 'current'}`;
  const cached = readJSON<{ at: number; matches: Match[] } | null>(key, null);
  if (!force && cached && Date.now() - cached.at < ttlMinutes * 60_000) return cached.matches;

  const qs = new URLSearchParams({ competition: code });
  if (season != null) qs.set('season', String(season));
  let res: Response;
  try {
    res = await fetch(`/api/football?${qs}`);
  } catch {
    throw new ApiError('Serveur injoignable.', 'NETWORK', 0);
  }
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('json')) throw new ApiError("Le relais /api/football n'est pas disponible sur cet hébergement.", 'NO_PROXY', res.status);
  const body = (await res.json()) as ApiResponse & { error?: string; message?: string };
  if (!res.ok) throw new ApiError(body.message ?? `Erreur ${res.status}`, body.error ?? 'HTTP', res.status);

  const matches = body.matches.map(normalizeMatch).filter((m): m is Match => m != null);
  writeJSON(key, { at: Date.now(), matches });
  return matches;
}

/** Erreurs signifiant « l'API n'est pas branchée » : on bascule silencieusement en démo. */
const NOT_CONFIGURED = new Set(['NO_API_KEY', 'NO_PROXY', 'NETWORK']);

export async function loadDataset(competition: Competition, force = false): Promise<Dataset & { notice?: string }> {
  if (import.meta.env.MODE !== 'artifact') {
    try {
      const current = await fetchSeason(competition.code, null, CACHE_MINUTES.current, force);
      if (current.length === 0) throw new ApiError('Aucun match renvoyé pour cette compétition.', 'EMPTY', 200);
      const currentSeason = Math.max(...current.map((m) => m.season));
      let previous: Match[] = [];
      let notice: string | undefined;
      try {
        previous = await fetchSeason(competition.code, currentSeason - 1, CACHE_MINUTES.previous, false);
      } catch (e) {
        notice = `Saison précédente indisponible (${(e as Error).message}) : le modèle n'utilise que la saison en cours, ses pronostics sont moins fiables en début de saison.`;
      }
      return {
        competition,
        source: 'api',
        matches: [...previous, ...current].sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
        currentSeason,
        fetchedAt: new Date().toISOString(),
        notice,
      };
    } catch (e) {
      const err = e as ApiError;
      if (!NOT_CONFIGURED.has(err.code)) {
        return { ...demo(competition), notice: `Erreur de l'API football-data.org : ${err.message} — affichage des données de démonstration.` };
      }
    }
  }
  return demo(competition);
}

function demo(competition: Competition): Dataset {
  const { matches, currentSeason } = generateDemoMatches();
  return { competition, source: 'demo', matches, currentSeason, fetchedAt: new Date().toISOString() };
}
