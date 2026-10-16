import { describe, expect, it } from 'vitest';
import { parsePrediction } from './gemini';

const ok = '{"home_win":45,"draw":27,"away_win":28,"predicted_home_goals":2,"predicted_away_goals":1,"confidence":"moyenne","summary":"Texte.","key_factors":["a","b"]}';

describe('parsePrediction (réponses Gemini)', () => {
  it('lit un JSON, même entouré de texte ou de ```', () => {
    expect(parsePrediction(ok)?.home_win).toBe(45);
    expect(parsePrediction('Voici :\n```json\n' + ok + '\n```')?.predicted_home_goals).toBe(2);
  });

  it('rejette une réponse incomplète ou invalide', () => {
    expect(parsePrediction('pas de json')).toBeNull();
    expect(parsePrediction('{"home_win":0.5}')).toBeNull();
    expect(parsePrediction(ok.replace('45', '-1'))).toBeNull();
  });

  it('remplace une confiance inconnue par « moyenne »', () => {
    expect(parsePrediction(ok.replace('"moyenne"', '"haute"'))?.confidence).toBe('moyenne');
  });
});
