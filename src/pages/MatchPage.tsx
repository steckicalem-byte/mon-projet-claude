import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, SearchX, Star } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { usePrefs } from '@/context/PrefsContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProbBar, TeamCrest } from '@/components/match/parts';
import { AiAnalysisCard } from '@/components/match/AiAnalysisCard';
import { AutoAnalysisCard, HeadToHeadCard, SeasonStatsCard } from '@/components/match/StatsAnalysis';
import { BookmarkButton } from '@/components/user/BookmarkButton';
import { BookmarkEditor } from '@/components/user/BookmarkEditor';
import { CategoryPill } from '@/components/user/CategoryPill';
import { PickForm } from '@/components/user/PickForm';
import { PickRow } from '@/components/user/PickRow';
import { Button } from '@/components/ui/Button';
import { useUserData } from '@/context/UserDataContext';
import { COMPETITIONS } from '@/lib/competitions';
import { bookmarkId } from '@/lib/user/types';
import { bookmakerMargin, expectedValue, fairOdds, kelly } from '@/lib/model/betting';
import type { Prediction } from '@/lib/model/poisson';
import { dayLabel, euros, num, parseOdds, pct, timeLabel } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Match, Odds } from '@/types';

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('card p-5', className)}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

function MarketRow({ label, p }: { label: string; p: number }) {
  return (
    <tr className="border-t border-line first:border-0">
      <td className="py-2 pr-2">{label}</td>
      <td className="py-2 text-right font-semibold tabular-nums">{pct(p, 1)}</td>
      <td className="py-2 pl-4 text-right tabular-nums text-muted">{num(fairOdds(p))}</td>
    </tr>
  );
}

function ScoreGrid({ p }: { p: Prediction }) {
  const n = 6;
  const max = Math.max(...p.matrix.slice(0, n).flatMap((row) => row.slice(0, n)));
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-separate border-spacing-1 text-xs tabular-nums">
        <caption className="mb-2 text-left text-xs text-muted">Lignes : buts domicile · colonnes : buts extérieur</caption>
        <thead>
          <tr>
            <th />
            {Array.from({ length: n }, (_, y) => <th key={y} scope="col" className="font-medium text-muted">{y}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, x) => (
            <tr key={x}>
              <th scope="row" className="pr-1 font-medium text-muted">{x}</th>
              {Array.from({ length: n }, (_, y) => {
                const v = p.matrix[x][y];
                return (
                  <td
                    key={y}
                    className="h-9 w-11 rounded-md text-center"
                    style={{ background: `rgb(var(--brand) / ${(0.08 + 0.85 * (v / max)).toFixed(2)})` }}
                    title={`${x}-${y} : ${pct(v, 1)}`}
                  >
                    <span className={v / max > 0.5 ? 'font-semibold text-on-brand' : ''}>{(v * 100).toFixed(1).replace('.', ',')}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OddsComparator({ match, p }: { match: Match; p: Prediction }) {
  const { odds, setOdds, preferences } = usePrefs();
  const saved = odds[match.id] ?? {};
  const [draft, setDraft] = useState({ home: saved.home?.toString() ?? '', draw: saved.draw?.toString() ?? '', away: saved.away?.toString() ?? '' });

  useEffect(() => {
    const parsed: Odds = { home: parseOdds(draft.home), draw: parseOdds(draft.draw), away: parseOdds(draft.away) };
    setOdds(match.id, parsed);
  }, [draft, match.id, setOdds]);

  const rows = [
    { key: 'home' as const, label: `1 · ${match.home.shortName}`, p: p.home },
    { key: 'draw' as const, label: 'N · Match nul', p: p.draw },
    { key: 'away' as const, label: `2 · ${match.away.shortName}`, p: p.away },
  ];
  const parsed = rows.map((r) => parseOdds(draft[r.key]));
  const margin = parsed.every((o) => o) ? bookmakerMargin(parsed as number[]) : null;

  return (
    <Section title="Comparer avec les cotes de votre bookmaker" className="lg:col-span-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="pb-2 font-medium">Issue</th>
              <th className="pb-2 font-medium">Cote proposée</th>
              <th className="pb-2 text-right font-medium">Proba. modèle</th>
              <th className="pb-2 text-right font-medium">Proba. bookmaker</th>
              <th className="pb-2 text-right font-medium">Espérance</th>
              <th className="pb-2 text-right font-medium">Mise Kelly</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const o = parsed[i];
              const ev = o ? expectedValue(r.p, o) : null;
              const stake = o ? kelly(r.p, o) * preferences.kellyFraction * preferences.bankroll : null;
              const isValue = ev != null && ev * 100 >= preferences.minEdge;
              return (
                <tr key={r.key} className={cn('border-t border-line', isValue && 'bg-brand-500/10')}>
                  <td className="py-2 pr-2 font-medium">{r.label}</td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="decimal"
                      className="field h-9 w-24 py-0"
                      placeholder={num(fairOdds(r.p))}
                      aria-label={`Cote ${r.label}`}
                      value={draft[r.key]}
                      onChange={(e) => setDraft((d) => ({ ...d, [r.key]: e.target.value }))}
                    />
                  </td>
                  <td className="py-2 text-right tabular-nums">{pct(r.p, 1)}</td>
                  <td className="py-2 text-right tabular-nums text-muted">{o ? pct(1 / o, 1) : '—'}</td>
                  <td className={cn('py-2 text-right font-semibold tabular-nums', ev == null ? 'text-muted' : ev > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                    {ev == null ? '—' : `${ev > 0 ? '+' : ''}${pct(ev, 1)}`}
                  </td>
                  <td className="py-2 text-right tabular-nums">{stake == null ? '—' : stake > 0 ? euros(stake) : 'Ne pas jouer'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Le champ vide affiche la cote « juste » du modèle. Espérance = proba × cote − 1 (gain moyen pour 1 € misé, si le modèle est juste).
        Mise = {pct(preferences.kellyFraction)} du critère de Kelly sur une bankroll de {euros(preferences.bankroll)} (modifiable dans les paramètres).
        {margin != null && <> Marge du bookmaker sur ce match : <strong>{pct(margin, 1)}</strong>.</>}
      </p>
    </Section>
  );
}

function MyTracking({ match, competition, p }: { match: Match; competition: string; p: Prediction }) {
  const { data, toggleBookmark } = useUserData();
  const [editing, setEditing] = useState(false);
  const bookmark = data.bookmarks.find((b) => b.id === bookmarkId(competition, match.id)) ?? null;
  const picks = data.picks.filter((x) => x.competition === competition && x.matchId === match.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const cats = bookmark ? data.categories.filter((c) => bookmark.categoryIds.includes(c.id)) : [];

  return (
    <Section title="Mon suivi" className="lg:col-span-2">
      {bookmark ? (
        <div className="mb-5 flex flex-col gap-3 rounded-xl bg-elevated/60 p-3 sm:flex-row sm:items-start">
          <Star className="mt-0.5 h-5 w-5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Dans vos favoris</p>
            {cats.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{cats.map((c) => <CategoryPill key={c.id} category={c} />)}</div>}
            {bookmark.note ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{bookmark.note}</p> : <p className="mt-1 text-xs text-muted">Aucune note.</p>}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Catégories & note
          </Button>
        </div>
      ) : (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line p-3">
          <p className="text-sm text-muted">Ajoutez ce match à vos favoris pour le retrouver, le classer et l’annoter.</p>
          <Button variant="secondary" size="sm" onClick={() => toggleBookmark(match, competition)}>
            <Star className="h-3.5 w-3.5" aria-hidden /> Ajouter aux favoris
          </Button>
        </div>
      )}

      <h3 className="mb-1 text-sm font-semibold">Mes pronostics sur ce match</h3>
      {picks.length ? (
        <ul className="mb-4 divide-y divide-line">{picks.map((x) => <PickRow key={x.id} pick={x} />)}</ul>
      ) : (
        <p className="mb-4 text-sm text-muted">Aucun pronostic enregistré.</p>
      )}
      <details className="group rounded-xl border border-line p-3 open:bg-elevated/40" open={picks.length === 0}>
        <summary className="cursor-pointer select-none text-sm font-medium text-brand-700 dark:text-brand-400">Ajouter un pronostic</summary>
        <div className="mt-3">
          <PickForm match={match} competition={competition} prediction={p} />
        </div>
      </details>
      <BookmarkEditor bookmark={bookmark} open={editing} onClose={() => setEditing(false)} />
    </Section>
  );
}

export function MatchPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { dataset, loading, predictMatch, model } = useData();
  const { preferences, updatePreferences } = usePrefs();
  const wanted = params.get('c');
  const validWanted = wanted && COMPETITIONS.some((c) => c.code === wanted) ? wanted : null;

  // Lien vers un match d'une autre compétition (favori, historique) : on bascule dessus.
  useEffect(() => {
    if (validWanted && validWanted !== preferences.competition) updatePreferences({ competition: validWanted });
  }, [validWanted, preferences.competition, updatePreferences]);

  const switching = Boolean(validWanted && dataset && dataset.competition.code !== validWanted);
  const match = switching ? undefined : dataset?.matches.find((m) => String(m.id) === id);
  const p = match ? predictMatch(match) : null;

  if (!dataset || switching || (loading && !match)) return <div className="skeleton h-72" aria-busy="true" aria-label="Chargement du match" />;
  if (!match || !p) {
    return (
      <EmptyState
        icon={SearchX}
        title="Match introuvable"
        description="Ce match n'est plus disponible dans les données de cette compétition (saison trop ancienne ou changement de source)."
        action={<Link to="/matchs" className="font-medium text-brand-500 hover:underline">Retour aux matchs</Link>}
      />
    );
  }


  return (
    <>
      <Link to="/matchs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Matchs
      </Link>

      <header className="card relative mb-5 p-5 sm:p-6">
        <BookmarkButton match={match} competition={dataset.competition.code} size="lg" className="absolute right-3 top-3" />
        <p className="mb-4 text-center text-xs first-letter:uppercase text-muted">
          {dataset.competition.name}{match.matchday ? ` · Journée ${match.matchday}` : ''} · {dayLabel(match.utcDate)} à {timeLabel(match.utcDate)}
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamCrest team={match.home} size="lg" />
            <h1 className="text-base font-bold sm:text-lg">{match.home.name}</h1>
          </div>
          <div className="text-center">
            {match.score ? (
              <>
                <div className="text-3xl font-bold tabular-nums">{match.score.home} – {match.score.away}</div>
                <div className="text-xs text-muted">Score final</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold tabular-nums text-muted">{p.topScores[0].home} – {p.topScores[0].away}</div>
                <div className="text-xs text-muted">Score le plus probable</div>
              </>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamCrest team={match.away} size="lg" />
            <h1 className="text-base font-bold sm:text-lg">{match.away.name}</h1>
          </div>
        </div>
        <div className="mx-auto mt-5 max-w-md">
          <ProbBar home={p.home} draw={p.draw} away={p.away} />
          <p className="mt-3 text-center text-xs text-muted">
            Buts attendus : <strong className="text-fg">{num(p.lambdaHome)}</strong> – <strong className="text-fg">{num(p.lambdaAway)}</strong>
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {model && <AutoAnalysisCard dataset={dataset} match={match} p={p} model={model} />}

        <AiAnalysisCard dataset={dataset} match={match} model={p} />

        <Section title="Marchés">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Pari</th>
                <th className="pb-2 text-right font-medium">Probabilité</th>
                <th className="pb-2 pl-4 text-right font-medium">Cote juste</th>
              </tr>
            </thead>
            <tbody>
              <MarketRow label={`1 · ${match.home.shortName}`} p={p.home} />
              <MarketRow label="N · Match nul" p={p.draw} />
              <MarketRow label={`2 · ${match.away.shortName}`} p={p.away} />
              <MarketRow label="1N (double chance)" p={p.home + p.draw} />
              <MarketRow label="N2 (double chance)" p={p.draw + p.away} />
              <MarketRow label="12 (pas de nul)" p={p.home + p.away} />
              <MarketRow label="Plus de 1,5 buts" p={p.over15} />
              <MarketRow label="Plus de 2,5 buts" p={p.over25} />
              <MarketRow label="Moins de 2,5 buts" p={1 - p.over25} />
              <MarketRow label="Plus de 3,5 buts" p={p.over35} />
              <MarketRow label="Les deux équipes marquent" p={p.btts} />
            </tbody>
          </table>
        </Section>

        <Section title="Probabilité de chaque score (%)">
          <ScoreGrid p={p} />
          <ol className="mt-4 flex flex-wrap gap-2 text-xs">
            {p.topScores.map((s, i) => (
              <li key={i} className="rounded-lg bg-elevated px-2.5 py-1 tabular-nums">
                <strong>{s.home}-{s.away}</strong> {pct(s.p, 1)}
              </li>
            ))}
          </ol>
        </Section>

        <MyTracking match={match} competition={dataset.competition.code} p={p} />

        <OddsComparator match={match} p={p} />

        <SeasonStatsCard dataset={dataset} match={match} />

        <HeadToHeadCard dataset={dataset} match={match} />

        <Section title="Méthode">
          <p className="text-sm text-muted">
            Modèle de Poisson (Dixon-Coles) estimé sur {dataset.matches.filter((m) => m.score).length} matchs des deux dernières saisons de la compétition,
            les plus récents pesant davantage (demi-vie de 6 mois). Il ne connaît ni les blessures, ni les suspensions, ni la motivation : croisez
            toujours avec l'actualité. Les probabilités ne sont jamais des garanties de gain.
          </p>
        </Section>
      </div>
    </>
  );
}
