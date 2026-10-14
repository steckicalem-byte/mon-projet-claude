/** Export des données personnelles (fichiers téléchargés par le navigateur). */
import { MARKETS, selectionLabel, STATUS_LABEL } from './markets';
import { competitionByCode } from '@/lib/competitions';
import type { Pick } from './types';

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  // Neutralise les formules (=, +, -, @) à l'ouverture dans un tableur.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function picksToCsv(picks: Pick[]): string {
  const head = ['Date du match', 'Compétition', 'Domicile', 'Extérieur', 'Score', 'Pari', 'Sélection', 'Cote', 'Mise', 'Statut', 'Probabilité modèle', 'Note', 'Créé le'];
  const rows = picks.map((p) => [
    p.match.utcDate.slice(0, 16).replace('T', ' '),
    competitionByCode(p.competition).name,
    p.match.home.name,
    p.match.away.name,
    p.match.score ? `${p.match.score.home}-${p.match.score.away}` : '',
    MARKETS[p.market].label,
    selectionLabel(p.market, p.selection, p.match),
    String(p.odds).replace('.', ','),
    p.stake == null ? '' : String(p.stake).replace('.', ','),
    STATUS_LABEL[p.status],
    p.modelProbability == null ? '' : `${Math.round(p.modelProbability * 100)} %`,
    p.note,
    p.createdAt.slice(0, 10),
  ]);
  // BOM + « ; » : ouverture directe correcte dans Excel en français.
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}
