import { useState } from 'react';
import { ExternalLink, HeartHandshake, Trash2 } from 'lucide-react';
import { usePrefs } from '@/context/PrefsContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField, TextField } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { COMPETITIONS } from '@/lib/competitions';
import { clearAll } from '@/lib/storage';

export function SettingsPage() {
  const { preferences, updatePreferences } = usePrefs();
  const { dataset } = useData();
  const { notify } = useToast();
  const [bankroll, setBankroll] = useState(String(preferences.bankroll));
  const bankrollValue = Number(bankroll.replace(',', '.'));
  const bankrollError = Number.isFinite(bankrollValue) && bankrollValue >= 0 ? undefined : 'Montant invalide';

  return (
    <>
      <PageHeader title="Paramètres" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Affichage</h2>
          <Switch label="Thème sombre" checked={preferences.theme === 'dark'} onChange={(v) => updatePreferences({ theme: v ? 'dark' : 'light' })} />
          <SelectField label="Championnat par défaut" value={preferences.competition} onChange={(e) => updatePreferences({ competition: e.target.value })} wrapperClassName="mt-3">
            {COMPETITIONS.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.country})</option>)}
          </SelectField>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Gestion de mise</h2>
          <TextField
            label="Bankroll (€)"
            inputMode="decimal"
            value={bankroll}
            error={bankrollError}
            hint="Budget que vous acceptez de perdre. Sert à calculer les mises suggérées."
            onChange={(e) => {
              setBankroll(e.target.value);
              const v = Number(e.target.value.replace(',', '.'));
              if (Number.isFinite(v) && v >= 0) updatePreferences({ bankroll: v });
            }}
          />
          <SelectField
            label="Fraction de Kelly"
            value={String(preferences.kellyFraction)}
            onChange={(e) => updatePreferences({ kellyFraction: Number(e.target.value) })}
            hint="Le Kelly complet est très volatil, surtout si le modèle se trompe. Le quart de Kelly est un choix prudent."
          >
            <option value="0.1">10 % (très prudent)</option>
            <option value="0.25">25 % (prudent)</option>
            <option value="0.5">50 %</option>
            <option value="1">100 % (agressif)</option>
          </SelectField>
          <SelectField
            label="Seuil de « value »"
            value={String(preferences.minEdge)}
            onChange={(e) => updatePreferences({ minEdge: Number(e.target.value) })}
            hint="Espérance minimale pour signaler une cote intéressante."
          >
            {[0, 3, 5, 10].map((v) => <option key={v} value={v}>+{v} %</option>)}
          </SelectField>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Source des données</h2>
          {dataset?.source === 'api' ? (
            <p className="text-sm">Connecté à <strong>football-data.org</strong> ({dataset.matches.length} matchs chargés, saisons {dataset.currentSeason - 1} et {dataset.currentSeason}).</p>
          ) : (
            <p className="text-sm">
              <strong>Mode démonstration.</strong> Pour les vrais matchs, créez une clé gratuite sur football-data.org, puis renseignez
              <code className="mx-1 rounded bg-elevated px-1.5 py-0.5 text-xs">FOOTBALL_DATA_API_KEY</code>
              dans le fichier <code className="rounded bg-elevated px-1.5 py-0.5 text-xs">.env</code> (en local) ou dans les variables d'environnement de Vercel.
            </p>
          )}
          <a href="https://www.football-data.org/client/register" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:underline">
            Obtenir une clé API <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          <div className="mt-5 border-t border-line pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                clearAll();
                notify('Cotes, préférences et cache effacés. Rechargement…', 'info');
                window.setTimeout(() => window.location.reload(), 800);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Effacer les données locales
            </Button>
          </div>
        </section>

        <section className="card border-amber-500/30 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <HeartHandshake className="h-4 w-4 text-amber-500" aria-hidden /> Jeu responsable
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>Aucun modèle ne garantit de gain : les bookmakers intègrent une marge et ajustent leurs cotes.</li>
            <li>Ne misez que ce que vous pouvez vous permettre de perdre, et ne cherchez jamais à « vous refaire ».</li>
            <li>Fixez-vous des limites de dépôt et de temps sur votre site de paris.</li>
            <li>Les paris sportifs sont interdits aux mineurs.</li>
          </ul>
          <p className="mt-3 text-sm">
            Besoin d'aide ? <strong>Joueurs Info Service : 09 74 75 13 13</strong> (appel non surtaxé, 7j/7) ·{' '}
            <a href="https://www.joueurs-info-service.fr" target="_blank" rel="noreferrer" className="font-medium text-brand-500 hover:underline">joueurs-info-service.fr</a>
          </p>
        </section>
      </div>
    </>
  );
}
