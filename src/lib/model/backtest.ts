/**
 * Évaluation honnête du modèle : chaque match terminé est prédit avec un modèle
 * entraîné uniquement sur les matchs joués AVANT sa date (aucune fuite d'information).
 */
import type { Match, Outcome } from '@/types';
import { fitModel, isFinished, outcomeOf, predict, type ModelParams } from './poisson';

export interface BacktestRecord {
  match: Match;
  probs: Record<Outcome, number>;
  /** Fréquences 1/N/2 observées dans l'historique d'entraînement (référence naïve). */
  baseline: Record<Outcome, number>;
  outcome: Outcome;
  pick: Outcome;
  predictedScore: { home: number; away: number };
}

export interface BacktestSummary {
  records: BacktestRecord[];
  accuracy: number;
  baselineAccuracy: number;
  brier: number;
  baselineBrier: number;
  logLoss: number;
  baselineLogLoss: number;
  exactScore: number;
  calibration: Array<{ bin: string; predicted: number; observed: number; count: number }>;
}

const OUTCOMES: Outcome[] = ['H', 'D', 'A'];

export function runBacktest(matches: Match[], minTraining = 60): BacktestSummary {
  const finished = matches.filter(isFinished).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  const byDay = new Map<string, Match[]>();
  for (const m of finished) {
    const day = m.utcDate.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), m]);
  }

  const records: BacktestRecord[] = [];
  let warm: ModelParams | undefined;
  let seen = 0;
  const counts: Record<Outcome, number> = { H: 0, D: 0, A: 0 };

  for (const [day, games] of byDay) {
    if (seen >= minTraining) {
      const asOf = Date.parse(`${day}T00:00:00Z`);
      warm = fitModel(matches, asOf, { iterations: warm ? 12 : 60 }, warm);
      const baseline = { H: counts.H / seen, D: counts.D / seen, A: counts.A / seen };
      for (const m of games) {
        const p = predict(warm, m.home.id, m.away.id);
        records.push({
          match: m,
          probs: { H: p.home, D: p.draw, A: p.away },
          baseline,
          outcome: outcomeOf(m.score!),
          pick: p.pick,
          predictedScore: p.topScores[0],
        });
      }
    }
    for (const m of games) counts[outcomeOf(m.score!)]++;
    seen += games.length;
  }

  return summarize(records);
}

function summarize(records: BacktestRecord[]): BacktestSummary {
  const n = records.length || 1;
  let acc = 0, bAcc = 0, brier = 0, bBrier = 0, ll = 0, bLl = 0, exact = 0;
  const bins = Array.from({ length: 10 }, () => ({ sumP: 0, hits: 0, count: 0 }));

  for (const r of records) {
    if (r.pick === r.outcome) acc++;
    const bPick = OUTCOMES.reduce((best, o) => (r.baseline[o] > r.baseline[best] ? o : best), 'H' as Outcome);
    if (bPick === r.outcome) bAcc++;
    if (r.predictedScore.home === r.match.score!.home && r.predictedScore.away === r.match.score!.away) exact++;
    for (const o of OUTCOMES) {
      const y = o === r.outcome ? 1 : 0;
      brier += (r.probs[o] - y) ** 2;
      bBrier += (r.baseline[o] - y) ** 2;
      const bin = bins[Math.min(9, Math.floor(r.probs[o] * 10))];
      bin.sumP += r.probs[o];
      bin.hits += y;
      bin.count++;
    }
    ll -= Math.log(Math.max(r.probs[r.outcome], 1e-12));
    bLl -= Math.log(Math.max(r.baseline[r.outcome], 1e-12));
  }

  return {
    records,
    accuracy: acc / n,
    baselineAccuracy: bAcc / n,
    brier: brier / n,
    baselineBrier: bBrier / n,
    logLoss: ll / n,
    baselineLogLoss: bLl / n,
    exactScore: exact / n,
    calibration: bins
      .map((b, i) => ({ bin: `${i * 10}–${i * 10 + 10} %`, predicted: b.count ? b.sumP / b.count : 0, observed: b.count ? b.hits / b.count : 0, count: b.count }))
      .filter((b) => b.count > 0),
  };
}
