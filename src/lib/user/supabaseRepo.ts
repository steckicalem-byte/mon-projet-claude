/**
 * Compte en ligne avec Supabase (base PostgreSQL + authentification par e-mail).
 *
 * Une seule table `user_items` (voir supabase/schema.sql) ; les règles RLS de la base
 * garantissent que chaque utilisateur ne lit et n'écrit que ses propres lignes.
 * La clé « anon » de Supabase est publique par conception : la sécurité repose sur RLS.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { EMPTY_DATA, type AnyItem, type ItemKind, type UserData } from './types';
import { sanitizeData, type UserRepo } from './repo';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(URL_ && ANON);

let clientPromise: Promise<SupabaseClient> | null = null;

/** Client Supabase chargé à la demande (le code n'est téléchargé que si les comptes sont configurés). */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!supabaseConfigured) return null;
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_!, ANON!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }),
  );
  return clientPromise;
}

interface Row {
  kind: ItemKind;
  id: string;
  data: AnyItem;
}

export class SupabaseRepo implements UserRepo {
  constructor(
    private readonly client: Pick<SupabaseClient, 'from'>,
    private readonly userId: string,
  ) {}

  async load(): Promise<UserData> {
    const { data, error } = await this.client.from('user_items').select('kind, id, data');
    if (error) throw new Error(error.message);
    const raw: UserData = { ...EMPTY_DATA, bookmarks: [], categories: [], picks: [] };
    for (const row of (data ?? []) as Row[]) {
      if (row.kind in raw) (raw[row.kind] as AnyItem[]).push(row.data);
    }
    return sanitizeData(raw);
  }

  async upsert(kind: ItemKind, item: AnyItem): Promise<void> {
    const { error } = await this.client
      .from('user_items')
      .upsert({ user_id: this.userId, kind, id: item.id, data: item, updated_at: item.updatedAt }, { onConflict: 'user_id,kind,id' });
    if (error) throw new Error(error.message);
  }

  async remove(kind: ItemKind, id: string): Promise<void> {
    const { error } = await this.client.from('user_items').delete().eq('kind', kind).eq('id', id);
    if (error) throw new Error(error.message);
  }
}
