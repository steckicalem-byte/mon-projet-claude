/**
 * Modèle de pronostic : régression de Poisson de type Dixon-Coles.
 *
 * Pour un match entre l'équipe à domicile i et l'équipe à l'extérieur j :
 *   buts domicile  ~ Poisson(λ = exp(μ + h + attaque_i − défense_j))
 *   buts extérieur ~ Poisson(μ' = exp(μ + attaque_j − défense_i))
 * avec la correction de Dixon & Coles (1997) sur les petits scores (0-0, 1-0, 0-1, 1-1).
 *
 * Les paramètres sont estimés par maximum de vraisemblance pondéré :
 *  - les matchs anciens comptent moins (demi-vie en jours) ;
 *  - un a priori gaussien ramène les équipes peu observées vers la moyenne,
 *    un peu en dessous pour les promus (absents de la saison précédente).
 */
import type { Match, Outcome, Team } from '@/types';

export interface FitOptions {
  halfLifeDays: number;
  /** Écart-type de l'a priori sur attaque/défense (échelle log). */
  priorSd: number;
  /** Décalage de l'a priori pour les promus (échelle log, négatif = plus faible). */
  newcomerPrior: number;
  iterations: number;
}

export const DEFAULT_FIT: FitOptions = { halfLifeDays: 180, priorSd: 0.3, newcomerPrior: -0.15, iterations: 60 };

export interface ModelParams {
  mu: number;
  homeAdv: number;
  rho: number;
  attack: Map<number, number>;
  defence: Map<number, number>;
  prior: Map<number, number>;
  teams: Map<number, Team>;
  /** Somme des poids des matchs d'entraînement (≈ nombre de matchs « récents »). */
  effectiveMatches: number;
  trainingMatches: number;
}

const DAY = 86_400_000;
const MAX_GOALS = 10;

interface Row {
  i: number;
  j: number;
  x: number;
  y: number;
  w: number;
}

export function isFinished(m: Match): m is Match & { score: { home: number; away: number } } {
  return m.status === 'FINISHED' && m.score != null;
}

/** Équipes de la dernière saison observée absentes de la saison précédente. */
function newcomers(training: Match[]): Set<number> {
  const bySeason = new Map<number, Set<number>>();
  for (const m of training) {
    const s = bySeason.get(m.season) ?? new Set<number>();
    s.add(m.home.id).add(m.away.id);
    bySeason.set(m.season, s);
  }
  const seasons = [...bySeason.keys()].sort((a, b) => b - a);
  const out = new Set<number>();
  if (seasons.length < 2) return out;
  const prev = bySeason.get(seasons[0] - 1);
  if (!prev) return out;
  for (const id of bySeason.get(seasons[0])!) if (!prev.has(id)) out.add(id);
  return out;
}

/**
 * Estime le modèle à partir des matchs terminés avant `asOf`.
 * `warm` permet de repartir de paramètres précédents (backtest plus rapide).
 */
export function fitModel(matches: Match[], asOf: number, options: Partial<FitOptions> = {}, warm?: ModelParams): ModelParams {
  const opt = { ...DEFAULT_FIT, ...options };
  const training = matches.filter((m) => isFinished(m) && Date.parse(m.utcDate) < asOf);
  const teams = new Map<number, Team>();
  for (const m of matches) {
    teams.set(m.home.id, m.home);
    teams.set(m.away.id, m.away);
  }

  const fresh = newcomers(training);
  const prior = new Map<number, number>();
  for (const id of teams.keys()) prior.set(id, fresh.has(id) ? opt.newcomerPrior : 0);

  const lnHalf = Math.LN2 / opt.halfLifeDays;
  const rows: Row[] = training.map((m) => ({
    i: m.home.id,
    j: m.away.id,
    x: m.score!.home,
    y: m.score!.away,
    w: Math.exp((-lnHalf * (asOf - Date.parse(m.utcDate))) / DAY),
  }));
  const totalW = rows.reduce((s, r) => s + r.w, 0);

  const attack = new Map<number, number>();
  const defence = new Map<number, number>();
  for (const id of teams.keys()) {
    attack.set(id, warm?.attack.get(id) ?? prior.get(id)!);
    defence.set(id, warm?.defence.get(id) ?? prior.get(id)!);
  }

  let mu = warm?.mu ?? Math.log(1.35);
  let homeAdv = warm?.homeAdv ?? 0.25;
  if (rows.length) {
    const goals = rows.reduce((s, r) => s + r.w * (r.x + r.y), 0) / (2 * totalW);
    if (!warm && goals > 0) mu = Math.log(goals);
  }

  const invVar = 1 / (opt.priorSd * opt.priorSd);
  const lambdas = (r: Row) => [
    Math.exp(mu + homeAdv + attack.get(r.i)! - defence.get(r.j)!),
    Math.exp(mu + attack.get(r.j)! - defence.get(r.i)!),
  ];

  for (let it = 0; it < opt.iterations && rows.length; it++) {
    // 1. Niveau global et avantage du terrain.
    let gMu = 0, hMu = 0, gH = 0, hH = 0;
    for (const r of rows) {
      const [lh, la] = lambdas(r);
      gMu += r.w * (r.x - lh + r.y - la);
      hMu += r.w * (lh + la);
      gH += r.w * (r.x - lh);
      hH += r.w * lh;
    }
    // Pas de Newton conjoint sur (μ, h) : système 2×2 résolu par complément de Schur.
    const dH = (gH - gMu * (hH / hMu)) / Math.max(hH * (1 - hH / hMu), 1e-9);
    homeAdv += dH;
    mu += (gMu - hH * dH) / hMu;

    // 2. Attaques puis 3. défenses (mises à jour de Newton par bloc, a priori gaussien).
    for (const block of ['attack', 'defence'] as const) {
      const grad = new Map<number, number>();
      const hess = new Map<number, number>();
      const add = (id: number, g: number, h: number) => {
        grad.set(id, (grad.get(id) ?? 0) + g);
        hess.set(id, (hess.get(id) ?? 0) + h);
      };
      for (const r of rows) {
        const [lh, la] = lambdas(r);
        if (block === 'attack') {
          add(r.i, r.w * (r.x - lh), r.w * lh);
          add(r.j, r.w * (r.y - la), r.w * la);
        } else {
          add(r.j, -r.w * (r.x - lh), r.w * lh);
          add(r.i, -r.w * (r.y - la), r.w * la);
        }
      }
      const target = block === 'attack' ? attack : defence;
      for (const id of teams.keys()) {
        const v = target.get(id)!;
        const g = (grad.get(id) ?? 0) - (v - prior.get(id)!) * invVar;
        const h = (hess.get(id) ?? 0) + invVar;
        target.set(id, v + g / h);
      }
    }
  }

  // Correction Dixon-Coles : ρ choisi par recherche sur grille.
  let rho = 0;
  if (rows.length) {
    let best = -Infinity;
    for (let k = -25; k <= 15; k++) {
      const cand = k / 100;
      let ll = 0;
      let valid = true;
      for (const r of rows) {
        if (r.x > 1 || r.y > 1) continue;
        const [lh, la] = lambdas(r);
        const t = tau(r.x, r.y, lh, la, cand);
        if (t <= 0) {
          valid = false;
          break;
        }
        ll += r.w * Math.log(t);
      }
      if (valid && ll > best) {
        best = ll;
        rho = cand;
      }
    }
  }

  return { mu, homeAdv, rho, attack, defence, prior, teams, effectiveMatches: totalW, trainingMatches: rows.length };
}

function tau(x: number, y: number, lh: number, la: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lh * la * rho;
  if (x === 0 && y === 1) return 1 + lh * rho;
  if (x === 1 && y === 0) return 1 + la * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

function poissonPmf(lambda: number, max: number): number[] {
  const out = [Math.exp(-lambda)];
  for (let k = 1; k <= max; k++) out.push((out[k - 1] * lambda) / k);
  return out;
}

export interface Prediction {
  lambdaHome: number;
  lambdaAway: number;
  /** matrix[x][y] = P(score x-y), normalisée. */
  matrix: number[][];
  home: number;
  draw: number;
  away: number;
  over15: number;
  over25: number;
  over35: number;
  btts: number;
  topScores: Array<{ home: number; away: number; p: number }>;
  pick: Outcome;
}

export function predict(params: ModelParams, homeId: number, awayId: number): Prediction {
  const a = (id: number) => params.attack.get(id) ?? params.prior.get(id) ?? DEFAULT_FIT.newcomerPrior;
  const d = (id: number) => params.defence.get(id) ?? params.prior.get(id) ?? DEFAULT_FIT.newcomerPrior;
  const lambdaHome = Math.exp(params.mu + params.homeAdv + a(homeId) - d(awayId));
  const lambdaAway = Math.exp(params.mu + a(awayId) - d(homeId));
  const ph = poissonPmf(lambdaHome, MAX_GOALS);
  const pa = poissonPmf(lambdaAway, MAX_GOALS);

  const matrix: number[][] = [];
  let total = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    matrix.push([]);
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = Math.max(0, ph[x] * pa[y] * tau(x, y, lambdaHome, lambdaAway, params.rho));
      matrix[x].push(p);
      total += p;
    }
  }

  let home = 0, draw = 0, away = 0, over15 = 0, over25 = 0, over35 = 0, btts = 0;
  const scores: Prediction['topScores'] = [];
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = (matrix[x][y] /= total);
      if (x > y) home += p;
      else if (x === y) draw += p;
      else away += p;
      if (x + y > 1.5) over15 += p;
      if (x + y > 2.5) over25 += p;
      if (x + y > 3.5) over35 += p;
      if (x > 0 && y > 0) btts += p;
      scores.push({ home: x, away: y, p });
    }
  }
  scores.sort((s, t) => t.p - s.p);
  const pick: Outcome = home >= draw && home >= away ? 'H' : away >= draw ? 'A' : 'D';
  return { lambdaHome, lambdaAway, matrix, home, draw, away, over15, over25, over35, btts, topScores: scores.slice(0, 5), pick };
}

export interface TeamRating {
  team: Team;
  /** Multiplicateur de buts marqués vs une équipe moyenne (>1 = meilleure attaque). */
  attack: number;
  /** Multiplicateur de buts encaissés vs une équipe moyenne (<1 = meilleure défense). */
  defence: number;
  /** Buts marqués / encaissés attendus contre une équipe moyenne, terrain neutre. */
  xgFor: number;
  xgAgainst: number;
}

export function teamRatings(params: ModelParams, teamIds: Iterable<number>): TeamRating[] {
  const neutral = params.mu + params.homeAdv / 2;
  const out: TeamRating[] = [];
  for (const id of teamIds) {
    const team = params.teams.get(id);
    if (!team) continue;
    const a = params.attack.get(id) ?? 0;
    const d = params.defence.get(id) ?? 0;
    out.push({ team, attack: Math.exp(a), defence: Math.exp(-d), xgFor: Math.exp(neutral + a), xgAgainst: Math.exp(neutral - d) });
  }
  return out.sort((x, y) => y.xgFor - y.xgAgainst - (x.xgFor - x.xgAgainst));
}

export function outcomeOf(score: { home: number; away: number }): Outcome {
  return score.home > score.away ? 'H' : score.home < score.away ? 'A' : 'D';
}
