import { useMemo, useState } from 'react';
import { CalendarX2, Gem, Search, SearchX, X } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { usePrefs } from '@/context/PrefsContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { DataNotice, DataToolbar, LoadingCards } from '@/components/match/parts';
import { bestValue, MatchCard } from '@/components/match/MatchCard';
import { dayLabel, normalizeText } from '@/lib/format';
import type { Prediction } from '@/lib/model/poisson';
import type { Match } from '@/types';

const UPCOMING = new Set(['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED']);
const RANGES = [
  { key: 'today', label: "Aujourd'hui", days: 1 },
  { key: '3d', label: '3 jours', days: 3 },
  { key: '7d', label: '7 jours', days: 7 },
  { key: '14d', label: '14 jours', days: 14 },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];
type SortKey = 'date' | 'confidence';

function endOfRange(days: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function MatchesPage() {
  const { dataset, loading, predictMatch } = useData();
  const { odds, preferences } = usePrefs();
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<RangeKey>('14d');
  const [valueOnly, setValueOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('date');

  const upcoming = useMemo(() => {
    if (!dataset) return [];
    const now = Date.now();
    return dataset.matches
      .filter((m) => UPCOMING.has(m.status) && Date.parse(m.utcDate) > now - 3 * 3_600_000)
      .map((m) => ({ match: m, p: predictMatch(m) }))
      .filter((x): x is { match: Match; p: Prediction } => x.p != null);
  }, [dataset, predictMatch]);

  const filtered = useMemo(() => {
    const limit = endOfRange(RANGES.find((r) => r.key === range)!.days);
    const q = normalizeText(query.trim());
    let list = upcoming.filter(({ match }) => Date.parse(match.utcDate) < limit);
    if (q) list = list.filter(({ match }) => normalizeText(`${match.home.name} ${match.home.shortName} ${match.away.name} ${match.away.shortName}`).includes(q));
    if (valueOnly) list = list.filter(({ match, p }) => (bestValue(match, p, odds)?.ev ?? -1) * 100 >= preferences.minEdge);
    if (sort === 'confidence') list = [...list].sort((a, b) => Math.max(b.p.home, b.p.away) - Math.max(a.p.home, a.p.away));
    return list;
  }, [upcoming, range, query, valueOnly, sort, odds, preferences.minEdge]);

  const days = useMemo(() => {
    if (sort !== 'date') return [['', filtered]] as Array<[string, typeof filtered]>;
    const groups = new Map<string, typeof filtered>();
    for (const x of filtered) {
      const key = dayLabel(x.match.utcDate);
      groups.set(key, [...(groups.get(key) ?? []), x]);
    }
    return [...groups];
  }, [filtered, sort]);

  const filtersActive = query !== '' || valueOnly || range !== '14d';
  const reset = () => {
    setQuery('');
    setValueOnly(false);
    setRange('14d');
  };

  return (
    <>
      <PageHeader
        title="Matchs & pronostics"
        description={dataset ? `${dataset.competition.name} · probabilités estimées par le modèle statistique` : 'Chargement des matchs…'}
        actions={<DataToolbar />}
      />
      <DataNotice />

      {/* Recherche et filtres */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            className="field h-11 pl-10 pr-10"
            placeholder="Rechercher une équipe…"
            aria-label="Rechercher une équipe"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label="Effacer la recherche">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtres">
          {RANGES.map((r) => (
            <button key={r.key} type="button" className="chip" aria-pressed={range === r.key} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />
          <button type="button" className="chip" aria-pressed={valueOnly} onClick={() => setValueOnly((v) => !v)} title="Matchs où une cote que vous avez saisie dépasse votre seuil de value">
            <Gem className="h-3.5 w-3.5" aria-hidden /> Value uniquement
          </button>
          <button type="button" className="chip" aria-pressed={sort === 'confidence'} onClick={() => setSort((s) => (s === 'date' ? 'confidence' : 'date'))}>
            Trier par confiance
          </button>
        </div>
      </div>

      {loading && !dataset ? (
        <LoadingCards count={6} />
      ) : upcoming.length === 0 ? (
        <EmptyState icon={CalendarX2} title="Aucun match à venir" description="La saison est peut-être terminée ou en trêve. Essayez une autre compétition." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Aucun match ne correspond"
          description={valueOnly ? 'Saisissez des cotes sur la page d’un match pour détecter des value bets.' : 'Essayez une autre équipe ou une période plus longue.'}
          action={filtersActive ? <Button variant="secondary" onClick={reset}>Réinitialiser les filtres</Button> : undefined}
        />
      ) : (
        <div className="space-y-8">
          <p className="text-xs text-muted" aria-live="polite">{filtered.length} match{filtered.length > 1 ? 's' : ''}</p>
          {days.map(([day, items]) => (
            <section key={day || 'all'} aria-label={day || 'Matchs triés par confiance'}>
              {day && <h2 className="mb-3 text-sm font-semibold text-muted first-letter:uppercase">{day}</h2>}
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map(({ match, p }) => <MatchCard key={match.id} match={match} prediction={p} showDate={!day} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        Les pronostics sont des probabilités, pas des certitudes ni des garanties de gain. Les paris sportifs comportent des risques : endettement, dépendance…
        Appelez le 09 74 75 13 13 (Joueurs Info Service, appel non surtaxé). Interdit aux mineurs.
      </p>
    </>
  );
}
