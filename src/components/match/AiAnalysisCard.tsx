import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import type { Dataset, Match } from '@/types';
import type { Prediction } from '@/lib/model/poisson';
import { analysisEnabled, cachedAnalysis, requestAnalysis, type AiAnalysis } from '@/lib/aiAnalysis';
import { pct } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { ProbBar } from './parts';

function Comparison({ match, model, ai }: { match: Match; model: Prediction; ai: AiAnalysis }) {
  const rows = [
    { label: `1 · ${match.home.shortName}`, m: model.home, c: ai.probabilities.home },
    { label: 'N · Match nul', m: model.draw, c: ai.probabilities.draw },
    { label: `2 · ${match.away.shortName}`, m: model.away, c: ai.probabilities.away },
  ];
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-muted">
        <tr>
          <th className="pb-2 font-medium">Issue</th>
          <th className="pb-2 text-right font-medium">Modèle stat.</th>
          <th className="pb-2 text-right font-medium">IA</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-line">
            <td className="py-1.5">{r.label}</td>
            <td className="py-1.5 text-right tabular-nums text-muted">{pct(r.m)}</td>
            <td className="py-1.5 text-right font-semibold tabular-nums">{pct(r.c)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AiAnalysisCard({ dataset, match, model }: { dataset: Dataset; match: Match; model: Prediction }) {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(() => cachedAnalysis(match.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (dataset.source !== 'api') return;
    let alive = true;
    analysisEnabled().then((v) => alive && setEnabled(v));
    return () => {
      alive = false;
    };
  }, [dataset.source]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setAnalysis(await requestAnalysis(dataset.competition.code, match.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Sans clé Anthropic configurée (ou en mode démo), la carte n'apparaît pas.
  if (!enabled && !analysis) return null;

  return (
    <section className="card p-5 lg:col-span-2" aria-busy={loading}>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <Sparkles className="h-4 w-4 text-brand-400" aria-hidden /> Analyse par l’IA
      </h2>
      <p className="mb-4 text-xs text-muted">
        L’IA cherche les dernières informations (blessures, compositions, forme) quand c’est possible et les combine avec le modèle statistique.
      </p>

      {analysis ? (
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <ProbBar home={analysis.probabilities.home} draw={analysis.probabilities.draw} away={analysis.probabilities.away} />
            <p className="mt-3 text-sm">
              Score le plus probable : <strong className="tabular-nums">{analysis.predictedScore.home} – {analysis.predictedScore.away}</strong>
              {' · '}Confiance : <strong>{analysis.confidence}</strong>
            </p>
            {analysis.webSearch === false && (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">
                Sans recherche web (quota du fournisseur épuisé) : l’analyse s’appuie sur les statistiques et les connaissances générales de l’IA, pas sur l’actualité des blessures.
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed">{analysis.summary}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
              {analysis.keyFactors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
          <div>
            <Comparison match={match} model={model} ai={analysis} />
            {analysis.sources.length > 0 && (
              <>
                <h3 className="mb-1.5 mt-4 text-xs font-medium text-muted">Sources consultées</h3>
                <ul className="space-y-1 text-xs">
                  {analysis.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-500 hover:underline">
                        <span className="line-clamp-1">{s.title || new URL(s.url).hostname}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-4 text-[11px] text-muted">
              Généré le {new Date(analysis.generatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} par {analysis.model}.
              Une IA peut se tromper ou s'appuyer sur des informations périmées.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {loading ? 'L’IA analyse le match…' : 'Lancer l’analyse IA'}
          </Button>
          <p className="mt-2 text-xs text-muted">
            {loading ? 'Recherche des dernières informations : cela peut prendre une à deux minutes.' : 'L’analyse est gardée en mémoire 6 heures pour ne pas la refaire.'}
          </p>
          {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
      )}
    </section>
  );
}
