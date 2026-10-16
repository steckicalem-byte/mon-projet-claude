import { describe, expect, it } from 'vitest';
import { bookmakerMargin, expectedValue, fairOdds, kelly } from './betting';

describe('outils de paris', () => {
  it('calcule la cote juste et l’espérance', () => {
    expect(fairOdds(0.5)).toBe(2);
    expect(expectedValue(0.5, 2.2)).toBeCloseTo(0.1);
    expect(expectedValue(0.5, 1.8)).toBeCloseTo(-0.1);
  });

  it('ne conseille jamais de mise négative (Kelly)', () => {
    expect(kelly(0.5, 2.2)).toBeCloseTo(0.1 / 1.2);
    expect(kelly(0.4, 2)).toBe(0);
    expect(kelly(0.9, 1)).toBe(0);
  });

  it('calcule la marge du bookmaker', () => {
    expect(bookmakerMargin([2, 3.5, 4])).toBeCloseTo(1 / 2 + 1 / 3.5 + 1 / 4 - 1);
    expect(bookmakerMargin([2, 0, 4])).toBeNull();
  });
});
