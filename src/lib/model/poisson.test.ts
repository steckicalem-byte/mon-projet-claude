import { describe, expect, it } from 'vitest';
import { generateDemoMatches } from '@/lib/demoData';
import { fitModel, outcomeOf, predict, teamRatings } from './poisson';

const NOW = new Date('2026-10-14T12:00:00Z');
const { matches } = generateDemoMatches(NOW);
const params = fitModel(matches, NOW.getTime());

describe('modèle de Poisson', () => {
  it('donne des probabilités 1/N/2 et une grille de scores qui somment à 1', () => {
    const m = matches.find((x) => x.status !== 'FINISHED')!;
    const p = predict(params, m.home.id, m.away.id);
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 6);
    expect(p.matrix.flat().reduce((s, v) => s + v, 0)).toBeCloseTo(1, 6);
    expect(p.over25).toBeGreaterThan(0);
    expect(p.over25).toBeLessThan(1);
  });

  it("retrouve l'avantage du terrain des données simulées (0,25)", () => {
    expect(params.homeAdv).toBeGreaterThan(0.15);
    expect(params.homeAdv).toBeLessThan(0.35);
  });

  it("classe l'équipe la plus forte de la simulation devant la plus faible", () => {
    const ratings = teamRatings(params, params.teams.keys());
    const ids = ratings.map((r) => r.team.id);
    expect(ids.indexOf(9000)).toBeLessThan(ids.indexOf(9017));
  });

  it("n'utilise que les matchs joués avant la date d'estimation", () => {
    const early = fitModel(matches, Date.UTC(2025, 7, 1));
    expect(early.trainingMatches).toBe(0);
  });

  it("calcule l'issue d'un score", () => {
    expect(outcomeOf({ home: 2, away: 1 })).toBe('H');
    expect(outcomeOf({ home: 1, away: 1 })).toBe('D');
    expect(outcomeOf({ home: 0, away: 3 })).toBe('A');
  });
});
