/**
 * Jeu de données de démonstration, utilisé quand aucune clé API n'est configurée.
 * Équipes FICTIVES, résultats simulés : ces données ne doivent jamais servir à parier.
 * La génération est déterministe (graine fixe) et calée sur la date du jour pour
 * toujours afficher une saison en cours avec des matchs à venir.
 */
import type { Match, Team } from '@/types';

const NAMES = [
  ['Olympique Montval', 'Montval', 'OMV'],
  ['FC Rivière', 'Rivière', 'FCR'],
  ['AS Belcourt', 'Belcourt', 'ASB'],
  ['Stade Aubrac', 'Aubrac', 'STA'],
  ['Racing Port-Lys', 'Port-Lys', 'RPL'],
  ['US Calanques', 'Calanques', 'USC'],
  ['SC Hautes-Fagnes', 'Hautes-Fagnes', 'SCH'],
  ['FC Val-d’Orge', 'Val-d’Orge', 'VDO'],
  ['AC Mirandol', 'Mirandol', 'ACM'],
  ['Girondins de Saint-Brice', 'Saint-Brice', 'GSB'],
  ['Athletic Corbières', 'Corbières', 'ATC'],
  ['RC Lanvaux', 'Lanvaux', 'RCL'],
  ['FC Estérel', 'Estérel', 'FCE'],
  ['Union Pierrefeu', 'Pierrefeu', 'UPF'],
  ['Dynamo Vercors', 'Vercors', 'DYV'],
  ['Stade Morvan', 'Morvan', 'STM'],
  ['AS Côte-Vermeille', 'Côte-Vermeille', 'ACV'],
  ['FC Nordmarais', 'Nordmarais', 'FCN'],
  // Promus de la saison en cours (remplacent les 2 derniers de l'an dernier).
  ['Entente Causses', 'Causses', 'ENC'],
  ['FC Bocage', 'Bocage', 'FCB'],
] as const;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(lambda: number, r: () => number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > l);
  return k - 1;
}

/** Calendrier aller-retour (méthode du cercle). */
function roundRobin(ids: number[]): Array<Array<[number, number]>> {
  const n = ids.length;
  const list = [...ids];
  const rounds: Array<Array<[number, number]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const round: Array<[number, number]> = [];
    for (let k = 0; k < n / 2; k++) {
      const a = list[k];
      const b = list[n - 1 - k];
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    list.splice(1, 0, list.pop()!);
  }
  return [...rounds, ...rounds.map((round) => round.map(([a, b]) => [b, a] as [number, number]))];
}

export function generateDemoMatches(now = new Date()): { matches: Match[]; currentSeason: number } {
  const r = rng(20261014);
  const teams: Team[] = NAMES.map(([name, shortName, tla], i) => ({ id: 9000 + i, name, shortName, tla }));
  const strength = new Map(teams.map((t, i) => [t.id, { att: 0.35 - i * 0.035 + (r() - 0.5) * 0.1, def: 0.3 - i * 0.03 + (r() - 0.5) * 0.1 }]));

  const currentSeason = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const seasons = [
    { year: currentSeason - 1, ids: teams.slice(0, 18).map((t) => t.id) },
    { year: currentSeason, ids: [...teams.slice(0, 16), ...teams.slice(18)].map((t) => t.id) },
  ];

  const byId = new Map(teams.map((t) => [t.id, t]));
  const matches: Match[] = [];
  // Identifiants très élevés : jamais confondus avec ceux de football-data.org.
  let nextId = 900_000_001;
  for (const { year, ids } of seasons) {
    const start = Date.UTC(year, 7, 9, 19); // ~9 août, 19h UTC
    roundRobin(ids).forEach((round, md) => {
      round.forEach(([h, a], k) => {
        const kickoff = start + md * 7 * 86_400_000 + (k % 3) * 86_400_000 + (k % 2) * 2 * 3_600_000;
        const finished = kickoff + 2 * 3_600_000 < now.getTime();
        const sh = strength.get(h)!;
        const sa = strength.get(a)!;
        const score = finished
          ? { home: poisson(Math.exp(0.28 + 0.25 + sh.att - sa.def), r), away: poisson(Math.exp(0.28 + sa.att - sh.def), r) }
          : null;
        matches.push({
          id: nextId++,
          utcDate: new Date(kickoff).toISOString().replace('.000', ''),
          status: finished ? 'FINISHED' : 'TIMED',
          matchday: md + 1,
          season: year,
          home: byId.get(h)!,
          away: byId.get(a)!,
          score,
        });
      });
    });
  }
  return { matches: matches.sort((a, b) => a.utcDate.localeCompare(b.utcDate)), currentSeason };
}
