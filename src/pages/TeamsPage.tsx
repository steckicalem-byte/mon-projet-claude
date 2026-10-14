import { useMemo } from 'react';
import { CartesianGrid, LabelList, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { useData } from '@/context/DataContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataNotice, DataToolbar, FormChips, LoadingCards, TeamCrest } from '@/components/match/parts';
import { teamRatings } from '@/lib/model/poisson';
import { num, teamForm } from '@/lib/format';
import type { Team } from '@/types';

interface Row {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export function TeamsPage() {
  const { dataset, model, loading } = useData();

  const rows = useMemo(() => {
    if (!dataset || !model) return [];
    const season = dataset.matches.filter((m) => m.season === dataset.currentSeason);
    const table = new Map<number, Row>();
    for (const m of season) {
      for (const t of [m.home, m.away]) if (!table.has(t.id)) table.set(t.id, { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
      if (m.status !== 'FINISHED' || !m.score) continue;
      const h = table.get(m.home.id)!;
      const a = table.get(m.away.id)!;
      h.played++; a.played++;
      h.gf += m.score.home; h.ga += m.score.away;
      a.gf += m.score.away; a.ga += m.score.home;
      if (m.score.home > m.score.away) { h.won++; a.lost++; h.points += 3; }
      else if (m.score.home < m.score.away) { a.won++; h.lost++; a.points += 3; }
      else { h.drawn++; a.drawn++; h.points++; a.points++; }
    }
    const ratings = new Map(teamRatings(model, table.keys()).map((r) => [r.team.id, r]));
    const now = new Date().toISOString();
    return [...table.values()]
      .sort((x, y) => y.points - x.points || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf)
      .map((r) => ({ ...r, rating: ratings.get(r.team.id)!, form: teamForm(season, r.team.id, now) }));
  }, [dataset, model]);

  const chart = rows.map((r) => ({ name: r.team.tla, full: r.team.name, x: r.rating.xgFor, y: r.rating.xgAgainst }));
  const mean = (key: 'x' | 'y') => (chart.length ? chart.reduce((s, c) => s + c[key], 0) / chart.length : 1.3);

  return (
    <>
      <PageHeader title="Équipes" description="Classement de la saison et forces estimées par le modèle" actions={<DataToolbar />} />
      <DataNotice />
      {loading && !dataset ? (
        <LoadingCards />
      ) : (
        <div className="space-y-5">
          <section className="card overflow-x-auto p-0">
            <table className="w-full min-w-[46rem] text-sm">
              <caption className="sr-only">Classement et forces des équipes</caption>
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="py-3 font-medium">Équipe</th>
                  <th className="py-3 text-right font-medium" title="Matchs joués">J</th>
                  <th className="py-3 text-right font-medium">G-N-P</th>
                  <th className="py-3 text-right font-medium" title="Buts pour : buts contre">Buts</th>
                  <th className="py-3 text-right font-medium">Pts</th>
                  <th className="py-3 pl-4 font-medium">Forme</th>
                  <th className="py-3 text-right font-medium" title="Buts marqués attendus contre une équipe moyenne">Attaque</th>
                  <th className="px-4 py-3 text-right font-medium" title="Buts encaissés attendus contre une équipe moyenne">Défense</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.team.id} className="border-t border-line first:border-0">
                    <td className="px-4 py-2.5 tabular-nums text-muted">{i + 1}</td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 font-medium"><TeamCrest team={r.team} size="sm" />{r.team.shortName}</span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{r.played}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted">{r.won}-{r.drawn}-{r.lost}</td>
                    <td className="py-2.5 text-right tabular-nums">{r.gf}:{r.ga}</td>
                    <td className="py-2.5 text-right font-bold tabular-nums">{r.points}</td>
                    <td className="py-2.5 pl-4"><FormChips form={r.form} /></td>
                    <td className="py-2.5 text-right tabular-nums">{num(r.rating.xgFor)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{num(r.rating.xgAgainst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Attaque vs défense</h2>
            <p className="mb-4 mt-1 text-xs text-muted">Buts attendus par match contre une équipe moyenne. En haut à droite : les équipes les plus fortes.</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Marqués" domain={['auto', 'auto']} tickFormatter={(v: number) => num(v, 1)} stroke="rgb(var(--muted))" fontSize={12}
                    label={{ value: 'Buts marqués →', position: 'insideBottom', offset: -10, fill: 'rgb(var(--muted))', fontSize: 12 }} />
                  <YAxis type="number" dataKey="y" name="Encaissés" reversed domain={['auto', 'auto']} tickFormatter={(v: number) => num(v, 1)} stroke="rgb(var(--muted))" fontSize={12}
                    label={{ value: '← Buts encaissés', angle: -90, position: 'insideLeft', offset: 15, fill: 'rgb(var(--muted))', fontSize: 12 }} />
                  <ReferenceLine x={mean('x')} stroke="rgb(var(--muted))" strokeOpacity={0.4} />
                  <ReferenceLine y={mean('y')} stroke="rgb(var(--muted))" strokeOpacity={0.4} />
                  <Tooltip
                    cursor={false}
                    content={({ payload }) => {
                      const d = payload?.[0]?.payload as (typeof chart)[number] | undefined;
                      return d ? (
                        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-card">
                          <strong>{d.full}</strong>
                          <div>Marqués : {num(d.x)} · Encaissés : {num(d.y)}</div>
                        </div>
                      ) : null;
                    }}
                  />
                  <Scatter data={chart} fill="rgb(var(--chart))" isAnimationActive={false}>
                    <LabelList dataKey="name" position="top" fontSize={10} fill="rgb(var(--muted))" />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
