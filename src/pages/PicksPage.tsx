import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, CircleSlash, Clock, Download, Search, SearchX, Star, Target, Trophy, X, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { PickRow } from '@/components/user/PickRow';
import { buildExport, useUserData } from '@/context/UserDataContext';
import { competitionByCode } from '@/lib/competitions';
import { euros, normalizeText, num, pct, shortDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { MARKETS } from '@/lib/user/markets';
import { computeStats, cumulativeUnits, hitRateByMarket } from '@/lib/user/stats';
import { download, picksToCsv } from '@/lib/user/export';
import type { MarketKey, PickStatus } from '@/lib/user/types';

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: typeof Target; label: string; value: ReactNode; hint?: ReactNode; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icon className={cn('h-3.5 w-3.5', tone === 'good' && 'text-brand-700 dark:text-brand-400', tone === 'bad' && 'text-red-500', tone === 'warn' && 'text-amber-500')} aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const tooltipStyle = { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 10, fontSize: 12, color: 'rgb(var(--fg))' };
const axis = { stroke: 'rgb(var(--muted))', fontSize: 11, tickLine: false, axisLine: false } as const;

const STATUS_FILTERS: Array<{ key: 'all' | PickStatus; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'won', label: 'Gagnés' },
  { key: 'lost', label: 'Perdus' },
  { key: 'void', label: 'Annulés' },
];
const PERIODS = [
  { key: 'all', label: 'Toute la période', days: 0 },
  { key: '7', label: '7 derniers jours', days: 7 },
  { key: '30', label: '30 derniers jours', days: 30 },
  { key: '90', label: '90 derniers jours', days: 90 },
];

export function PicksPage() {
  const { data } = useUserData();
  const picks = data.picks;
  const stats = useMemo(() => computeStats(picks), [picks]);
  const curve = useMemo(() => cumulativeUnits(picks), [picks]);
  const byMarket = useMemo(() => hitRateByMarket(picks).map((m) => ({ ...m, name: MARKETS[m.market].label, ratePct: Math.round(m.rate * 100) })), [picks]);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | PickStatus>('all');
  const [market, setMarket] = useState<'all' | MarketKey>('all');
  const [competition, setCompetition] = useState('all');
  const [period, setPeriod] = useState('all');
  const [limit, setLimit] = useState(30);

  const competitions = useMemo(() => [...new Set(picks.map((p) => p.competition))], [picks]);
  const history = useMemo(() => {
    const q = normalizeText(query.trim());
    const days = PERIODS.find((p) => p.key === period)!.days;
    const since = days ? Date.now() - days * 86_400_000 : 0;
    return picks
      .filter((p) => status === 'all' || p.status === status)
      .filter((p) => market === 'all' || p.market === market)
      .filter((p) => competition === 'all' || p.competition === competition)
      .filter((p) => !since || Date.parse(p.match.utcDate) >= since)
      .filter((p) => !q || normalizeText(`${p.match.home.name} ${p.match.away.name} ${p.match.home.shortName} ${p.match.away.shortName} ${p.note}`).includes(q))
      .sort((a, b) => b.match.utcDate.localeCompare(a.match.utcDate) || b.createdAt.localeCompare(a.createdAt));
  }, [picks, query, status, market, competition, period]);
  const filtersActive = query !== '' || status !== 'all' || market !== 'all' || competition !== 'all' || period !== 'all';
  const stamp = new Date().toISOString().slice(0, 10);
  const settled = stats.byStatus.won + stats.byStatus.lost + stats.byStatus.void;

  return (
    <>
      <PageHeader
        title="Mes pronostics"
        description="Suivi de vos sélections : règlement automatique au score final (90 minutes)."
        actions={
          <>
            <Button variant="secondary" disabled={!picks.length} onClick={() => download(`pronofoot-pronostics-${stamp}.csv`, picksToCsv(picks), 'text/csv;charset=utf-8')}>
              <Download className="h-4 w-4" aria-hidden /> CSV
            </Button>
            <Button variant="secondary" onClick={() => download(`pronofoot-${stamp}.json`, JSON.stringify(buildExport(data), null, 2), 'application/json')}>
              <Download className="h-4 w-4" aria-hidden /> Tout exporter
            </Button>
          </>
        }
      />

      {picks.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aucun pronostic enregistré"
          description="Sur la page d'un match, ouvrez « Mon suivi » puis « Ajouter un pronostic » : type de pari, cote et mise. Il sera réglé automatiquement à la fin du match."
          action={<Link to="/matchs" className="font-medium text-brand-700 hover:underline dark:text-brand-400">Choisir un match</Link>}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi icon={Star} label="Matchs sauvegardés" value={data.bookmarks.length} />
            <Kpi icon={Clock} label="En attente" value={stats.byStatus.pending} tone="warn" />
            <Kpi icon={CheckCircle2} label="Gagnés" value={stats.byStatus.won} tone="good" />
            <Kpi icon={XCircle} label="Perdus" value={stats.byStatus.lost} tone="bad" />
            <Kpi icon={CircleSlash} label="Annulés" value={stats.byStatus.void} />
            <Kpi
              icon={Trophy}
              label="Taux de réussite"
              value={stats.hitRate == null ? '—' : pct(stats.hitRate)}
              hint={stats.hitRate == null ? 'Aucun pronostic réglé' : `Sur ${stats.byStatus.won + stats.byStatus.lost} réglés (hors annulés)`}
              tone="good"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi icon={Target} label="Gain net (1 unité par pari)" value={`${stats.units > 0 ? '+' : ''}${num(stats.units)} u`} hint={`${settled} pronostic${settled > 1 ? 's' : ''} réglé${settled > 1 ? 's' : ''}`} tone={stats.units >= 0 ? 'good' : 'bad'} />
            <Kpi icon={Target} label="Gain net en euros" value={stats.staked ? `${stats.profit > 0 ? '+' : ''}${euros(stats.profit)}` : '—'} hint={stats.staked ? `Sur ${euros(stats.staked)} misés` : 'Renseignez des mises pour le calculer'} tone={stats.profit >= 0 ? 'good' : 'bad'} />
            <Kpi icon={Target} label="Rendement (ROI)" value={stats.roi == null ? '—' : `${stats.roi > 0 ? '+' : ''}${pct(stats.roi, 1)}`} hint={stats.avgOdds ? `Cote moyenne ${num(stats.avgOdds)}` : undefined} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="text-sm font-semibold">Gain cumulé (unités)</h2>
              <p className="mb-3 text-xs text-muted">1 unité misée par pronostic réglé : gagné = cote − 1, perdu = −1, annulé = 0.</p>
              {curve.length >= 2 ? (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curve} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                      <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(d: string) => shortDate(d)} minTickGap={24} {...axis} />
                      <YAxis tickFormatter={(v: number) => num(v, 1)} width={44} {...axis} />
                      <ReferenceLine y={0} stroke="rgb(var(--muted))" strokeOpacity={0.6} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ stroke: 'rgb(var(--muted))', strokeDasharray: '3 3' }}
                        labelFormatter={(d: string, items) => `${shortDate(d)} · ${(items?.[0]?.payload as { label?: string } | undefined)?.label ?? ''}`}
                        formatter={(v: number) => [`${v > 0 ? '+' : ''}${num(v)} u`, 'Gain cumulé']}
                      />
                      <Line type="linear" dataKey="units" stroke="rgb(var(--chart))" strokeWidth={2} dot={{ r: 4, fill: 'rgb(var(--chart))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted">Le graphique apparaîtra après au moins deux pronostics réglés.</p>
              )}
            </section>

            <section className="card p-5">
              <h2 className="text-sm font-semibold">Taux de réussite par type de pari</h2>
              <p className="mb-3 text-xs text-muted">Pronostics gagnés / réglés (hors annulés), par marché.</p>
              {byMarket.length ? (
                <div style={{ height: Math.max(120, byMarket.length * 44 + 20) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byMarket} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={10}>
                      <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v} %`} {...axis} />
                      <YAxis type="category" dataKey="name" width={140} {...axis} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: 'rgb(var(--elevated))' }}
                        formatter={(_v: number, _n, item) => {
                          const d = item.payload as (typeof byMarket)[number];
                          return [`${d.ratePct} % (${d.won}/${d.decided})`, 'Réussite'];
                        }}
                      />
                      <Bar dataKey="ratePct" fill="rgb(var(--chart))" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                        <LabelList dataKey="ratePct" position="right" formatter={(v: number) => `${v} %`} fill="rgb(var(--muted))" fontSize={11} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted">Aucun pronostic gagné ou perdu pour l'instant.</p>
              )}
            </section>
          </div>

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold">Historique</h2>
            <div className="mb-4 space-y-3">
              <div className="flex flex-col gap-2 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                  <input type="search" className="field h-10 pl-10 pr-10" placeholder="Équipe ou note…" aria-label="Rechercher dans l'historique" value={query} onChange={(e) => setQuery(e.target.value)} />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label="Effacer la recherche">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
                  <FilterSelect aria-label="Type de pari" value={market} onChange={(e) => setMarket(e.target.value as 'all' | MarketKey)}>
                    <option value="all">Tous les paris</option>
                    {(Object.keys(MARKETS) as MarketKey[]).map((k) => <option key={k} value={k}>{MARKETS[k].label}</option>)}
                  </FilterSelect>
                  <FilterSelect aria-label="Compétition" value={competition} onChange={(e) => setCompetition(e.target.value)}>
                    <option value="all">Toutes compétitions</option>
                    {competitions.map((c) => <option key={c} value={c}>{competitionByCode(c).name}</option>)}
                  </FilterSelect>
                  <FilterSelect aria-label="Période" value={period} onChange={(e) => setPeriod(e.target.value)}>
                    {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </FilterSelect>
                </div>
              </div>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Statut">
                {STATUS_FILTERS.map((f) => (
                  <button key={f.key} type="button" className="chip" aria-pressed={status === f.key} onClick={() => setStatus(f.key)}>
                    {f.label}
                    <span className="text-xs text-muted">{f.key === 'all' ? stats.total : stats.byStatus[f.key]}</span>
                  </button>
                ))}
              </div>
            </div>

            {history.length ? (
              <>
                <p className="text-xs text-muted" aria-live="polite">{history.length} pronostic{history.length > 1 ? 's' : ''}</p>
                <ul className="divide-y divide-line">{history.slice(0, limit).map((p) => <PickRow key={p.id} pick={p} showMatch />)}</ul>
                {history.length > limit && (
                  <div className="mt-3 text-center">
                    <Button variant="secondary" onClick={() => setLimit((l) => l + 30)}>Afficher plus ({history.length - limit} restants)</Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={SearchX}
                title="Aucun pronostic ne correspond"
                description="Modifiez la recherche ou les filtres."
                action={filtersActive ? <Button variant="secondary" onClick={() => { setQuery(''); setStatus('all'); setMarket('all'); setCompetition('all'); setPeriod('all'); }}>Réinitialiser les filtres</Button> : undefined}
              />
            )}
          </section>

          <p className="text-center text-xs text-muted">
            Ces statistiques décrivent vos résultats passés et ne prédisent pas les suivants. Jouer comporte des risques : 09 74 75 13 13 (Joueurs Info Service).
          </p>
        </div>
      )}
    </>
  );
}
