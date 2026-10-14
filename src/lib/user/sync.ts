/** Mise à jour des copies de matchs suivis (statut, score) et règlement automatique des pronostics. */
import type { Match } from '@/types';
import { settle } from './markets';
import type { Bookmark, Pick, UserData } from './types';

function sameMatch(a: Match, b: Match) {
  return a.status === b.status && a.utcDate === b.utcDate && a.score?.home === b.score?.home && a.score?.away === b.score?.away;
}

/**
 * Garde-fou : un match chargé ne remplace la copie que s'il s'agit bien du même match
 * (mêmes équipes). Évite qu'un autre jeu de données (démo, autre source) qui réutiliserait
 * un identifiant ne modifie ou ne règle un pronostic à tort.
 */
function sameFixture(a: Match, b: Match) {
  return a.home.id === b.home.id && a.away.id === b.away.id;
}

export function applyMatchUpdates(data: UserData, competition: string, matches: Match[], now: string): { bookmarks: Bookmark[]; picks: Pick[] } {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const fresh = (stored: Match) => {
    const m = byId.get(stored.id);
    return m && sameFixture(stored, m) ? m : null;
  };

  const bookmarks = data.bookmarks.flatMap((b) => {
    if (b.competition !== competition) return [];
    const m = fresh(b.match);
    return m && !sameMatch(b.match, m) ? [{ ...b, match: m, updatedAt: now }] : [];
  });

  const picks = data.picks.flatMap((p) => {
    if (p.competition !== competition) return [];
    const m = fresh(p.match);
    if (!m) return [];
    const status = p.manual ? p.status : settle(m, p.market, p.selection);
    if (sameMatch(p.match, m) && status === p.status) return [];
    return [{ ...p, match: m, status, settledAt: status === p.status ? p.settledAt : status === 'pending' ? null : now, updatedAt: now }];
  });

  return { bookmarks, picks };
}
