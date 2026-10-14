import type { AIProvider, StudyTask } from './types';

/**
 * Fournisseur de DÉMONSTRATION.
 *
 * Il n'utilise aucune intelligence artificielle et ne contacte aucun serveur :
 * les résumés, fiches et quiz sont produits par de simples règles
 * d'extraction de texte (fréquence des mots, découpage en phrases).
 * Les réponses sont toujours signalées comme telles à l'utilisateur.
 */

const STOPWORDS = new Set(
  (
    "a à au aux avec ce ces cet cette ceci cela ça dans de des du elle elles en et est être été eu il ils je la le les leur leurs lui ma mais me même mes moi mon ne ni nos notre nous on ou où par pas pour qu que qui sa se ses si son sont sur ta te tes toi ton tu un une vos votre vous y c d j l m n s t qu' l' d' c' n' s' j' m' t' plus moins très tout tous toute toutes aussi comme donc car ainsi alors entre sans sous chez vers depuis avant après encore déjà peut peuvent fait faire font avoir ont a été sera seront était étaient cest dont lorsque quand " +
    'the of and to in is are was were be been for on with as by an at or from that this these those it its not but which'
  )
    .split(/\s+/)
    .filter(Boolean),
);

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Ý0-9«"(])/u)
    .map((s) => s.trim())
    .filter((s) => s.split(' ').length >= 4);
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}][\p{L}'’-]*/gu) ?? [])
    .map((w) => w.replace(/^[a-z]['’]/, ''))
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function keywords(text: string, n: number): string[] {
  const freq = new Map<string, number>();
  for (const w of words(text)) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .filter(([, c]) => c >= 1)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, n)
    .map(([w]) => w);
}

function rankSentences(text: string): Array<{ s: string; i: number; score: number }> {
  const freq = new Map<string, number>();
  for (const w of words(text)) freq.set(w, (freq.get(w) ?? 0) + 1);
  return sentences(text).map((s, i) => {
    const ws = words(s);
    const score = ws.reduce((t, w) => t + (freq.get(w) ?? 0), 0) / Math.max(4, ws.length);
    return { s, i, score };
  });
}

const DEMO_NOTICE = '_Mode démonstration : texte produit par des règles d’extraction locales, sans intelligence artificielle._';

function summary(text: string): string {
  const ranked = rankSentences(text);
  if (ranked.length === 0) return 'Le texte est trop court pour en extraire un résumé. Ajoutez quelques phrases complètes.';
  const n = Math.min(5, Math.max(2, Math.round(ranked.length / 4)));
  const picked = [...ranked].sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i);
  return `## Résumé (phrases clés extraites)\n\n${picked.map((p) => `- ${p.s}`).join('\n')}\n\n**Mots-clés :** ${keywords(text, 6).join(', ')}\n\n${DEMO_NOTICE}`;
}

function flashcards(text: string): string {
  const ranked = rankSentences(text);
  if (ranked.length === 0) return 'Le texte est trop court pour créer une fiche. Ajoutez quelques phrases complètes.';
  const defs = sentences(text).filter((s) => /\s(est|sont|désigne|signifie|correspond)\s|:\s/.test(s)).slice(0, 5);
  const key = [...ranked].sort((a, b) => b.score - a.score).slice(0, 6).sort((a, b) => a.i - b.i);
  let out = `## Fiche de révision\n\n### Notions clés\n${keywords(text, 8).map((k) => `- ${k}`).join('\n')}\n`;
  if (defs.length) out += `\n### Définitions repérées\n${defs.map((d) => `- ${d}`).join('\n')}\n`;
  out += `\n### Points à retenir\n${key.map((k) => `- ${k.s}`).join('\n')}\n\n${DEMO_NOTICE}`;
  return out;
}

function quiz(text: string): string {
  const kws = keywords(text, 15);
  const ranked = [...rankSentences(text)].sort((a, b) => b.score - a.score);
  const questions: Array<{ q: string; a: string }> = [];
  const used = new Set<string>();
  for (const { s } of ranked) {
    if (questions.length >= 5) break;
    const kw = kws.find((k) => !used.has(k) && new RegExp(`(^|[^\\p{L}])${k}([^\\p{L}]|$)`, 'iu').test(s));
    if (!kw) continue;
    used.add(kw);
    const blanked = s.replace(new RegExp(`(^|[^\\p{L}])(${kw})(?=[^\\p{L}]|$)`, 'iu'), '$1_____');
    questions.push({ q: blanked, a: kw });
  }
  if (questions.length === 0) return 'Le texte est trop court pour générer un quiz. Ajoutez quelques phrases complètes.';
  return `## Quiz — complétez les phrases\n\n${questions.map((x, i) => `${i + 1}. ${x.q}`).join('\n')}\n\n### Réponses\n${questions.map((x, i) => `${i + 1}. ${x.a}`).join('\n')}\n\n${DEMO_NOTICE}`;
}

export const demoProvider: AIProvider = {
  id: 'demo',
  label: 'Mode démonstration',
  isDemo: true,
  async chat() {
    return [
      "Je suis en **mode démonstration** : aucune intelligence artificielle n'est connectée, je ne peux donc pas comprendre ni répondre réellement à votre question.",
      '',
      'Ce que vous pouvez déjà faire :',
      '- utiliser les boutons **Résumé**, **Fiche de révision** et **Quiz** sur une de vos notes ou un texte collé (traitement local par règles simples) ;',
      "- configurer une vraie IA : voir la section « Assistant IA » du fichier README (variable `VITE_AI_API_URL`).",
    ].join('\n');
  },
  async generate(task: StudyTask, sourceText: string) {
    if (task === 'summary') return summary(sourceText);
    if (task === 'flashcards') return flashcards(sourceText);
    return quiz(sourceText);
  },
};
