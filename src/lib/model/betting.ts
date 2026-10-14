/** Outils de comparaison avec les cotes des bookmakers. */

/** Cote « juste » (sans marge) correspondant à une probabilité. */
export function fairOdds(p: number): number {
  return p > 0 ? 1 / p : Infinity;
}

/** Espérance de gain pour 1 € misé : p × cote − 1. */
export function expectedValue(p: number, odds: number): number {
  return p * odds - 1;
}

/** Fraction de bankroll selon Kelly : (p × cote − 1) / (cote − 1), bornée à 0. */
export function kelly(p: number, odds: number): number {
  if (odds <= 1) return 0;
  return Math.max(0, (p * odds - 1) / (odds - 1));
}

/** Marge du bookmaker sur un marché 1/N/2 (somme des probabilités implicites − 1). */
export function bookmakerMargin(odds: number[]): number | null {
  if (odds.some((o) => !(o > 1))) return null;
  return odds.reduce((s, o) => s + 1 / o, 0) - 1;
}
