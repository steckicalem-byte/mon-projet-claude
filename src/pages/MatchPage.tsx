import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { usePrefs } from '@/context/PrefsContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormChips, ProbBar, TeamCrest } from '@/components/match/parts';
import { AiAnalysisCard } from '@/components/match/AiAnalysisCard';
import { bookmakerMargin, expectedValue, fairOdds, kelly } from '@/lib/model/betting';
import type { Prediction } from '@/lib/model/poisson';
import { dayLabel, euros, num, parseOdds, pct, shortDate, teamForm, timeLabel } from '@/lib/format';
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
                    style={{ background: `rgb(139 92 246 / ${(0.08 + 0.85 * (v / max)).toFixed(2)})` }}
                    title={`${x}-${y} : ${pct(v, 1)}`}
                  >
                    <span className={v / max > 0.5 ? 'font-semibold text-white' : ''}>{(v * 100).toFixed(1).replace('.', ',')}</span>
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

export function MatchPage() {
  const { id } = useParams();
  const { dataset, predictMatch } = useData();
  const match = dataset?.matches.find((m) => String(m.id) === id);
  const p = match ? predictMatch(match) : null;

  if (!dataset) return <div className="card h-64 animate-pulse bg-elevated/50" aria-busy="true" />;
  if (!match || !p) {
    return (
      <EmptyState
        icon={SearchX}
        title="Match introuvable"
        description="Ce match n'appartient pas au championnat sélectionné."
        action={<Link to="/" className="font-medium text-brand-500 hover:underline">Retour aux pronostics</Link>}
      />
    );
  }

  const formHome = teamForm(dataset.matches, match.home.id, match.utcDate);
  const formAway = teamForm(dataset.matches, match.away.id, match.utcDate);
  const label = (f: (typeof formHome)[number]) => `${shortDate(f.match.utcDate)} ${f.match.home.shortName} ${f.match.score!.home}-${f.match.score!.away} ${f.match.away.shortName}`;

  return (
    <>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Pronostics
      </Link>

      <header className="card mb-5 p-5 sm:p-6">
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

        <OddsComparator match={match} p={p} />

        <Section title="Forme (5 derniers matchs)" className="lg:col-span-2">
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              { team: match.home, form: formHome },
              { team: match.away, form: formAway },
            ].map(({ team, form }) => (
              <div key={team.id} className="flex items-center justify-between gap-3 rounded-xl bg-elevated/60 px-3 py-2.5">
                <dt className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <TeamCrest team={team} size="sm" />
                  <span className="truncate">{team.shortName}</span>
                </dt>
                <dd><FormChips form={form.map((f) => ({ result: f.result, label: label(f) }))} /></dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted">
            Méthode : modèle de Poisson (Dixon-Coles) estimé sur {dataset.matches.filter((m) => m.score).length} matchs des deux dernières saisons,
            les plus récents pesant davantage (demi-vie de 6 mois). Il ne connaît ni les blessures, ni les suspensions, ni la motivation :
            croisez toujours avec l'actualité.
          </p>
        </Section>
      </div>
    </>
  );
}
