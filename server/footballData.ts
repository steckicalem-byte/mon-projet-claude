/**
 * Relais vers l'API football-data.org (v4).
 *
 * La clé API reste côté serveur : le navigateur appelle `/api/football?...`
 * et ce module ajoute l'en-tête `X-Auth-Token`. Seules les ressources utiles
 * à l'application sont autorisées (pas de relais ouvert).
 *
 * Utilisé par la fonction Vercel `api/football.ts` et par le serveur de
 * développement Vite (voir `vite.config.ts`).
 */

const UPSTREAM = 'https://api.football-data.org/v4';

/**
 * Compétitions proposées. Toutes sont dans l'offre gratuite de football-data.org,
 * sauf la Ligue Europa (EL) qui demande une offre payante.
 */
export const ALLOWED_COMPETITIONS = ['CL', 'EL', 'FL1', 'PL', 'PD', 'SA', 'BL1', 'DED', 'PPL', 'ELC', 'BSA'] as const;

export interface ProxyResult {
  status: number;
  body: string;
  headers: Record<string, string>;
}

function json(status: number, data: unknown, extra: Record<string, string> = {}): ProxyResult {
  return { status, body: JSON.stringify(data), headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra } };
}

export async function proxyFootballData(url: URL, apiKey: string | undefined): Promise<ProxyResult> {
  if (!apiKey) {
    return json(503, { error: 'NO_API_KEY', message: "Aucune clé FOOTBALL_DATA_API_KEY n'est configurée sur le serveur." });
  }

  const competition = (url.searchParams.get('competition') ?? '').toUpperCase();
  if (!(ALLOWED_COMPETITIONS as readonly string[]).includes(competition)) {
    return json(400, { error: 'BAD_COMPETITION', message: `Compétition inconnue : ${competition || '(vide)'}` });
  }
  const season = url.searchParams.get('season');
  if (season != null && !/^\d{4}$/.test(season)) {
    return json(400, { error: 'BAD_SEASON', message: 'La saison doit être une année sur 4 chiffres.' });
  }

  const upstream = new URL(`${UPSTREAM}/competitions/${competition}/matches`);
  if (season) upstream.searchParams.set('season', season);

  let res: Response;
  try {
    res = await fetch(upstream, { headers: { 'X-Auth-Token': apiKey } });
  } catch {
    return json(502, { error: 'UPSTREAM_UNREACHABLE', message: 'football-data.org est injoignable.' });
  }

  const body = await res.text();
  if (!res.ok) {
    let message = `football-data.org a répondu ${res.status}.`;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* corps non JSON */
    }
    if (res.status === 403) {
      message = `Votre offre football-data.org ne donne pas accès à cette compétition (${competition}). La Ligue Europa, notamment, n'est pas dans l'offre gratuite.`;
    }
    return json(res.status, { error: 'UPSTREAM_ERROR', message });
  }

  // Le cache partagé (CDN) limite les appels : l'offre gratuite autorise 10 requêtes/minute.
  return {
    status: 200,
    body,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  };
}
