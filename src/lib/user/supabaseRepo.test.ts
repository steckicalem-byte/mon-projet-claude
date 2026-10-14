import { describe, expect, it } from 'vitest';
import { SupabaseRepo } from './supabaseRepo';
import type { Category } from './types';

/** Faux client Supabase qui enregistre les appels (forme des requêtes envoyées). */
function fakeClient(rows: unknown[] = [], error: { message: string } | null = null) {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const result = { data: rows, error };
  const chain = {
    select: (...args: unknown[]) => (calls.push({ op: 'select', args }), Promise.resolve(result)),
    upsert: (...args: unknown[]) => (calls.push({ op: 'upsert', args }), Promise.resolve({ error })),
    delete: () => {
      calls.push({ op: 'delete', args: [] });
      const eqs: unknown[] = [];
      const q = { eq: (...a: unknown[]) => (eqs.push(a), eqs.length === 2 ? Promise.resolve({ error }) : q) };
      calls.push({ op: 'eq', args: eqs });
      return q;
    },
  };
  return { calls, client: { from: (table: string) => (calls.push({ op: 'from', args: [table] }), chain) } };
}

const cat: Category = { id: 'c1', name: 'Week-end', hue: 145, createdAt: '2026-10-01', updatedAt: '2026-10-02' };

describe('SupabaseRepo', () => {
  it('écrit dans user_items avec l’utilisateur, le type et l’identifiant', async () => {
    const { client, calls } = fakeClient();
    await new SupabaseRepo(client as never, 'user-1').upsert('categories', cat);
    const up = calls.find((c) => c.op === 'upsert')!;
    expect(calls[0]).toEqual({ op: 'from', args: ['user_items'] });
    expect(up.args[0]).toEqual({ user_id: 'user-1', kind: 'categories', id: 'c1', data: cat, updated_at: '2026-10-02' });
    expect(up.args[1]).toEqual({ onConflict: 'user_id,kind,id' });
  });

  it('regroupe les lignes lues par type et ignore les données invalides', async () => {
    const { client } = fakeClient([{ kind: 'categories', id: 'c1', data: cat }, { kind: 'picks', id: 'x', data: { bad: true } }]);
    const data = await new SupabaseRepo(client as never, 'user-1').load();
    expect(data.categories).toEqual([cat]);
    expect(data.picks).toEqual([]);
  });

  it('remonte les erreurs du serveur (pour la file d’attente)', async () => {
    const { client } = fakeClient([], { message: 'JWT expired' });
    await expect(new SupabaseRepo(client as never, 'user-1').upsert('categories', cat)).rejects.toThrow('JWT expired');
  });
});
