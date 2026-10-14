/** Couleur stable dérivée du nom de la matière (lisible en thème clair et sombre). */
const PALETTE = [
  'bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-500/30',
  'bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-500/30',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-cyan-500/30',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30',
  'bg-pink-500/15 text-pink-700 dark:text-pink-300 ring-pink-500/30',
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-500/30',
  'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30',
];

/** Couleurs hexadécimales correspondantes (graphiques). */
export const SUBJECT_HEX = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'];

export function subjectIndex(subject: string): number {
  let h = 0;
  for (const c of subject.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % PALETTE.length;
}

export function subjectClasses(subject: string): string {
  return PALETTE[subjectIndex(subject)];
}

export function uniqueSubjects(...lists: Array<Array<{ subject: string }>>): string[] {
  const set = new Map<string, string>();
  for (const list of lists) {
    for (const item of list) {
      const s = item.subject.trim();
      if (s && !set.has(s.toLowerCase())) set.set(s.toLowerCase(), s);
    }
  }
  return [...set.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}
