/**
 * Analyse rédigée automatiquement à partir des statistiques (sans IA ni clé API).
 * Chaque phrase est déduite d'un chiffre du modèle ou des matchs chargés : rien n'est inventé.
 */
import type { Match } from '@/types';
import { outcomeOf, teamRatings, type ModelParams, type Prediction } from './model/poisson';
import { pct, teamForm } from './format';
import { headToHead, perGame, teamSplits } from './teamStats';

export type FactorTone = 'home' | 'away' | 'neutral';

export interface Factor {
  tone: FactorTone;
  text: string;
}

export interface AutoAnalysis {
  headline: string;
  confidence: 'faible' | 'moyenne' | 'élevée';
  summary: string;
  factors: Factor[];
}

const dec = (n: number) => n.toFixed(1).replace('.', ',');
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function buildAutoAnalysis(matches: Match[], match: Match, p: Prediction, model: ModelParams, currentSeason: number): AutoAnalysis {
  const home = match.home.shortName;
  const away = match.away.shortName;
  const factors: Factor[] = [];

  // --- Rapport de force et confiance --------------------------------------------
  const sorted = [
    { key: 'home', p: p.home },
    { key: 'draw', p: p.draw },
    { key: 'away', p: p.away },
  ].sort((a, b) => b.p - a.p);
  const [top, second] = sorted;
  const gap = top.p - second.p;
  const confidence: AutoAnalysis['confidence'] = top.p >= 0.58 && gap >= 0.25 ? 'élevée' : top.p >= 0.45 && gap >= 0.12 ? 'moyenne' : 'faible';
  const fav = top.key === 'home' ? home : top.key === 'away' ? away : null;
  const headline =
    !fav || gap < 0.06 ? `Match très équilibré entre ${home} et ${away}` : confidence === 'élevée' ? `${fav} nettement favori` : confidence === 'moyenne' ? `${fav} légèrement favori` : `Léger avantage à ${fav}`;

  // --- Forces estimées par le modèle ---------------------------------------------
  const ratings = new Map(teamRatings(model, [match.home.id, match.away.id]).map((r) => [r.team.id, r]));
  for (const [side, name] of [['home', home], ['away', away]] as const) {
    const r = ratings.get(match[side].id);
    if (!r) continue;
    if (r.attack >= 1.2) factors.push({ tone: side, text: `${name} a l'une des attaques les plus efficaces (≈ ${dec(r.xgFor)} buts par match face à une équipe moyenne).` });
    if (r.defence <= 0.82) factors.push({ tone: side, text: `${name} a une défense solide (≈ ${dec(r.xgAgainst)} but encaissé par match face à une équipe moyenne).` });
    const other: FactorTone = side === 'home' ? 'away' : 'home';
    if (r.attack <= 0.82) factors.push({ tone: other, text: `${name} peine à marquer (≈ ${dec(r.xgFor)} but par match face à une équipe moyenne).` });
    if (r.defence >= 1.2) factors.push({ tone: other, text: `${name} encaisse beaucoup (≈ ${dec(r.xgAgainst)} buts par match face à une équipe moyenne).` });
  }

  // --- Forme récente (5 derniers matchs dans la compétition) ---------------------
  const form = (id: number) => {
    const f = teamForm(matches, id, match.utcDate);
    return { n: f.length, pts: f.reduce((s, x) => s + (x.result === 'V' ? 3 : x.result === 'N' ? 1 : 0), 0), seq: f.map((x) => x.result).join('') };
  };
  const fh = form(match.home.id);
  const fa = form(match.away.id);
  if (fh.n >= 3 && fa.n >= 3) {
    const ph = fh.pts / fh.n;
    const pa = fa.pts / fa.n;
    if (Math.abs(ph - pa) >= 0.8) {
      const better = ph > pa ? 'home' : 'away';
      const [bn, bf, wn, wf] = better === 'home' ? [home, fh, away, fa] : [away, fa, home, fh];
      factors.push({ tone: better, text: `Meilleure dynamique pour ${bn} (${bf.pts} pts sur ${bf.n} matchs : ${bf.seq}) que pour ${wn} (${wf.pts} pts : ${wf.seq}).` });
    }
  }

  // --- Domicile / extérieur (saison décrite) --------------------------------------
  const sh = teamSplits(matches, match.home.id, currentSeason, match.utcDate);
  const sa = teamSplits(matches, match.away.id, currentSeason, match.utcDate);
  if (sh.home.played >= 3) {
    const rate = sh.home.won / sh.home.played;
    if (rate >= 0.6) factors.push({ tone: 'home', text: `${home} gagne souvent à domicile : ${plural(sh.home.won, 'victoire')} en ${sh.home.played} matchs.` });
    else if (rate <= 0.25) factors.push({ tone: 'away', text: `${home} gagne peu à domicile : ${plural(sh.home.won, 'victoire')} en ${sh.home.played} matchs.` });
  }
  if (sa.away.played >= 3) {
    const rate = sa.away.won / sa.away.played;
    if (rate >= 0.5) factors.push({ tone: 'away', text: `${away} s'impose souvent à l'extérieur : ${plural(sa.away.won, 'victoire')} en ${sa.away.played} matchs.` });
    else if (sa.away.lost / sa.away.played >= 0.6) factors.push({ tone: 'home', text: `${away} perd souvent à l'extérieur : ${plural(sa.away.lost, 'défaite')} en ${sa.away.played} matchs.` });
  }

  // --- Confrontations directes ------------------------------------------------------
  const h2h = headToHead(matches, match.home.id, match.away.id, match.utcDate, 5);
  if (h2h.length >= 2) {
    let wh = 0, wa = 0;
    for (const m of h2h) {
      const o = outcomeOf(m.score!);
      if (o !== 'D') (o === 'H') === (m.home.id === match.home.id) ? wh++ : wa++;
    }
    const tone: FactorTone = wh >= wa + 2 ? 'home' : wa >= wh + 2 ? 'away' : 'neutral';
    factors.push({ tone, text: `Sur les ${h2h.length} dernières confrontations : ${plural(wh, 'victoire')} pour ${home}, ${plural(h2h.length - wh - wa, 'nul')}, ${plural(wa, 'victoire')} pour ${away}.` });
  }

  // --- Avantage du terrain et profil de buts ----------------------------------------
  const homeBoost = Math.exp(model.homeAdv) - 1;
  if (homeBoost > 0.05) factors.push({ tone: 'home', text: `Avantage du terrain : dans cette compétition, les équipes à domicile marquent environ ${pct(homeBoost)} de buts en plus.` });
  const total = p.lambdaHome + p.lambdaAway;
  const avgGoals = (perGame(sh.overall.goalsFor + sh.overall.goalsAgainst, sh.overall.played) + perGame(sa.overall.goalsFor + sa.overall.goalsAgainst, sa.overall.played)) / 2;
  if (total >= 3.1) factors.push({ tone: 'neutral', text: `Match ouvert attendu : ${dec(total)} buts en moyenne selon le modèle (plus de 2,5 buts à ${pct(p.over25)}).` });
  else if (total <= 2.3) factors.push({ tone: 'neutral', text: `Match plutôt fermé attendu : ${dec(total)} buts en moyenne selon le modèle (moins de 2,5 buts à ${pct(1 - p.over25)}).` });
  else if (avgGoals > 0) factors.push({ tone: 'neutral', text: `Matchs de ces équipes cette saison : ${dec(avgGoals)} buts par match en moyenne ; le modèle en attend ${dec(total)}.` });

  const summary =
    `Le modèle donne ${pct(p.home)} de victoire à ${home}, ${pct(p.draw)} de nul et ${pct(p.away)} de victoire à ${away}` +
    (confidence === 'faible' ? ' : aucune issue ne se détache vraiment.' : `. Score le plus probable : ${p.topScores[0].home}-${p.topScores[0].away} (${pct(p.topScores[0].p, 1)} seulement : le score exact reste très incertain).`);

  return { headline, confidence, summary, factors };
}
