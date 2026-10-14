/**
 * Couche de persistance.
 *
 * Toute l'application passe par l'interface `Repository<T>`. L'implémentation
 * actuelle utilise localStorage ; pour brancher une base de données plus tard,
 * il suffit de fournir une implémentation (ex. appels REST/Supabase) respectant
 * la même interface, puis de la retourner depuis `createRepository`.
 */

const PREFIX = 'studymate:';

export interface Repository<T> {
  load(): T;
  save(value: T): void;
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function createRepository<T>(key: string, fallback: T, validate?: (v: unknown) => v is T): Repository<T> {
  return {
    load() {
      const value = readJSON<unknown>(key, fallback);
      if (validate && !validate(value)) return fallback;
      return value as T;
    },
    save(value) {
      writeJSON(key, value);
    },
  };
}

export const STORAGE_KEYS = ['assignments', 'sessions', 'notes', 'preferences', 'chat'] as const;

export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = { app: 'studymate-ai', version: 1, exportedAt: new Date().toISOString() };
  for (const k of STORAGE_KEYS) out[k] = readJSON(k, null);
  return out;
}

export function importAll(data: Record<string, unknown>): void {
  for (const k of STORAGE_KEYS) {
    if (k in data && data[k] != null) writeJSON(k, data[k]);
  }
}

export function clearAll(): void {
  for (const k of STORAGE_KEYS) {
    try {
      localStorage.removeItem(PREFIX + k);
    } catch {
      /* ignore */
    }
  }
}
