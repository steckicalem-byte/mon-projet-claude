/** Client de l'analyse IA (`/api/analyse`), avec cache local pour éviter de repayer une analyse. */
import type { AiAnalysis } from '../../server/analysis';
import { readJSON, writeJSON } from './storage';

export type { AiAnalysis };

const TTL_MS = 6 * 3_600_000;

export function cachedAnalysis(matchId: number): AiAnalysis | null {
  const a = readJSON<AiAnalysis | null>(`analysis:${matchId}`, null);
  return a && Date.now() - Date.parse(a.generatedAt) < TTL_MS ? a : null;
}

export async function requestAnalysis(competition: string, matchId: number): Promise<AiAnalysis> {
  let res: Response;
  try {
    res = await fetch(`/api/analyse?competition=${encodeURIComponent(competition)}&match=${matchId}`);
  } catch {
    throw new Error('Serveur injoignable.');
  }
  if (!(res.headers.get('content-type') ?? '').includes('json')) {
    throw new Error(res.status === 504 ? "L'analyse a pris trop de temps, réessayez." : `L'analyse IA n'est pas disponible sur cet hébergement (erreur ${res.status}).`);
  }
  const body = (await res.json()) as AiAnalysis & { message?: string };
  if (!res.ok) throw new Error(body.message ?? `Erreur ${res.status}`);
  writeJSON(`analysis:${matchId}`, body);
  return body;
}
