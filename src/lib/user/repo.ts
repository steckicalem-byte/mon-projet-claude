/**
 * Persistance des données personnelles (favoris, catégories, pronostics).
 *
 * Toute l'application passe par l'interface `UserRepo` :
 *  - `LocalRepo` : stockage dans le navigateur (sans compte) ;
 *  - `SupabaseRepo` (voir supabaseRepo.ts) : compte en ligne, synchronisé.
 */
import { readJSON, writeJSON } from '@/lib/storage';
import { EMPTY_DATA, USER_DATA_VERSION, type AnyItem, type Bookmark, type Category, type ItemKind, type Pick, type UserData } from './types';

export interface UserRepo {
  load(): Promise<UserData>;
  upsert(kind: ItemKind, item: AnyItem): Promise<void>;
  remove(kind: ItemKind, id: string): Promise<void>;
}

const KINDS: ItemKind[] = ['bookmarks', 'categories', 'picks'];

/** Remplace (ou ajoute) un élément par identifiant, sans jamais créer de doublon. */
export function upsertItem<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i < 0) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

/** Fusionne deux jeux de données : pour un même identifiant, la version la plus récente gagne. */
export function mergeData(a: UserData, b: UserData): UserData {
  const out: UserData = { ...EMPTY_DATA };
  for (const kind of KINDS) {
    const map = new Map<string, AnyItem>();
    for (const item of [...(a[kind] as AnyItem[]), ...(b[kind] as AnyItem[])]) {
      const prev = map.get(item.id);
      if (!prev || item.updatedAt > prev.updatedAt) map.set(item.id, item);
    }
    (out[kind] as AnyItem[]) = [...map.values()];
  }
  return out;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v != null;
const str = (v: unknown) => typeof v === 'string';

/** Valide des données importées ou relues : les éléments invalides sont ignorés plutôt que de tout casser. */
export function sanitizeData(raw: unknown): UserData {
  if (!isObj(raw)) return { ...EMPTY_DATA };
  const list = (k: ItemKind) => (Array.isArray(raw[k]) ? (raw[k] as unknown[]) : []);
  const bookmarks = list('bookmarks').filter(
    (b): b is Bookmark => isObj(b) && str(b.id) && typeof b.matchId === 'number' && str(b.competition) && isObj(b.match) && Array.isArray(b.categoryIds) && str(b.updatedAt),
  );
  const categories = list('categories').filter((c): c is Category => isObj(c) && str(c.id) && str(c.name) && str(c.updatedAt));
  const picks = list('picks').filter(
    (p): p is Pick => isObj(p) && str(p.id) && typeof p.matchId === 'number' && isObj(p.match) && str(p.market) && str(p.selection) && typeof p.odds === 'number' && str(p.status) && str(p.updatedAt),
  );
  // Dédoublonnage défensif (fichiers importés modifiés à la main, anciennes versions…).
  return mergeData({ ...EMPTY_DATA }, { version: USER_DATA_VERSION, bookmarks, categories, picks });
}

export class LocalRepo implements UserRepo {
  constructor(private readonly key = 'user-data') {}

  private read(): UserData {
    return sanitizeData(readJSON<unknown>(this.key, null));
  }

  private write(data: UserData): void {
    if (!writeJSON(this.key, data)) throw new Error("Impossible d'enregistrer : le stockage du navigateur est plein ou bloqué.");
  }

  async load(): Promise<UserData> {
    return this.read();
  }

  async upsert(kind: ItemKind, item: AnyItem): Promise<void> {
    const data = this.read();
    (data[kind] as AnyItem[]) = upsertItem(data[kind] as AnyItem[], item);
    this.write(data);
  }

  async remove(kind: ItemKind, id: string): Promise<void> {
    const data = this.read();
    (data[kind] as AnyItem[]) = (data[kind] as AnyItem[]).filter((x) => x.id !== id);
    this.write(data);
  }

  /** Vide les données locales (après transfert vers le compte en ligne). */
  clear(): void {
    this.write({ ...EMPTY_DATA });
  }
}

/** Opération en attente d'envoi au serveur (réseau coupé, erreur temporaire). */
export type PendingOp = { op: 'upsert'; kind: ItemKind; item: AnyItem } | { op: 'remove'; kind: ItemKind; id: string };

/**
 * Enveloppe un dépôt distant : chaque écriture qui échoue est mise en file d'attente
 * (persistée dans le navigateur) puis renvoyée au prochain chargement.
 * Les données sont aussi gardées en cache local pour un affichage immédiat.
 */
export class QueuedRepo implements UserRepo {
  constructor(
    private readonly remote: UserRepo,
    private readonly cacheKey: string,
  ) {}

  private get queueKey() {
    return `${this.cacheKey}:pending`;
  }

  pending(): PendingOp[] {
    return readJSON<PendingOp[]>(this.queueKey, []);
  }

  cached(): UserData {
    return sanitizeData(readJSON<unknown>(this.cacheKey, null));
  }

  private enqueue(op: PendingOp) {
    // Une seule opération en attente par élément : la dernière remplace les précédentes.
    const id = op.op === 'upsert' ? op.item.id : op.id;
    const queue = this.pending().filter((o) => !(o.kind === op.kind && (o.op === 'upsert' ? o.item.id : o.id) === id));
    writeJSON(this.queueKey, [...queue, op]);
  }

  /** Renvoie les opérations en attente. Retourne le nombre d'opérations encore en échec. */
  async flush(): Promise<number> {
    const queue = this.pending();
    const failed: PendingOp[] = [];
    for (const op of queue) {
      try {
        if (op.op === 'upsert') await this.remote.upsert(op.kind, op.item);
        else await this.remote.remove(op.kind, op.id);
      } catch {
        failed.push(op);
      }
    }
    writeJSON(this.queueKey, failed);
    return failed.length;
  }

  async load(): Promise<UserData> {
    await this.flush();
    const data = await this.remote.load();
    // Les modifications encore non envoyées restent visibles.
    let merged = data;
    for (const op of this.pending()) {
      merged = { ...merged, [op.kind]: op.op === 'upsert' ? upsertItem(merged[op.kind] as AnyItem[], op.item) : (merged[op.kind] as AnyItem[]).filter((x) => x.id !== op.id) };
    }
    writeJSON(this.cacheKey, merged);
    return merged;
  }

  async upsert(kind: ItemKind, item: AnyItem): Promise<void> {
    const cache = this.cached();
    writeJSON(this.cacheKey, { ...cache, [kind]: upsertItem(cache[kind] as AnyItem[], item) });
    try {
      await this.remote.upsert(kind, item);
    } catch (e) {
      this.enqueue({ op: 'upsert', kind, item });
      throw e;
    }
  }

  async remove(kind: ItemKind, id: string): Promise<void> {
    const cache = this.cached();
    writeJSON(this.cacheKey, { ...cache, [kind]: (cache[kind] as AnyItem[]).filter((x) => x.id !== id) });
    try {
      await this.remote.remove(kind, id);
    } catch (e) {
      this.enqueue({ op: 'remove', kind, id });
      throw e;
    }
  }
}
