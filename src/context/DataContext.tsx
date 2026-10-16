import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Dataset, Match } from '@/types';
import { loadDataset } from '@/lib/api';
import { competitionByCode } from '@/lib/competitions';
import { fitModel, predict, type ModelParams, type Prediction } from '@/lib/model/poisson';
import { usePrefs } from './PrefsContext';

interface DataApi {
  loading: boolean;
  dataset: (Dataset & { notice?: string }) | null;
  model: ModelParams | null;
  /** Pronostic d'un match avec le modèle entraîné sur tous les matchs terminés. */
  predictMatch: (m: Match) => Prediction | null;
  refresh: () => void;
}

const DataContext = createContext<DataApi | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { preferences } = usePrefs();
  const [dataset, setDataset] = useState<DataApi['dataset']>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadDataset(competitionByCode(preferences.competition), reload > 0).then((d) => {
      if (cancelled) return;
      setDataset(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [preferences.competition, reload]);

  const model = useMemo(() => (dataset ? fitModel(dataset.matches, Date.now()) : null), [dataset]);
  const predictMatch = useCallback((m: Match) => (model ? predict(model, m.home.id, m.away.id) : null), [model]);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  const api = useMemo(() => ({ loading, dataset, model, predictMatch, refresh }), [loading, dataset, model, predictMatch, refresh]);
  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData(): DataApi {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData doit être utilisé dans DataProvider');
  return ctx;
}
