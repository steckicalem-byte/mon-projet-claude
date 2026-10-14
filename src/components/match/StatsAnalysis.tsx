import type { ReactNode } from 'react';
import { Info, ShieldAlert, ShieldCheck, ThumbsUp } from 'lucide-react';
import type { Dataset, Match } from '@/types';
import type { ModelParams, Prediction } from '@/lib/model/poisson';
import { buildAutoAnalysis, type FactorTone } from '@/lib/autoAnalysis';
import { headToHead, matchReliability, perGame, teamSplits, type Record_ } from '@/lib/teamStats';
import { relativeTime, shortDate, teamForm } from '@/lib/format';
import { cn } from '@/lib/cn';
import { FormChips, TeamCrest } from './parts';

function Card({ title, children, className, aside }: { title: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn('card p-5', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const confCls = {
  élevée: 'bg-brand-500/15 text-brand-700 ring-brand-500/30 dark:text-brand-300',
  moyenne: 'bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-300',
  faible: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300',
};

/** Analyse expliquée : facteurs favorables à chaque équipe, fiabilité et fraîcheur des données. */
export function AutoAnalysisCard({ dataset, match, p, model }: { dataset: Dataset; match: Match; p: Prediction; model: ModelParams }) {
  const a = buildAutoAnalysis(dataset.matches, match, p, model, dataset.currentSeason);
  const rel = matchReliability(dataset.matches, match.home.id, match.away.id, match.utcDate);
  const demo = dataset.source === 'demo';
  const columns: Array<{ tone: FactorTone; title: string }> = [
    { tone: 'home', title: `En faveur de ${match.home.shortName}` },
    { tone: 'away', title: `En faveur de ${match.away.shortName}` },
    { tone: 'neutral', title: 'À noter' },
  ];

  return (
    <Card
      title="Analyse statistique"
      className="lg:col-span-2"
      aside={
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', demo || rel.level === 'faible' ? confCls.faible : rel.level === 'moyenne' ? confCls.moyenne : confCls.élevée)}>
          {demo || rel.level === 'faible' ? <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> : <ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
          {demo ? 'Données de démonstration' : `Fiabilité ${rel.level}`}
        </span>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-lg font-semibold">{a.headline}</p>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', confCls[a.confidence])}>Confiance {a.confidence}</span>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-muted">{a.summary}</p>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const items = a.factors.filter((f) => f.tone === col.tone);
          return (
            <div key={col.tone} className="rounded-xl bg-elevated/60 p-3">
              <h3 className={cn('mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', col.tone === 'home' ? 'text-brand-700 dark:text-brand-400' : col.tone === 'away' ? 'text-electric-500' : 'text-muted')}>
                {col.tone === 'neutral' ? <Info className="h-3.5 w-3.5" aria-hidden /> : <ThumbsUp className="h-3.5 w-3.5" aria-hidden />}
                {col.title}
              </h3>
              {items.length ? (
                <ul className="space-y-2 text-sm">{items.map((f, i) => <li key={i} className="leading-snug">{f.text}</li>)}</ul>
              ) : (
                <p className="text-sm text-muted">Aucun facteur marquant.</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">
        {demo ? 'Équipes et résultats fictifs : ces statistiques servent uniquement à la démonstration.' : `Données football-data.org mises à jour ${relativeTime(dataset.fetchedAt)}.`}{' '}
        Base : au moins {rel.minObserved} match{rel.minObserved > 1 ? 's' : ''} terminé{rel.minObserved > 1 ? 's' : ''} par équipe dans la compétition (saison en cours et précédente).
        Ces éléments décrivent le passé et ne garantissent aucun résultat ; blessures, compositions et motivation ne sont pas pris en compte.
      </p>
    </Card>
  );
}

const fmt = (n: number) => n.toFixed(1).replace('.', ',');
const rec = (r: Record_) => (r.played ? `${r.won}-${r.drawn}-${r.lost}` : '—');

/** Comparatif saison : global, domicile (équipe qui reçoit) et extérieur (équipe qui se déplace). */
export function SeasonStatsCard({ dataset, match }: { dataset: Dataset; match: Match }) {
  const sh = teamSplits(dataset.matches, match.home.id, dataset.currentSeason, match.utcDate);
  const sa = teamSplits(dataset.matches, match.away.id, dataset.currentSeason, match.utcDate);
  const fh = teamForm(dataset.matches, match.home.id, match.utcDate);
  const fa = teamForm(dataset.matches, match.away.id, match.utcDate);
  const formLabel = (f: (typeof fh)[number]) => `${shortDate(f.match.utcDate)} ${f.match.home.shortName} ${f.match.score!.home}-${f.match.score!.away} ${f.match.away.shortName}`;
  const seasonLabel = (s: number) => `${s}-${String(s + 1).slice(2)}`;

  const rows: Array<{ label: string; home: ReactNode; away: ReactNode; better?: 'home' | 'away' | null }> = [
    { label: 'Matchs joués', home: sh.overall.played, away: sa.overall.played },
    { label: 'Bilan V-N-D', home: rec(sh.overall), away: rec(sa.overall) },
    {
      label: 'Buts marqués / match',
      home: sh.overall.played ? fmt(perGame(sh.overall.goalsFor, sh.overall.played)) : '—',
      away: sa.overall.played ? fmt(perGame(sa.overall.goalsFor, sa.overall.played)) : '—',
      better: compare(perGame(sh.overall.goalsFor, sh.overall.played), perGame(sa.overall.goalsFor, sa.overall.played), true),
    },
    {
      label: 'Buts encaissés / match',
      home: sh.overall.played ? fmt(perGame(sh.overall.goalsAgainst, sh.overall.played)) : '—',
      away: sa.overall.played ? fmt(perGame(sa.overall.goalsAgainst, sa.overall.played)) : '—',
      better: compare(perGame(sh.overall.goalsAgainst, sh.overall.played), perGame(sa.overall.goalsAgainst, sa.overall.played), false),
    },
    { label: 'Matchs sans encaisser', home: sh.overall.played ? sh.overall.cleanSheets : '—', away: sa.overall.played ? sa.overall.cleanSheets : '—' },
    { label: 'À domicile / à l’extérieur', home: `${rec(sh.home)} (dom.)`, away: `${rec(sa.away)} (ext.)` },
    {
      label: 'Buts pour-contre (dom. / ext.)',
      home: sh.home.played ? `${sh.home.goalsFor}-${sh.home.goalsAgainst}` : '—',
      away: sa.away.played ? `${sa.away.goalsFor}-${sa.away.goalsAgainst}` : '—',
    },
    { label: 'Forme (5 derniers)', home: <FormChips form={fh.map((f) => ({ result: f.result, label: formLabel(f) }))} />, away: <FormChips form={fa.map((f) => ({ result: f.result, label: formLabel(f) }))} /> },
  ];

  return (
    <Card title={`Saison ${seasonLabel(sh.season)}${sa.season !== sh.season ? ` / ${seasonLabel(sa.season)}` : ''} — dans cette compétition`} className="lg:col-span-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="pb-3 text-left font-medium" />
              <th className="pb-3 text-right font-medium"><span className="inline-flex items-center gap-2">{match.home.shortName}<TeamCrest team={match.home} size="sm" /></span></th>
              <th className="pb-3 pl-6 text-left font-medium"><span className="inline-flex items-center gap-2"><TeamCrest team={match.away} size="sm" />{match.away.shortName}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line">
                <th scope="row" className="py-2.5 pr-3 text-left text-xs font-medium text-muted">{r.label}</th>
                <td className={cn('py-2.5 text-right tabular-nums', r.better === 'home' && 'font-semibold text-brand-700 dark:text-brand-400')}>{r.home}</td>
                <td className={cn('py-2.5 pl-6 tabular-nums', r.better === 'away' && 'font-semibold text-brand-700 dark:text-brand-400')}>{r.away}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function compare(a: number, b: number, higherIsBetter: boolean): 'home' | 'away' | null {
  if (!a && !b) return null;
  if (Math.abs(a - b) < 0.15) return null;
  return (a > b) === higherIsBetter ? 'home' : 'away';
}

export function HeadToHeadCard({ dataset, match }: { dataset: Dataset; match: Match }) {
  const h2h = headToHead(dataset.matches, match.home.id, match.away.id, match.utcDate, 6);
  return (
    <Card title="Confrontations directes">
      {h2h.length ? (
        <ul className="divide-y divide-line">
          {h2h.map((m) => {
            const winner = m.score!.home > m.score!.away ? m.home.id : m.score!.home < m.score!.away ? m.away.id : null;
            return (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-12 shrink-0 text-xs tabular-nums text-muted">{shortDate(m.utcDate)}</span>
                <span className={cn('min-w-0 flex-1 truncate text-right', winner === m.home.id && 'font-semibold')}>{m.home.shortName}</span>
                <span className="rounded-md bg-elevated px-2 py-0.5 font-bold tabular-nums">{m.score!.home}-{m.score!.away}</span>
                <span className={cn('min-w-0 flex-1 truncate', winner === m.away.id && 'font-semibold')}>{m.away.shortName}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aucune confrontation dans les données chargées (saison en cours et précédente de cette compétition).</p>
      )}
    </Card>
  );
}
