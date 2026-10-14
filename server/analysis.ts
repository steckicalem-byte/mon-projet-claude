/**
 * Analyse d'un match par une IA : Claude Opus 5.5 (si ANTHROPIC_API_KEY est définie)
 * ou Gemini (si GEMINI_API_KEY est définie, voir `server/gemini.ts`).
 *
 * Le serveur construit lui-même le contexte à partir de football-data.org
 * (le navigateur n'envoie qu'un identifiant de match) : impossible de détourner
 * l'endpoint pour faire d'autres requêtes à Claude. Claude complète les
 * statistiques par une recherche web (blessures, suspensions, compositions,
 * forme récente) puis rend son pronostic via l'outil `submit_prediction`.
 */
import Anthropic from '@anthropic-ai/sdk';
import { proxyFootballData, ALLOWED_COMPETITIONS, type ProxyResult } from './footballData.js';
import { normalizeMatch, type ApiMatch } from '../src/lib/normalize.js';
import { fitModel, predict } from '../src/lib/model/poisson.js';
import { COMPETITIONS } from '../src/lib/competitions.js';
import type { Match } from '../src/types.js';
import { runGemini } from './gemini.js';

const MODEL = 'claude-opus-5-5';

export interface AiAnalysis {
  matchId: number;
  probabilities: { home: number; draw: number; away: number };
  predictedScore: { home: number; away: number };
  confidence: 'faible' | 'moyenne' | 'élevée';
  summary: string;
  keyFactors: string[];
  sources: Array<{ title: string; url: string }>;
  model: string;
  /** Faux si l'IA n'a pas pu chercher sur le web (quota) : elle n'a que les statistiques. */
  webSearch: boolean;
  generatedAt: string;
}

export function json(status: number, data: unknown, cache = false): ProxyResult {
  return {
    status,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Une analyse réussie est mise en cache 6 h sur le CDN : la même page ouverte
      // plusieurs fois (ou par plusieurs personnes) ne rappelle pas Claude.
      'Cache-Control': cache ? 'public, s-maxage=21600, stale-while-revalidate=3600' : 'no-store',
    },
  };
}

async function seasonMatches(competition: string, season: number | null, apiKey: string): Promise<Match[]> {
  const url = new URL(`http://internal/api/football?competition=${competition}${season ? `&season=${season}` : ''}`);
  const res = await proxyFootballData(url, apiKey);
  if (res.status !== 200) throw new Error((JSON.parse(res.body) as { message?: string }).message ?? `football-data.org : ${res.status}`);
  return (JSON.parse(res.body) as { matches: ApiMatch[] }).matches.map(normalizeMatch).filter((m): m is Match => m != null);
}

const pct = (p: number) => `${Math.round(p * 100)} %`;

function recentResults(matches: Match[], teamId: number, before: string): string {
  const games = matches
    .filter((m) => m.score && m.utcDate < before && (m.home.id === teamId || m.away.id === teamId))
    .slice(-6)
    .map((m) => `${m.utcDate.slice(0, 10)} ${m.home.name} ${m.score!.home}-${m.score!.away} ${m.away.name}`);
  return games.length ? games.map((g) => `  - ${g}`).join('\n') : '  (aucun match dans cette compétition sur la période)';
}

export const SYSTEM_BASE = `Tu es un analyste football professionnel. Tu produis des pronostics honnêtes et calibrés pour une application de pronostics en français.

Méthode :
1. Pars des statistiques fournies (modèle de Poisson Dixon-Coles et résultats récents dans la compétition).
2. Utilise la recherche web pour ce que le modèle ignore : blessures et suspensions, compositions probables, forme récente toutes compétitions confondues, enjeu du match, rotation prévisible, conditions particulières. Privilégie des sources récentes et fiables ; ignore les sites de paris qui vendent des pronostics.
3. Ajuste les probabilités du modèle seulement quand une information le justifie, et dis pourquoi. Reste calibré : le football est très aléatoire, un favori net dépasse rarement 70 %.
Les probabilités portent sur le résultat à la fin du temps réglementaire (90 minutes) et doivent sommer à 1.

Rédige le résumé et les facteurs clés en français, de façon concise et factuelle. N'encourage pas à parier et ne promets aucun gain.`;

const SYSTEM = `${SYSTEM_BASE}

Termine en appelant l'outil submit_prediction (une seule fois).`;

const SUBMIT_TOOL: Anthropic.Beta.BetaTool = {
  name: 'submit_prediction',
  description: "Enregistre le pronostic final du match. À appeler une seule fois, après les recherches, pour terminer l'analyse.",
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      home_win: { type: 'number', description: "Probabilité de victoire de l'équipe à domicile (0 à 1), temps réglementaire." },
      draw: { type: 'number', description: 'Probabilité de match nul (0 à 1), temps réglementaire.' },
      away_win: { type: 'number', description: "Probabilité de victoire de l'équipe à l'extérieur (0 à 1), temps réglementaire." },
      predicted_home_goals: { type: 'integer', description: 'Buts de l’équipe à domicile dans le score le plus probable.' },
      predicted_away_goals: { type: 'integer', description: 'Buts de l’équipe à l’extérieur dans le score le plus probable.' },
      confidence: { type: 'string', enum: ['faible', 'moyenne', 'élevée'], description: 'Confiance dans le pronostic.' },
      summary: { type: 'string', description: 'Analyse en français, 3 à 6 phrases.' },
      key_factors: { type: 'array', items: { type: 'string' }, description: 'Trois à six facteurs clés, une phrase courte chacun, en français.' },
    },
    required: ['home_win', 'draw', 'away_win', 'predicted_home_goals', 'predicted_away_goals', 'confidence', 'summary', 'key_factors'],
    additionalProperties: false,
  },
};

export interface SubmitInput {
  home_win: number;
  draw: number;
  away_win: number;
  predicted_home_goals: number;
  predicted_away_goals: number;
  confidence: AiAnalysis['confidence'];
  summary: string;
  key_factors: string[];
}

export interface AiKeys {
  anthropic?: string;
  gemini?: string;
}

/** Résultat brut d'un fournisseur d'IA, avant normalisation. */
export interface ProviderResult {
  input: SubmitInput;
  sources: AiAnalysis['sources'];
  model: string;
  webSearch: boolean;
}

export async function analyseMatch(url: URL, footballKey: string | undefined, keys: AiKeys): Promise<ProxyResult> {
  // ?check=1 : indique seulement si l'analyse est activée (l'interface masque le bouton sinon).
  if (url.searchParams.has('check')) return json(200, { enabled: Boolean(footballKey && (keys.anthropic || keys.gemini)) });
  if (!keys.anthropic && !keys.gemini) {
    return json(503, { error: 'NO_AI_KEY', message: "Aucune clé d'IA (ANTHROPIC_API_KEY ou GEMINI_API_KEY) n'est configurée sur le serveur." });
  }
  if (!footballKey) return json(503, { error: 'NO_API_KEY', message: "L'analyse IA nécessite les données réelles (clé FOOTBALL_DATA_API_KEY)." });

  const competition = (url.searchParams.get('competition') ?? '').toUpperCase();
  const matchId = Number(url.searchParams.get('match'));
  if (!(ALLOWED_COMPETITIONS as readonly string[]).includes(competition) || !Number.isInteger(matchId) || matchId <= 0) {
    return json(400, { error: 'BAD_REQUEST', message: 'Paramètres competition / match invalides.' });
  }

  let matches: Match[];
  try {
    const current = await seasonMatches(competition, null, footballKey);
    const season = Math.max(...current.map((m) => m.season));
    const previous = await seasonMatches(competition, season - 1, footballKey).catch(() => []);
    matches = [...previous, ...current].sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  } catch (e) {
    return json(502, { error: 'FOOTBALL_DATA', message: (e as Error).message });
  }

  const match = matches.find((m) => m.id === matchId);
  if (!match) return json(404, { error: 'NOT_FOUND', message: 'Match introuvable dans cette compétition.' });

  const kickoff = Date.parse(match.utcDate);
  const params = fitModel(matches, Math.min(Date.now(), kickoff));
  const p = predict(params, match.home.id, match.away.id);
  const competitionName = COMPETITIONS.find((c) => c.code === competition)?.name ?? competition;

  const context = `Match à analyser : ${match.home.name} (domicile) contre ${match.away.name} (extérieur)
Compétition : ${competitionName}${match.matchday ? `, journée ${match.matchday}` : ''}
Coup d'envoi : ${match.utcDate} (UTC)${match.score ? `\nCe match est déjà terminé (${match.score.home}-${match.score.away}) : analyse-le comme s'il n'avait pas encore eu lieu, sans utiliser le résultat.` : ''}
Date du jour : ${new Date().toISOString().slice(0, 10)}

Modèle statistique (Poisson Dixon-Coles sur les matchs de la compétition, saison en cours et précédente) :
- Victoire ${match.home.name} : ${pct(p.home)} · Nul : ${pct(p.draw)} · Victoire ${match.away.name} : ${pct(p.away)}
- Buts attendus : ${p.lambdaHome.toFixed(2)} – ${p.lambdaAway.toFixed(2)} ; score le plus probable ${p.topScores[0].home}-${p.topScores[0].away}
- Plus de 2,5 buts : ${pct(p.over25)} · Les deux équipes marquent : ${pct(p.btts)}

Derniers résultats de ${match.home.name} dans la compétition :
${recentResults(matches, match.home.id, match.utcDate)}
Derniers résultats de ${match.away.name} dans la compétition :
${recentResults(matches, match.away.id, match.utcDate)}`;

  const result = keys.anthropic ? await runClaude(context, keys.anthropic) : await runGemini(context, keys.gemini!);
  if ('status' in result) return result;
  const submitted = result.input;

  const total = submitted.home_win + submitted.draw + submitted.away_win;
  if (!(total > 0)) return json(502, { error: 'BAD_PREDICTION', message: 'Pronostic invalide, réessayez.' });

  const analysis: AiAnalysis = {
    matchId,
    probabilities: { home: submitted.home_win / total, draw: submitted.draw / total, away: submitted.away_win / total },
    predictedScore: { home: submitted.predicted_home_goals, away: submitted.predicted_away_goals },
    confidence: submitted.confidence,
    summary: submitted.summary,
    keyFactors: submitted.key_factors.slice(0, 6),
    sources: result.sources,
    model: result.model,
    webSearch: result.webSearch,
    generatedAt: new Date().toISOString(),
  };
  return json(200, analysis, true);
}

async function runClaude(context: string, apiKey: string): Promise<ProviderResult | ProxyResult> {
  const client = new Anthropic({ apiKey });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: context }];
  let response: Anthropic.Beta.BetaMessage;
  try {
    // pause_turn : la boucle de recherche côté serveur a atteint sa limite, on la relance telle quelle.
    for (let round = 0; ; round++) {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: 'medium' },
        // En cas de refus par les filtres de sécurité, l'API rejoue la requête sur un autre modèle.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }, SUBMIT_TOOL],
        tool_choice: { type: 'auto' },
        messages,
      });
      if (response.stop_reason !== 'pause_turn' || round >= 2) break;
      messages.push({ role: 'assistant', content: response.content });
    }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json(502, { error: 'ANTHROPIC_AUTH', message: 'Clé ANTHROPIC_API_KEY refusée par Anthropic.' });
    if (e instanceof Anthropic.RateLimitError) return json(429, { error: 'ANTHROPIC_RATE_LIMIT', message: 'Trop de demandes à Claude, réessayez dans une minute.' });
    if (e instanceof Anthropic.APIError) return json(502, { error: 'ANTHROPIC_ERROR', message: `Erreur de l'API Anthropic (${e.status ?? '?'}) : ${e.message}` });
    return json(502, { error: 'ANTHROPIC_UNREACHABLE', message: "L'API Anthropic est injoignable." });
  }

  if (response.stop_reason === 'refusal') return json(502, { error: 'REFUSAL', message: "Claude a refusé d'analyser ce match." });

  const sources: AiAnalysis['sources'] = [];
  let submitted = null as SubmitInput | null;
  for (const msg of [...messages.filter((m) => m.role === 'assistant'), { role: 'assistant' as const, content: response.content }]) {
    if (typeof msg.content === 'string') continue;
    for (const block of msg.content) {
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === 'web_search_result' && sources.length < 6 && !sources.some((s) => s.url === r.url)) sources.push({ title: r.title, url: r.url });
        }
      }
      if (block.type === 'tool_use' && block.name === 'submit_prediction') submitted = block.input as SubmitInput;
    }
  }
  if (!submitted) return json(502, { error: 'NO_PREDICTION', message: "Claude n'a pas rendu de pronostic, réessayez." });
  return { input: submitted, sources, model: response.model, webSearch: true };
}
