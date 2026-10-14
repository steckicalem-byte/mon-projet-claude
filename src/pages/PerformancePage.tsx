import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '@/context/DataContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataNotice, DataToolbar, LoadingCards } from '@/components/match/parts';
import type { BacktestSummary } from '@/lib/model/backtest';
import BacktestWorker from '@/lib/model/backtest.worker?worker&inline';
import { OUTCOME_LABEL, num, pct, shortDate } from '@/lib/format';
import { cn } from '@/lib/cn';

function Stat({ label, value, baseline, better, hint }: { label: string; value: string; baseline: string; better: boolean; hint: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">
        Référence naïve : {baseline}{' '}
        <span className={better ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{better ? '· meilleur' : '· moins bon'}</span>
      </p>
      <p className="mt-2 text-[11px] leading-snug text-muted">{hint}</p>
    </div>
  );
}

export function PerformancePage() {
  const { dataset, loading } = useData();
  const [summary, setSummary] = useState<BacktestSummary | null>(null);

  useEffect(() => {
    setSummary(null);
    if (!dataset) return;
    // Évaluation dans un Web Worker : la page reste réactive pendant le calcul.
    const worker = new BacktestWorker();
    worker.onmessage = (e: MessageEvent<BacktestSummary>) => {
      setSummary(e.data);
      worker.terminate();
    };
    worker.postMessage(dataset.matches);
    return () => worker.terminate();
  }, [dataset]);

  const calibration = summary?.calibration.map((c) => ({ ...c, predicted: c.predicted * 100, observed: c.observed * 100 })) ?? [];
  const recent = summary ? summary.records.slice(-20).reverse() : [];

  return (
    <>
      <PageHeader
        title="Performance du modèle"
        description="Chaque match passé est prédit uniquement avec les matchs joués avant lui"
        actions={<DataToolbar />}
      />
      <DataNotice />
      {(loading && !dataset) || !summary ? (
        <LoadingCards />
      ) : summary.records.length === 0 ? (
        <p className="card p-6 text-sm text-muted">Pas encore assez de matchs terminés pour évaluer le modèle.</p>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            Évaluation sur <strong className="text-fg">{summary.records.length}</strong> matchs. La « référence naïve » prédit toujours la répartition
            1/N/2 observée jusque-là (par exemple « victoire à domicile » à chaque fois) : un modèle utile doit faire mieux.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Bon résultat 1N2" value={pct(summary.accuracy, 1)} baseline={pct(summary.baselineAccuracy, 1)} better={summary.accuracy > summary.baselineAccuracy}
              hint="Part des matchs où l'issue la plus probable s'est réalisée." />
            <Stat label="Score de Brier" value={num(summary.brier, 3)} baseline={num(summary.baselineBrier, 3)} better={summary.brier < summary.baselineBrier}
              hint="Erreur quadratique des probabilités (plus bas = mieux, 0 = parfait)." />
            <Stat label="Log-loss" value={num(summary.logLoss, 3)} baseline={num(summary.baselineLogLoss, 3)} better={summary.logLoss < summary.baselineLogLoss}
              hint="Pénalise fortement l'excès de confiance (plus bas = mieux)." />
            <div className="card p-4">
              <p className="text-xs font-medium text-muted">Score exact trouvé</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{pct(summary.exactScore, 1)}</p>
              <p className="mt-2 text-[11px] leading-snug text-muted">Le score exact est très aléatoire : même le plus probable dépasse rarement 15 %.</p>
            </div>
          </div>

          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Calibration</h2>
            <p className="mb-4 mt-1 text-xs text-muted">
              Quand le modèle annonce X %, l'événement arrive-t-il X % du temps ? Plus la courbe violette suit la diagonale, plus les probabilités sont fiables.
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calibration} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" />
                  <XAxis dataKey="predicted" type="number" domain={[0, 100]} unit=" %" stroke="rgb(var(--muted))" fontSize={12} />
                  <YAxis type="number" domain={[0, 100]} unit=" %" stroke="rgb(var(--muted))" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, name: string) => [`${num(v, 1)} %`, name]}
                    labelFormatter={(v: number) => `Prévu : ${num(v, 1)} %`}
                  />
                  <Line data={[{ predicted: 0, observed: 0 }, { predicted: 100, observed: 100 }]} dataKey="observed" name="Parfait" stroke="rgb(var(--muted))" strokeDasharray="4 4" dot={false} isAnimationActive={false} legendType="none" />
                  <Line dataKey="observed" name="Observé" stroke="rgb(var(--chart))" strokeWidth={2} dot={{ r: 3, fill: 'rgb(var(--chart))' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card overflow-x-auto p-0">
            <h2 className="px-5 pt-5 text-sm font-semibold uppercase tracking-wide text-muted">20 derniers matchs</h2>
            <table className="mt-3 w-full min-w-[36rem] text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Match</th>
                  <th className="py-2 text-right font-medium">1 / N / 2 prévus</th>
                  <th className="py-2 text-center font-medium">Prono</th>
                  <th className="px-5 py-2 text-right font-medium">Résultat</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => {
                  const ok = r.pick === r.outcome;
                  return (
                    <tr key={r.match.id} className="border-t border-line first:border-0">
                      <td className="px-5 py-2 tabular-nums text-muted">{shortDate(r.match.utcDate)}</td>
                      <td className="py-2">{r.match.home.shortName} – {r.match.away.shortName}</td>
                      <td className="py-2 text-right tabular-nums text-muted">{pct(r.probs.H)} / {pct(r.probs.D)} / {pct(r.probs.A)}</td>
                      <td className="py-2 text-center font-semibold">{OUTCOME_LABEL[r.pick]}</td>
                      <td className="px-5 py-2 text-right">
                        <span className={cn('inline-flex items-center gap-1.5 font-semibold tabular-nums', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                          {r.match.score!.home}-{r.match.score!.away}
                          {ok ? <Check className="h-4 w-4" aria-label="Prono correct" /> : <X className="h-4 w-4" aria-label="Prono incorrect" />}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </>
  );
}
