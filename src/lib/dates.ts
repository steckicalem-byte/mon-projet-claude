/** Utilitaires de dates en heure locale (format AAAA-MM-JJ). */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Nombre de jours entre aujourd'hui et la date (négatif = passé). */
export function daysUntil(iso: string): number {
  const today = parseISODate(todayISO());
  const target = parseISODate(iso);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Lundi de la semaine contenant `d`. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (r.getDay() + 6) % 7; // 0 = lundi
  r.setDate(r.getDate() - day);
  return r;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

export function formatDate(iso: string): string {
  return dateFmt.format(parseISODate(iso));
}

export function formatLongDate(iso: string): string {
  const s = longFmt.format(parseISODate(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatShortDay(d: Date): string {
  const s = shortDay.format(d).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function relativeDue(iso: string): string {
  const n = daysUntil(iso);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Demain';
  if (n === -1) return 'Hier';
  if (n < 0) return `En retard de ${-n} j`;
  if (n < 7) return `Dans ${n} jours`;
  return formatDate(iso);
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}
