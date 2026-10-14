import { useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { useUserData } from '@/context/UserDataContext';

/**
 * À chaque chargement d'une compétition, met à jour les copies des matchs suivis
 * (statut, score) et règle automatiquement les pronostics terminés.
 */
export function MatchSync() {
  const { dataset } = useData();
  const { syncMatches, loading } = useUserData();
  useEffect(() => {
    if (dataset && !loading) syncMatches(dataset.competition.code, dataset.matches);
  }, [dataset, loading, syncMatches]);
  return null;
}
