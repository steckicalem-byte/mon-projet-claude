import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, Database, Download, Moon, Palette, Sun, Upload, UserRound, Trash2, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Switch';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { clearAll, exportAll, importAll } from '@/lib/storage';
import { aiProvider } from '@/lib/ai';
import { cn } from '@/lib/cn';
import type { Theme } from '@/types';

function Section({ icon: Icon, title, description, children }: { icon: typeof Bell; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-xl bg-brand-500/15 p-2 text-brand-400"><Icon className="h-5 w-5" aria-hidden /></span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SettingsPage() {
  const { preferences, updatePreferences } = useStore();
  const { notify } = useToast();
  const [name, setName] = useState(preferences.studentName);
  const [email, setEmail] = useState(preferences.email);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(notifSupported ? Notification.permission : 'unsupported');

  useEffect(() => {
    setName(preferences.studentName);
    setEmail(preferences.email);
  }, [preferences.studentName, preferences.email]);

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (name.trim().length > 60) errs.name = '60 caractères maximum.';
    if (email.trim() && !EMAIL_RE.test(email.trim())) errs.email = 'Adresse e-mail invalide.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    updatePreferences({ studentName: name.trim(), email: email.trim() });
    notify('Profil enregistré');
  };

  const setTheme = (theme: Theme) => {
    updatePreferences({ theme });
    notify(theme === 'dark' ? 'Thème sombre activé' : 'Thème clair activé', 'info');
  };

  const setNotif = (patch: Partial<typeof preferences.notifications>) =>
    updatePreferences({ notifications: { ...preferences.notifications, ...patch } });

  const toggleBrowser = async (on: boolean) => {
    if (!on) {
      setNotif({ browserNotifications: false });
      return;
    }
    if (!notifSupported) return;
    let p = Notification.permission;
    if (p === 'default') p = await Notification.requestPermission();
    setPermission(p);
    if (p === 'granted') {
      setNotif({ browserNotifications: true });
      notify('Notifications du navigateur activées');
    } else {
      notify("Autorisation refusée : modifiez-la dans les réglages du navigateur", 'error');
    }
  };

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studymate-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Sauvegarde téléchargée');
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>;
      if (data.app !== 'studymate-ai') throw new Error('format');
      importAll(data);
      notify('Données importées — rechargement…', 'info');
      window.setTimeout(() => window.location.reload(), 600);
    } catch {
      notify("Ce fichier n'est pas une sauvegarde StudyMate valide", 'error');
    }
  };

  return (
    <>
      <PageHeader title="Profil et paramètres" description="Personnalisez StudyMate AI." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={UserRound} title="Profil" description="Utilisé pour personnaliser votre tableau de bord.">
          <form onSubmit={saveProfile} noValidate className="grid gap-4">
            <TextField label="Nom de l'étudiant" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Camille Martin" maxLength={80} error={errors.name} autoComplete="name" />
            <TextField
              label="E-mail (facultatif)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              error={errors.email}
              autoComplete="email"
              hint="Enregistré uniquement sur cet appareil, pour un futur compte en ligne."
            />
            <div><Button type="submit"><Check className="h-4 w-4" aria-hidden />Enregistrer</Button></div>
          </form>
        </Section>

        <Section icon={Palette} title="Apparence" description="Le thème sombre est utilisé par défaut.">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Thème">
            {([
              { value: 'dark', label: 'Sombre', icon: Moon },
              { value: 'light', label: 'Clair', icon: Sun },
            ] as const).map(({ value, label, icon: Icon }) => {
              const active = preferences.theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(value)}
                  className={cn('flex flex-col items-center gap-2 rounded-xl border p-4 transition', active ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500' : 'border-line hover:border-brand-500/40')}
                >
                  <Icon className="h-6 w-6" aria-hidden />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon={Bell} title="Notifications" description="Rappels affichés à l'ouverture de l'application.">
          <div className="divide-y divide-line">
            <Switch
              label="Rappels dans l'application"
              description="Une notification discrète signale les devoirs en retard ou proches de l'échéance."
              checked={preferences.notifications.inAppReminders}
              onChange={(v) => setNotif({ inAppReminders: v })}
            />
            <Switch
              label="Notifications du navigateur"
              description={
                permission === 'unsupported'
                  ? "Non prises en charge par ce navigateur."
                  : permission === 'denied'
                    ? 'Bloquées dans les réglages du navigateur.'
                    : "Affichées à l'ouverture de l'application (pas en arrière-plan : cela nécessiterait un serveur de notifications push)."
              }
              checked={preferences.notifications.browserNotifications && permission === 'granted'}
              disabled={permission === 'unsupported' || permission === 'denied'}
              onChange={toggleBrowser}
            />
            <div className="pt-3">
              <SelectField
                label="Rappeler les échéances"
                value={String(preferences.notifications.reminderDaysBefore)}
                onChange={(e) => setNotif({ reminderDaysBefore: Number(e.target.value) })}
              >
                <option value="0">Le jour même</option>
                <option value="1">1 jour avant</option>
                <option value="2">2 jours avant</option>
                <option value="3">3 jours avant</option>
                <option value="7">1 semaine avant</option>
              </SelectField>
            </div>
          </div>
        </Section>

        <Section icon={Database} title="Compte et données" description="Aucun compte en ligne pour l'instant : vos données restent sur cet appareil (localStorage).">
          <dl className="mb-4 grid gap-2 rounded-xl bg-elevated/60 p-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Stockage</dt><dd>Local (ce navigateur)</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Synchronisation</dt><dd>Non configurée</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Assistant IA</dt><dd>{aiProvider.isDemo ? 'Mode démonstration' : 'Connecté'}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            {import.meta.env.MODE !== 'artifact' && (
              <Button variant="secondary" onClick={doExport}><Download className="h-4 w-4" aria-hidden />Exporter</Button>
            )}
            <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" aria-hidden />Importer</Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void doImport(f);
                e.target.value = '';
              }}
            />
            <Button variant="ghost" className="text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={() => setConfirmReset(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />Tout effacer
            </Button>
          </div>
          {import.meta.env.MODE === 'artifact' && (
            <p className="mt-3 text-xs text-muted">L'export n'est pas disponible dans cet aperçu en ligne (téléchargements bloqués). Il fonctionne dans la version publiée sur Vercel ou Netlify.</p>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Effacer toutes les données ?"
        message="Devoirs, planning, notes, discussion et préférences seront supprimés de cet appareil. Pensez à exporter une sauvegarde avant."
        confirmLabel="Tout effacer"
        onConfirm={() => {
          clearAll();
          window.location.reload();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}
