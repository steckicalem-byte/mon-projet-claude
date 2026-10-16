import { useRef, useState } from 'react';
import { CloudOff, Download, LogOut, Mail, RefreshCw, Upload, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useToast } from '@/context/ToastContext';
import { buildExport, useUserData } from '@/context/UserDataContext';
import { download, picksToCsv } from '@/lib/user/export';

export function AccountSection() {
  const { data, accountsEnabled, session, pendingSync, signIn, signOut, retrySync, importData } = useUserData();
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Adresse e-mail invalide.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim());
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File) => {
    try {
      if (file.size > 5_000_000) throw new Error('Fichier trop volumineux (5 Mo maximum).');
      const n = await importData(JSON.parse(await file.text()));
      notify(n ? `${n} élément${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''} (sans doublon).` : 'Rien de nouveau dans ce fichier.', n ? 'success' : 'info');
    } catch (e) {
      notify(`Import impossible : ${(e as Error).message}`, 'error');
    }
  };

  return (
    <section className="card space-y-5 p-5 lg:col-span-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <UserRound className="h-4 w-4" aria-hidden /> Compte et données
      </h2>

      {!accountsEnabled ? (
        <div className="flex gap-3 rounded-xl bg-elevated/60 p-3 text-sm">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <p className="text-muted">
            Vos favoris et pronostics sont enregistrés <strong className="text-fg">sur cet appareil</strong>. Les comptes en ligne (synchronisation entre
            téléphone et ordinateur) seront disponibles quand le site sera relié à Supabase. En attendant, utilisez l’export ci-dessous pour sauvegarder vos données.
          </p>
        </div>
      ) : session ? (
        <div className="flex flex-col gap-3 rounded-xl bg-elevated/60 p-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 text-sm">
            <p>Connecté : <strong className="break-all">{session.user.email}</strong></p>
            <p className="mt-0.5 text-xs text-muted">
              {pendingSync ? `${pendingSync} modification${pendingSync > 1 ? 's' : ''} en attente de synchronisation.` : 'Données synchronisées sur votre compte.'}
            </p>
          </div>
          <div className="flex gap-2">
            {pendingSync > 0 && (
              <Button variant="secondary" size="sm" onClick={retrySync}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Synchroniser
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Se déconnecter
            </Button>
          </div>
        </div>
      ) : sent ? (
        <div className="flex gap-3 rounded-xl bg-brand-500/10 p-3 text-sm ring-1 ring-inset ring-brand-500/30">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400" aria-hidden />
          <p>
            Un lien de connexion a été envoyé à <strong>{email}</strong>. Ouvrez-le <strong>sur cet appareil</strong> pour vous connecter.{' '}
            <button type="button" className="font-medium text-brand-700 underline dark:text-brand-400" onClick={() => setSent(false)}>Changer d’adresse</button>
          </p>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="text-sm text-muted">Connectez-vous pour retrouver vos favoris et pronostics sur tous vos appareils. Pas de mot de passe : un lien vous est envoyé par e-mail.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <TextField label="Adresse e-mail" type="email" autoComplete="email" wrapperClassName="flex-1" value={email} onChange={(e) => setEmail(e.target.value)} error={error ?? undefined} />
            <Button type="submit" className="sm:mt-7" disabled={busy}>
              <Mail className="h-4 w-4" aria-hidden /> {busy ? 'Envoi…' : 'Recevoir le lien'}
            </Button>
          </div>
          <p className="text-xs text-muted">Les favoris déjà enregistrés sur cet appareil seront ajoutés à votre compte à la première connexion.</p>
        </form>
      )}

      <div className="border-t border-line pt-4">
        <h3 className="mb-1 text-sm font-semibold">Mes données</h3>
        <p className="mb-3 text-xs text-muted">
          {data.bookmarks.length} favori{data.bookmarks.length > 1 ? 's' : ''} · {data.categories.length} catégorie{data.categories.length > 1 ? 's' : ''} · {data.picks.length} pronostic{data.picks.length > 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => download(`pronofoot-${stamp}.json`, JSON.stringify(buildExport(data), null, 2), 'application/json')}>
            <Download className="h-4 w-4" aria-hidden /> Exporter (JSON)
          </Button>
          <Button variant="secondary" disabled={!data.picks.length} onClick={() => download(`pronofoot-pronostics-${stamp}.csv`, picksToCsv(data.picks), 'text/csv;charset=utf-8')}>
            <Download className="h-4 w-4" aria-hidden /> Pronostics (CSV)
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden /> Importer
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </section>
  );
}
