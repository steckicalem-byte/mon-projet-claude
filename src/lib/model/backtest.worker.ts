/// <reference lib="webworker" />
// Calcul du backtest hors du fil principal : l'interface reste fluide pendant l'évaluation.
import type { Match } from '@/types';
import { runBacktest } from './backtest';

self.onmessage = (event: MessageEvent<Match[]>) => {
  self.postMessage(runBacktest(event.data));
};
