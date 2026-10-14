import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Match } from '@/types';
import { useToast } from './ToastContext';
import { LocalRepo, mergeData, QueuedRepo, sanitizeData, upsertItem, type UserRepo } from '@/lib/user/repo';
import { getSupabase, SupabaseRepo, supabaseConfigured } from '@/lib/user/supabaseRepo';
import { settle } from '@/lib/user/markets';
import { writeJSON } from '@/lib/storage';
import { bookmarkId, EMPTY_DATA, newId, type AnyItem, type Bookmark, type Category, type ItemKind, type Pick as PickItem, type UserData } from '@/lib/user/types';

type PickType = PickItem;
type NewPick = Pick<PickType, 'market' | 'selection' | 'odds' | 'stake' | 'modelProbability' | 'note'>;

interface UserDataApi {
  data: UserData;
  loading: boolean;
  /** Comptes en ligne disponibles (Supabase configuré). */
  accountsEnabled: boolean;
  session: Session | null;
  /** Écritures en attente de synchronisation (réseau coupé…). */
  pendingSync: number;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  retrySync: () => Promise<void>;

  isBookmarked: (competition: string, matchId: number) => boolean;
  toggleBookmark: (match: Match, competition: string) => void;
  updateBookmark: (id: string, patch: Partial<Pick<Bookmark, 'categoryIds' | 'note'>>) => void;
  removeBookmark: (id: string) => void;

  addCategory: (name: string) => Category | null;
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'hue'>>) => void;
  removeCategory: (id: string) => void;

  addPick: (match: Match, competition: string, pick: NewPick) => void;
  updatePick: (id: string, patch: Partial<Pick<PickType, 'odds' | 'stake' | 'note' | 'status' | 'manual'>>) => void;
  removePick: (id: string) => void;

  /** Met à jour les copies de matchs (statut, score) et règle automatiquement les pronostics. */
  syncMatches: (competition: string, matches: Match[]) => void;
  importData: (raw: unknown) => Promise<number>;
}

const Ctx = createContext<UserDataApi | null>(null);
const now = () => new Date().toISOString();
const HUES = [145, 190, 45, 330, 265, 20, 100, 215];

function sameMatch(a: Match, b: Match) {
  return a.status === b.status && a.utcDate === b.utcDate && a.score?.home === b.score?.home && a.score?.away === b.score?.away;
}

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const [data, setData] = useState<UserData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const dataRef = useRef(data);
  const repoRef = useRef<UserRepo>(new LocalRepo());
  dataRef.current = data;

  // --- Session Supabase -------------------------------------------------------
  useEffect(() => {
    const p = getSupabase();
    if (!p) return;
    let unsub: (() => void) | undefined;
    p.then(async (client) => {
      const { data: s } = await client.auth.getSession();
      setSession(s.session);
      const { data: sub } = client.auth.onAuthStateChange((_e, next) => setSession(next));
      unsub = () => sub.subscription.unsubscribe();
    });
    return () => unsub?.();
  }, []);

  // --- Chargement selon le mode (local ou compte) ------------------------------
  const userId = session?.user.id ?? null;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const local = new LocalRepo();
      if (!userId) {
        repoRef.current = local;
        const d = await local.load();
        if (!cancelled) setData(d);
        setPendingSync(0);
        setLoading(false);
        return;
      }
      const client = await getSupabase()!;
      const repo = new QueuedRepo(new SupabaseRepo(client, userId), `cloud:${userId}`);
      repoRef.current = repo;
      if (!cancelled) setData(repo.cached()); // affichage immédiat depuis le cache
      try {
        let cloud = await repo.load();
        // Première connexion sur cet appareil : on transfère les données locales vers le compte.
        const localData = await local.load();
        const localCount = localData.bookmarks.length + localData.categories.length + localData.picks.length;
        if (localCount) {
          writeJSON('user-data:backup', localData);
          const merged = mergeData(cloud, localData);
          for (const kind of ['categories', 'bookmarks', 'picks'] as ItemKind[]) {
            for (const item of merged[kind] as AnyItem[]) {
              const inCloud = (cloud[kind] as AnyItem[]).find((x) => x.id === item.id);
              if (!inCloud || inCloud.updatedAt < item.updatedAt) await repo.upsert(kind, item).catch(() => {});
            }
          }
          local.clear();
          cloud = merged;
          notify(`${localCount} élément${localCount > 1 ? 's' : ''} de cet appareil ajouté${localCount > 1 ? 's' : ''} à votre compte.`);
        }
        if (!cancelled) setData(cloud);
      } catch {
        notify('Compte injoignable : affichage de la dernière copie enregistrée sur cet appareil.', 'error');
      } finally {
        if (!cancelled) {
          setPendingSync(repo.pending().length);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, notify]);

  // --- Écriture : état immédiat, puis stockage ---------------------------------
  const persist = useCallback(
    (ops: Array<{ kind: ItemKind; item?: AnyItem; removeId?: string }>) => {
      const repo = repoRef.current;
      void (async () => {
        let failed = false;
        for (const op of ops) {
          try {
            if (op.item) await repo.upsert(op.kind, op.item);
            else if (op.removeId) await repo.remove(op.kind, op.removeId);
          } catch {
            failed = true;
          }
        }
        if (repo instanceof QueuedRepo) setPendingSync(repo.pending().length);
        if (failed) {
          notify(repo instanceof QueuedRepo ? 'Hors ligne : modification gardée sur cet appareil, synchronisation dès que possible.' : "Impossible d'enregistrer : le stockage du navigateur est plein ou bloqué.", 'error');
        }
      })();
    },
    [notify],
  );

  const put = useCallback(
    <K extends ItemKind>(kind: K, item: UserData[K][number]) => {
      setData((d) => ({ ...d, [kind]: upsertItem(d[kind] as AnyItem[], item as AnyItem) }));
      persist([{ kind, item: item as AnyItem }]);
    },
    [persist],
  );

  const drop = useCallback(
    (kind: ItemKind, id: string) => {
      setData((d) => ({ ...d, [kind]: (d[kind] as AnyItem[]).filter((x) => x.id !== id) }));
      persist([{ kind, removeId: id }]);
    },
    [persist],
  );

  // --- Favoris -----------------------------------------------------------------
  const isBookmarked = useCallback((competition: string, matchId: number) => data.bookmarks.some((b) => b.id === bookmarkId(competition, matchId)), [data.bookmarks]);

  const toggleBookmark = useCallback(
    (match: Match, competition: string) => {
      const id = bookmarkId(competition, match.id);
      const existing = dataRef.current.bookmarks.find((b) => b.id === id);
      if (existing) {
        drop('bookmarks', id);
        notify('Retiré des favoris', 'info', { label: 'Annuler', onClick: () => put('bookmarks', { ...existing, updatedAt: now() }) });
      } else {
        const t = now();
        put('bookmarks', { id, matchId: match.id, competition, match, categoryIds: [], note: '', createdAt: t, updatedAt: t });
        notify('Ajouté aux favoris');
      }
    },
    [drop, put, notify],
  );

  const updateBookmark = useCallback<UserDataApi['updateBookmark']>(
    (id, patch) => {
      const b = dataRef.current.bookmarks.find((x) => x.id === id);
      if (b) put('bookmarks', { ...b, ...patch, note: (patch.note ?? b.note).slice(0, 2000), updatedAt: now() });
    },
    [put],
  );

  const removeBookmark = useCallback(
    (id: string) => {
      const b = dataRef.current.bookmarks.find((x) => x.id === id);
      if (!b) return;
      drop('bookmarks', id);
      notify('Favori supprimé', 'info', { label: 'Annuler', onClick: () => put('bookmarks', { ...b, updatedAt: now() }) });
    },
    [drop, put, notify],
  );

  // --- Catégories ----------------------------------------------------------------
  const addCategory = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, 40);
      if (!clean) return null;
      const existing = dataRef.current.categories.find((c) => c.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing;
      const t = now();
      const cat: Category = { id: newId(), name: clean, hue: HUES[dataRef.current.categories.length % HUES.length], createdAt: t, updatedAt: t };
      put('categories', cat);
      return cat;
    },
    [put],
  );

  const updateCategory = useCallback<UserDataApi['updateCategory']>(
    (id, patch) => {
      const c = dataRef.current.categories.find((x) => x.id === id);
      if (c) put('categories', { ...c, ...patch, name: (patch.name ?? c.name).trim().slice(0, 40) || c.name, updatedAt: now() });
    },
    [put],
  );

  const removeCategory = useCallback(
    (id: string) => {
      const t = now();
      const touched = dataRef.current.bookmarks.filter((b) => b.categoryIds.includes(id)).map((b) => ({ ...b, categoryIds: b.categoryIds.filter((c) => c !== id), updatedAt: t }));
      setData((d) => ({
        ...d,
        categories: d.categories.filter((c) => c.id !== id),
        bookmarks: touched.reduce((list, b) => upsertItem(list, b), d.bookmarks),
      }));
      persist([{ kind: 'categories', removeId: id }, ...touched.map((b) => ({ kind: 'bookmarks' as const, item: b }))]);
    },
    [persist],
  );

  // --- Pronostics ------------------------------------------------------------------
  const addPick = useCallback<UserDataApi['addPick']>(
    (match, competition, p) => {
      const t = now();
      const status = settle(match, p.market, p.selection);
      put('picks', { id: newId(), matchId: match.id, competition, match, ...p, note: p.note.slice(0, 1000), status, manual: false, createdAt: t, updatedAt: t, settledAt: status === 'pending' ? null : t });
      // Un pronostic place aussi le match dans les favoris.
      const bid = bookmarkId(competition, match.id);
      if (!dataRef.current.bookmarks.some((b) => b.id === bid)) put('bookmarks', { id: bid, matchId: match.id, competition, match, categoryIds: [], note: '', createdAt: t, updatedAt: t });
      notify('Pronostic enregistré');
    },
    [put, notify],
  );

  const updatePick = useCallback<UserDataApi['updatePick']>(
    (id, patch) => {
      const p = dataRef.current.picks.find((x) => x.id === id);
      if (!p) return;
      const next = { ...p, ...patch, updatedAt: now() };
      // Retour au mode automatique : le statut est recalculé d'après le score connu.
      if (patch.manual === false) next.status = settle(p.match, p.market, p.selection);
      if (next.status !== p.status) next.settledAt = next.status === 'pending' ? null : now();
      put('picks', next);
    },
    [put],
  );

  const removePick = useCallback(
    (id: string) => {
      const p = dataRef.current.picks.find((x) => x.id === id);
      if (!p) return;
      drop('picks', id);
      notify('Pronostic supprimé', 'info', { label: 'Annuler', onClick: () => put('picks', { ...p, updatedAt: now() }) });
    },
    [drop, put, notify],
  );

  // --- Mise à jour des matchs suivis ---------------------------------------------
  const syncMatches = useCallback(
    (competition: string, matches: Match[]) => {
      const byId = new Map(matches.map((m) => [m.id, m]));
      const t = now();
      const d = dataRef.current;
      const bookmarks = d.bookmarks
        .filter((b) => b.competition === competition && byId.has(b.matchId) && !sameMatch(b.match, byId.get(b.matchId)!))
        .map((b) => ({ ...b, match: byId.get(b.matchId)!, updatedAt: t }));
      const picks = d.picks
        .filter((p) => p.competition === competition && byId.has(p.matchId))
        .map((p) => {
          const match = byId.get(p.matchId)!;
          const status = p.manual ? p.status : settle(match, p.market, p.selection);
          if (sameMatch(p.match, match) && status === p.status) return null;
          return { ...p, match, status, settledAt: status === p.status ? p.settledAt : status === 'pending' ? null : t, updatedAt: t };
        })
        .filter((p): p is PickType => p != null);
      if (!bookmarks.length && !picks.length) return;
      setData((cur) => ({
        ...cur,
        bookmarks: bookmarks.reduce((l, b) => upsertItem(l, b), cur.bookmarks),
        picks: picks.reduce((l, p) => upsertItem(l, p), cur.picks),
      }));
      persist([...bookmarks.map((b) => ({ kind: 'bookmarks' as const, item: b })), ...picks.map((p) => ({ kind: 'picks' as const, item: p }))]);
      const settled = picks.filter((p) => p.status !== 'pending' && !p.manual).length;
      if (settled) notify(`${settled} pronostic${settled > 1 ? 's' : ''} réglé${settled > 1 ? 's' : ''} automatiquement.`, 'info');
    },
    [persist, notify],
  );

  const importData = useCallback(
    async (raw: unknown) => {
      const incoming = sanitizeData(isExport(raw) ? raw.data : raw);
      const merged = mergeData(dataRef.current, incoming);
      const ops: Array<{ kind: ItemKind; item: AnyItem }> = [];
      for (const kind of ['categories', 'bookmarks', 'picks'] as ItemKind[]) {
        for (const item of merged[kind] as AnyItem[]) {
          const cur = (dataRef.current[kind] as AnyItem[]).find((x) => x.id === item.id);
          if (!cur || cur.updatedAt !== item.updatedAt) ops.push({ kind, item });
        }
      }
      setData(merged);
      persist(ops);
      return ops.length;
    },
    [persist],
  );

  // --- Compte ------------------------------------------------------------------------
  const signIn = useCallback(async (email: string) => {
    const client = await getSupabase();
    if (!client) throw new Error('Les comptes ne sont pas configurés sur ce site.');
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const client = await getSupabase();
    await client?.auth.signOut();
    notify('Déconnecté. Vos données restent sur votre compte.', 'info');
  }, [notify]);

  const retrySync = useCallback(async () => {
    const repo = repoRef.current;
    if (!(repo instanceof QueuedRepo)) return;
    const left = await repo.flush();
    setPendingSync(left);
    notify(left ? `${left} modification${left > 1 ? 's' : ''} toujours en attente.` : 'Tout est synchronisé.', left ? 'error' : 'success');
  }, [notify]);

  const api = useMemo<UserDataApi>(
    () => ({
      data, loading, accountsEnabled: supabaseConfigured, session, pendingSync, signIn, signOut, retrySync,
      isBookmarked, toggleBookmark, updateBookmark, removeBookmark,
      addCategory, updateCategory, removeCategory,
      addPick, updatePick, removePick, syncMatches, importData,
    }),
    [data, loading, session, pendingSync, signIn, signOut, retrySync, isBookmarked, toggleBookmark, updateBookmark, removeBookmark, addCategory, updateCategory, removeCategory, addPick, updatePick, removePick, syncMatches, importData],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** Fichier d'export : { app, exportedAt, data }. */
export function buildExport(data: UserData) {
  return { app: 'pronofoot', version: data.version, exportedAt: new Date().toISOString(), data };
}
function isExport(v: unknown): v is { data: unknown } {
  return typeof v === 'object' && v != null && 'data' in v && (v as { app?: unknown }).app === 'pronofoot';
}

export function useUserData(): UserDataApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUserData doit être utilisé dans UserDataProvider');
  return ctx;
}
