import { useMemo } from 'react';
import { CalendarX2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataNotice, DataToolbar, LoadingCards } from '@/components/match/parts';
import { MatchCard } from '@/components/match/MatchCard';
import { dayLabel } from '@/lib/format';
import type { Match } from '@/types';

const UPCOMING = new Set(['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED']);

export function PredictionsPage() {
  const { dataset, loading, predictMatch } = useData();

  const days = useMemo(() => {
    if (!dataset) return [];
    const now = Date.now();
    const upcoming = dataset.matches.filter((m) => UPCOMING.has(m.status) && Date.parse(m.utcDate) > now - 3 * 3_600_000);
    // Deux semaines de matchs, ou au moins les 10 prochains.
    const horizon = now + 14 * 86_400_000;
    const shown = upcoming.filter((m, i) => i < 10 || Date.parse(m.utcDate) < horizon);
    const groups = new Map<string, Match[]>();
    for (const m of shown) {
      const key = dayLabel(m.utcDate);
      groups.set(key, [...(groups.get(key) ?? []), m]);
    }
    return [...groups];
  }, [dataset]);

  return (
    <>
      <PageHeader
        title="Pronostics"
        description={dataset ? `${dataset.competition.name} · probabilités calculées par le modèle de Poisson` : 'Chargement des matchs…'}
        actions={<DataToolbar />}
      />
      <DataNotice />

      {loading && !dataset ? (
        <LoadingCards />
      ) : days.length === 0 ? (
        <EmptyState icon={CalendarX2} title="Aucun match à venir" description="La saison est peut-être terminée ou en trêve. Essayez un autre championnat." />
      ) : (
        <div className="space-y-8">
          {days.map(([day, matches]) => (
            <section key={day} aria-labelledby={`d-${day}`}>
              <h2 id={`d-${day}`} className="mb-3 text-sm font-semibold first-letter:uppercase text-muted">{day}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {matches.map((m) => {
                  const p = predictMatch(m);
                  return p ? <MatchCard key={m.id} match={m} prediction={p} /> : null;
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        Les pronostics sont des probabilités, pas des certitudes. Les paris sportifs comportent des risques : endettement, dépendance…
        Appelez le 09 74 75 13 13 (Joueurs Info Service, appel non surtaxé). Interdit aux mineurs.
      </p>
    </>
  );
}
