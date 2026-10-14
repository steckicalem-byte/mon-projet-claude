import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Odds, Preferences } from '@/types';
import { readJSON, writeJSON } from '@/lib/storage';
import { COMPETITIONS } from '@/lib/competitions';

const DEFAULT_PREFS: Preferences = { theme: 'dark', competition: 'FL1', bankroll: 100, kellyFraction: 0.25, minEdge: 3 };

interface PrefsApi {
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;
  /** Cotes saisies par l'utilisateur, par identifiant de match. */
  odds: Record<number, Odds>;
  setOdds: (matchId: number, odds: Odds) => void;
}

const PrefsContext = createContext<PrefsApi | null>(null);

function loadPrefs(): Preferences {
  const p = { ...DEFAULT_PREFS, ...readJSON<Partial<Preferences>>('preferences', {}) };
  if (!COMPETITIONS.some((c) => c.code === p.competition)) p.competition = DEFAULT_PREFS.competition;
  return p;
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(loadPrefs);
  const [odds, setAllOdds] = useState<Record<number, Odds>>(() => readJSON('odds', {}));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
    writeJSON('preferences', preferences);
  }, [preferences]);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => setPreferences((p) => ({ ...p, ...patch })), []);

  const setOdds = useCallback((matchId: number, value: Odds) => {
    setAllOdds((all) => {
      const next = { ...all, [matchId]: value };
      if (!value.home && !value.draw && !value.away) delete next[matchId];
      writeJSON('odds', next);
      return next;
    });
  }, []);

  const api = useMemo(() => ({ preferences, updatePreferences, odds, setOdds }), [preferences, updatePreferences, odds, setOdds]);
  return <PrefsContext.Provider value={api}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsApi {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs doit être utilisé dans PrefsProvider');
  return ctx;
}
