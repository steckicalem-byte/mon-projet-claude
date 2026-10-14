/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du projet Supabase (comptes en ligne). Facultatif : sans elle, données locales uniquement. */
  readonly VITE_SUPABASE_URL?: string;
  /** Clé « anon » publique du projet Supabase (protégée par les règles RLS de la base). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
