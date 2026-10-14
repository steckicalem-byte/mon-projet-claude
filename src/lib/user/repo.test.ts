import { beforeEach, describe, expect, it } from 'vitest';
import type { Match } from '@/types';
import { LocalRepo, mergeData, QueuedRepo, sanitizeData, upsertItem, type UserRepo } from './repo';
import { EMPTY_DATA, type Bookmark, type UserData } from './types';

// localStorage minimal pour l'environnement Node des tests.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

const match = { id: 7, utcDate: '2026-10-20T19:00:00Z', status: 'TIMED', matchday: 1, season: 2026, home: { id: 1, name: 'A', shortName: 'A', tla: 'AAA' }, away: { id: 2, name: 'B', shortName: 'B', tla: 'BBB' }, score: null } as Match;
const bm = (updatedAt: string, note = ''): Bookmark => ({ id: 'FL1:7', matchId: 7, competition: 'FL1', match, categoryIds: [], note, createdAt: updatedAt, updatedAt });

beforeEach(() => store.clear());

describe('données personnelles', () => {
  it('ne crée jamais de doublon', () => {
    const list = upsertItem(upsertItem([], bm('2026-10-01')), bm('2026-10-02', 'x'));
    expect(list).toHaveLength(1);
    expect(list[0].note).toBe('x');
  });

  it('garde la version la plus récente lors d’une fusion', () => {
    const a: UserData = { ...EMPTY_DATA, bookmarks: [bm('2026-10-02', 'récent')] };
    const b: UserData = { ...EMPTY_DATA, bookmarks: [bm('2026-10-01', 'ancien')] };
    expect(mergeData(a, b).bookmarks[0].note).toBe('récent');
    expect(mergeData(b, a).bookmarks[0].note).toBe('récent');
  });

  it('ignore les éléments invalides d’un import', () => {
    const data = sanitizeData({ bookmarks: [bm('2026-10-01'), { id: 3 }, null], categories: 'x', picks: [{}] });
    expect(data.bookmarks).toHaveLength(1);
    expect(data.categories).toHaveLength(0);
    expect(data.picks).toHaveLength(0);
  });

  it('persiste localement après « actualisation » (nouvelle instance)', async () => {
    await new LocalRepo().upsert('bookmarks', bm('2026-10-01', 'gardé'));
    expect((await new LocalRepo().load()).bookmarks[0].note).toBe('gardé');
  });

  it('met en file d’attente les écritures qui échouent et les renvoie ensuite', async () => {
    let online = false;
    const saved: string[] = [];
    const remote: UserRepo = {
      load: async () => ({ ...EMPTY_DATA }),
      upsert: async (_k, item) => {
        if (!online) throw new Error('réseau coupé');
        saved.push(item.id);
      },
      remove: async () => {},
    };
    const repo = new QueuedRepo(remote, 'cloud:u1');
    await expect(repo.upsert('bookmarks', bm('2026-10-01'))).rejects.toThrow();
    expect(repo.pending()).toHaveLength(1);
    // Même hors ligne, l'élément reste visible au rechargement.
    online = false;
    expect((await repo.load()).bookmarks).toHaveLength(1);
    online = true;
    expect(await repo.flush()).toBe(0);
    expect(saved).toEqual(['FL1:7']);
    expect(repo.pending()).toHaveLength(0);
  });
});
