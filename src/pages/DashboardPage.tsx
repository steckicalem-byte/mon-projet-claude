import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Database, FlaskConical, Gem, Goal, ShieldCheck, Target } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { usePrefs } from '@/context/PrefsContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataNotice, DataToolbar, LoadingCards } from '@/components/match/parts';
import { bestValue, MatchCard } from '@/components/match/MatchCard';
import { pct, relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Prediction } from '@/lib/model/poisson';
import type { Match } from '@/types';

const UPCOMING = new Set(['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED']);

function StatTile({ icon: Icon, label, value, hint, tone = 'default' }: { icon: typeof Target; label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'brand' | 'warn' }) {
  return (
    <div className="card relative overflow-hidden p-4">
      <div className={cn('mb-3 inline-grid h-9 w-9 place-items-center rounded-xl', tone === 'brand' ? 'bg-brand-500/15 text-brand-700 dark:text-brand-400' : tone === 'warn' ? 'bg-amber-500/15 text-amber-600' : 'bg-elevated text-muted')}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Section({ title, link, children }: { title: string; link?: { to: string; label: string }; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {link && (
          <Link to={link.to} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
            {link.label} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Fiabilité des données : nombre moyen de matchs observés par équipe. */
function reliability(trainingMatches: number, teams: number) {
  const perTeam = teams ? (2 * trainingMatches) / teams : 0;
  if (perTeam >= 15) return { label: 'Élevée', perTeam };
  if (perTeam >= 6) return { label: 'Moyenne', perTeam };
  return { label: 'Faible', perTeam };
}

export function DashboardPage() {
  const { dataset, model, loading, predictMatch } = useData();
  const { odds, preferences } = usePrefs();

  const upcoming = useMemo(() => {
    if (!dataset) return [];
    const now = Date.now();
    return dataset.matches
      .filter((m) => UPCOMING.has(m.status) && Date.parse(m.utcDate) > now - 3 * 3_600_000)
      .map((m) => ({ match: m, p: predictMatch(m) }))
      .filter((x): x is { match: Match; p: Prediction } => x.p != null);
  }, [dataset, predictMatch]);

  const week = upcoming.filter(({ match }) => Date.parse(match.utcDate) < Date.now() + 7 * 86_400_000);
  const values = upcoming.filter(({ match, p }) => (bestValue(match, p, odds)?.ev ?? -1) * 100 >= preferences.minEdge);
  const clearest = [...week].sort((a, b) => Math.max(b.p.home, b.p.away) - Math.max(a.p.home, a.p.away)).slice(0, 4);
  const goals = [...week].sort((a, b) => b.p.over25 - a.p.over25).slice(0, 4);
  const rel = model ? reliability(model.trainingMatches, model.teams.size) : null;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={dataset ? `${dataset.competition.name} · ${dataset.competition.country}` : 'Chargement…'}
        actions={<DataToolbar />}
      />
      <DataNotice />

      {loading && !dataset ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-32" />)}</div>
          <LoadingCards />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={CalendarDays} label="Matchs sur 7 jours" value={week.length} hint={`${upcoming.length} à venir au total`} />
            <StatTile
              icon={Gem}
              label="Value bets détectés"
              value={values.length}
              tone={values.length ? 'brand' : 'default'}
              hint={values.length ? `Espérance ≥ +${preferences.minEdge} %` : 'Saisissez des cotes sur un match'}
            />
            <StatTile
              icon={ShieldCheck}
              label="Fiabilité des données"
              value={dataset?.source === 'demo' ? 'Démo' : (rel?.label ?? '—')}
              tone={dataset?.source === 'demo' || rel?.label === 'Faible' ? 'warn' : 'brand'}
              hint={rel ? `${model!.trainingMatches} matchs analysés · ≈ ${Math.round(rel.perTeam)} par équipe` : undefined}
            />
            <StatTile
              icon={dataset?.source === 'api' ? Database : FlaskConical}
              label="Dernière mise à jour"
              value={<span className="text-lg">{dataset ? relativeTime(dataset.fetchedAt) : '—'}</span>}
              tone={dataset?.source === 'api' ? 'default' : 'warn'}
              hint={dataset?.source === 'api' ? 'Source : football-data.org' : 'Données de démonstration fictives'}
            />
          </div>

          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Aucun match à venir" description="La saison est peut-être terminée ou en trêve. Essayez une autre compétition." />
          ) : (
            <>
              <Section title="Prochains matchs" link={{ to: '/matchs', label: 'Tous les matchs' }}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {upcoming.slice(0, 4).map(({ match, p }) => <MatchCard key={match.id} match={match} prediction={p} showDate />)}
                </div>
              </Section>

              {clearest.length > 0 && (
                <Section title="Les plus nets selon le modèle (7 jours)">
                  <p className="-mt-2 mb-3 text-xs text-muted">Classés par probabilité de victoire la plus élevée. Une probabilité n'est jamais une garantie.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {clearest.map(({ match, p }) => <MatchCard key={match.id} match={match} prediction={p} showDate />)}
                  </div>
                </Section>
              )}

              {goals.length > 0 && (
                <Section title="Matchs à buts attendus (7 jours)">
                  <ul className="card divide-y divide-line">
                    {goals.map(({ match, p }) => (
                      <li key={match.id}>
                        <Link to={`/match/${match.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-elevated/60">
                          <Goal className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400" aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{match.home.shortName} – {match.away.shortName}</span>
                          <span className="text-xs text-muted">+2,5 buts</span>
                          <span className="w-12 text-right text-sm font-semibold tabular-nums">{pct(p.over25)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
