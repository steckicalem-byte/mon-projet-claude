/**
 * Analyse d'un match par Gemini (API Google Generative Language, REST).
 *
 * - Essaie d'abord avec la recherche Google intégrée (actualité, blessures) ;
 *   si le quota de recherche est épuisé (fréquent sur l'offre gratuite),
 *   refait l'analyse sans recherche, à partir des seules statistiques.
 * - Si un modèle est saturé (503) ou indisponible (404), passe au suivant.
 */
import { json, SYSTEM_BASE, type ProviderResult, type SubmitInput } from './analysis.js';
import type { ProxyResult } from './footballData.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
/**
 * Ordre d'essai : le plus rapide et disponible d'abord (mesuré : ~4 s), puis des modèles
 * plus récents mais souvent saturés, et enfin les versions « lite », moins chargées.
 * GEMINI_MODEL permet d'en imposer un en premier.
 */
const DEFAULT_MODELS = ['gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
/** Délai par appel et budget total, sous la limite de 120 s de la fonction Vercel. */
const CALL_TIMEOUT_MS = 50_000;
const TOTAL_BUDGET_MS = 100_000;

const JSON_INSTRUCTION = `Réponds uniquement par un objet JSON, sans texte autour, de la forme :
{"home_win": 0.45, "draw": 0.27, "away_win": 0.28, "predicted_home_goals": 2, "predicted_away_goals": 1,
 "confidence": "faible" | "moyenne" | "élevée", "summary": "3 à 6 phrases en français",
 "key_factors": ["trois à six facteurs clés, une phrase courte chacun"]}`;

interface GeminiResponse {
  modelVersion?: string;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
  error?: { message?: string; status?: string };
}

/** Extrait et valide l'objet JSON de la réponse (tolère du texte ou des ``` autour). */
export function parsePrediction(text: string): SubmitInput | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const [h, d, a] = [num(o.home_win), num(o.draw), num(o.away_win)];
  const [gh, ga] = [num(o.predicted_home_goals), num(o.predicted_away_goals)];
  if (h == null || d == null || a == null || gh == null || ga == null || typeof o.summary !== 'string') return null;
  const confidence = (['faible', 'moyenne', 'élevée'] as const).find((c) => c === o.confidence) ?? 'moyenne';
  const factors = Array.isArray(o.key_factors) ? o.key_factors.filter((f): f is string => typeof f === 'string') : [];
  return { home_win: h, draw: d, away_win: a, predicted_home_goals: Math.round(gh), predicted_away_goals: Math.round(ga), confidence, summary: o.summary, key_factors: factors };
}

export async function runGemini(context: string, apiKey: string): Promise<ProviderResult | ProxyResult> {
  const models = [...new Set([process.env.GEMINI_MODEL, ...DEFAULT_MODELS].filter((m): m is string => Boolean(m)))];
  let lastError = 'Gemini est momentanément saturé, réessayez dans quelques minutes.';
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  for (const webSearch of [true, false]) {
    const prompt = webSearch
      ? `${context}\n\n${JSON_INSTRUCTION}`
      : `${context}\n\nTu n'as pas accès à la recherche web pour ce match : appuie-toi sur les statistiques ci-dessus et sur tes connaissances générales des deux équipes, en le signalant dans le résumé.\n\n${JSON_INSTRUCTION}`;
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_BASE }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // Recherche Google intégrée (souvent hors quota sur l'offre gratuite).
      ...(webSearch ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: {
        // Réflexion courte : l'analyse reste rapide (le niveau par défaut peut dépasser 2 minutes).
        thinkingConfig: { thinkingLevel: 'low' },
        // JSON imposé seulement sans recherche (incompatible avec l'outil). Pas de responseSchema :
        // mesuré, il fait dépasser 70 s à gemini-3-flash-preview ; parsePrediction valide les champs.
        ...(webSearch ? {} : { responseMimeType: 'application/json' }),
      },
    };

    for (const model of models) {
      const remaining = deadline - Date.now();
      if (remaining < 5_000) return json(504, { error: 'GEMINI_TIMEOUT', message: 'Gemini est trop lent en ce moment, réessayez dans quelques minutes.' });
      let res: Response;
      try {
        res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(CALL_TIMEOUT_MS, remaining)),
        });
      } catch (e) {
        lastError = (e as Error).name === 'TimeoutError' ? 'Gemini est trop lent en ce moment, réessayez dans quelques minutes.' : "L'API Gemini est injoignable.";
        continue;
      }
      const data = (await res.json().catch(() => ({}))) as GeminiResponse;

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        // Clé refusée (API_KEY_INVALID, PERMISSION_DENIED…) : inutile d'essayer d'autres modèles.
        if (/api key|permission|unauthenticated/i.test(data.error?.message ?? '') || res.status !== 400) {
          return json(502, { error: 'GEMINI_AUTH', message: `Clé GEMINI_API_KEY refusée par Google : ${data.error?.message ?? res.status}` });
        }
        lastError = `Requête refusée par Gemini (${model}) : ${data.error?.message ?? res.status}`;
        continue;
      }
      if (res.status === 429 && webSearch) break; // quota de recherche épuisé → passe en mode sans recherche
      if (!res.ok) {
        lastError = res.status === 429 ? 'Quota Gemini atteint, réessayez plus tard.' : lastError;
        continue; // 404 (modèle retiré), 429, 5xx (saturé) → modèle suivant
      }

      const candidate = data.candidates?.[0];
      const text = (candidate?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? '').join('');
      const input = parsePrediction(text);
      if (!input) {
        lastError = "Gemini n'a pas rendu de pronostic exploitable, réessayez.";
        continue;
      }
      const sources: ProviderResult['sources'] = [];
      for (const chunk of candidate?.groundingMetadata?.groundingChunks ?? []) {
        const uri = chunk.web?.uri;
        if (uri && sources.length < 6 && !sources.some((s) => s.url === uri)) sources.push({ title: chunk.web?.title ?? new URL(uri).hostname, url: uri });
      }
      return { input, sources, model: data.modelVersion ?? model, webSearch };
    }
  }
  return json(503, { error: 'GEMINI_UNAVAILABLE', message: lastError });
}
