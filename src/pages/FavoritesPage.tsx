import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Search, SearchX, Star, Tags, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { MatchStatus, TeamCrest } from '@/components/match/parts';
import { BookmarkEditor } from '@/components/user/BookmarkEditor';
import { CategoryManager } from '@/components/user/CategoryManager';
import { CategoryPill } from '@/components/user/CategoryPill';
import { useUserData } from '@/context/UserDataContext';
import { competitionByCode } from '@/lib/competitions';
import { dayLabel, normalizeText, timeLabel } from '@/lib/format';
import type { Bookmark } from '@/lib/user/types';
import type { Match } from '@/types';

type StatusFilter = 'all' | 'upcoming' | 'live' | 'finished' | 'off';
type DateFilter = 'all' | 'today' | 'week' | 'past';

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'upcoming', label: 'À venir' },
  { key: 'live', label: 'En direct' },
  { key: 'finished', label: 'Terminés' },
  { key: 'off', label: 'Reportés / annulés' },
];
const DATE_FILTERS: Array<{ key: DateFilter; label: string }> = [
  { key: 'all', label: 'Toutes dates' },
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: '7 prochains jours' },
  { key: 'past', label: 'Passés' },
];

function statusGroup(m: Match): StatusFilter {
  if (m.status === 'IN_PLAY' || m.status === 'PAUSED') return 'live';
  if (m.status === 'FINISHED' || m.status === 'AWARDED') return 'finished';
  if (m.status === 'POSTPONED' || m.status === 'CANCELLED' || m.status === 'SUSPENDED') return 'off';
  return 'upcoming';
}

function inDate(m: Match, f: DateFilter): boolean {
  const t = Date.parse(m.utcDate);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (f === 'today') return t >= start.getTime() && t < start.getTime() + 86_400_000;
  if (f === 'week') return t >= Date.now() - 3 * 3_600_000 && t < start.getTime() + 8 * 86_400_000;
  if (f === 'past') return t < start.getTime();
  return true;
}

function FavoriteItem({ bookmark, onEdit }: { bookmark: Bookmark; onEdit: () => void }) {
  const { data, removeBookmark } = useUserData();
  const m = bookmark.match;
  const cats = data.categories.filter((c) => bookmark.categoryIds.includes(c.id));
  const picks = data.picks.filter((p) => p.competition === bookmark.competition && p.matchId === bookmark.matchId).length;

  return (
    <li className="card animate-fade-in p-4">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate first-letter:uppercase">
          {competitionByCode(bookmark.competition).name} · {dayLabel(m.utcDate)}
          {m.status === 'TIMED' || m.status === 'SCHEDULED' ? '' : ` · ${timeLabel(m.utcDate)}`}
        </span>
        <MatchStatus match={m} />
      </div>
      <Link to={`/match/${m.id}?c=${bookmark.competition}`} className="block space-y-2 rounded-lg transition hover:opacity-90">
        {(['home', 'away'] as const).map((side) => (
          <div key={side} className="flex items-center gap-3">
            <TeamCrest team={m[side]} size="sm" />
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{m[side].name}</span>
            {m.score && <span className="font-bold tabular-nums">{m.score[side]}</span>}
          </div>
        ))}
      </Link>
      {(cats.length > 0 || bookmark.note) && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {cats.length > 0 && <div className="flex flex-wrap gap-1.5">{cats.map((c) => <CategoryPill key={c.id} category={c} />)}</div>}
          {bookmark.note && <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted">{bookmark.note}</p>}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-xs text-muted">{picks ? `${picks} pronostic${picks > 1 ? 's' : ''}` : 'Aucun pronostic'}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier
          </Button>
          <Button size="sm" variant="ghost" onClick={() => removeBookmark(bookmark.id)} aria-label={`Retirer ${m.home.shortName} – ${m.away.shortName} des favoris`}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Retirer
          </Button>
        </div>
      </div>
    </li>
  );
}

export function FavoritesPage() {
  const { data, loading } = useUserData();
  const [query, setQuery] = useState('');
  const [competition, setCompetition] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [date, setDate] = useState<DateFilter>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [managing, setManaging] = useState(false);

  const competitions = useMemo(() => [...new Set(data.bookmarks.map((b) => b.competition))], [data.bookmarks]);

  const list = useMemo(() => {
    const q = normalizeText(query.trim());
    return data.bookmarks
      .filter((b) => competition === 'all' || b.competition === competition)
      .filter((b) => status === 'all' || statusGroup(b.match) === status)
      .filter((b) => inDate(b.match, date))
      .filter((b) => !category || b.categoryIds.includes(category))
      .filter((b) => !q || normalizeText(`${b.match.home.name} ${b.match.home.shortName} ${b.match.away.name} ${b.match.away.shortName} ${b.note}`).includes(q))
      .sort((a, b) => {
        // À venir d'abord (du plus proche au plus lointain), puis les passés (du plus récent au plus ancien).
        const ta = Date.parse(a.match.utcDate);
        const tb = Date.parse(b.match.utcDate);
        const now = Date.now() - 3 * 3_600_000;
        const fa = ta >= now;
        const fb = tb >= now;
        if (fa !== fb) return fa ? -1 : 1;
        return fa ? ta - tb : tb - ta;
      });
  }, [data.bookmarks, query, competition, status, date, category]);

  const filtersActive = query !== '' || competition !== 'all' || status !== 'all' || date !== 'all' || category !== null;
  const reset = () => {
    setQuery('');
    setCompetition('all');
    setStatus('all');
    setDate('all');
    setCategory(null);
  };

  return (
    <>
      <PageHeader
        title="Mes favoris"
        description={`${data.bookmarks.length} match${data.bookmarks.length > 1 ? 's' : ''} sauvegardé${data.bookmarks.length > 1 ? 's' : ''}`}
        actions={
          <Button variant="secondary" onClick={() => setManaging(true)}>
            <Tags className="h-4 w-4" aria-hidden /> Catégories
          </Button>
        }
      />

      {loading && data.bookmarks.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-40" />)}</div>
      ) : data.bookmarks.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Aucun favori pour l'instant"
          description="Touchez l'étoile d'un match pour le sauvegarder, le classer dans vos catégories et y ajouter des notes."
          action={<Link to="/matchs" className="font-medium text-brand-700 hover:underline dark:text-brand-400">Parcourir les matchs</Link>}
        />
      ) : (
        <>
          <div className="mb-6 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <input type="search" className="field h-11 pl-10 pr-10" placeholder="Équipe ou mot de la note…" aria-label="Rechercher dans les favoris" value={query} onChange={(e) => setQuery(e.target.value)} />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label="Effacer la recherche">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <FilterSelect aria-label="Compétition" value={competition} onChange={(e) => setCompetition(e.target.value)} className="h-11 sm:w-56">
                <option value="all">Toutes les compétitions</option>
                {competitions.map((c) => <option key={c} value={c}>{competitionByCode(c).name}</option>)}
              </FilterSelect>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Statut">
              {STATUS_FILTERS.map((f) => <button key={f.key} type="button" className="chip" aria-pressed={status === f.key} onClick={() => setStatus(f.key)}>{f.label}</button>)}
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Date">
              {DATE_FILTERS.map((f) => <button key={f.key} type="button" className="chip" aria-pressed={date === f.key} onClick={() => setDate(f.key)}>{f.label}</button>)}
            </div>
            {data.categories.length > 0 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Catégorie">
                {data.categories.map((c) => (
                  <button key={c.id} type="button" className="chip" aria-pressed={category === c.id} onClick={() => setCategory((cur) => (cur === c.id ? null : c.id))}>
                    <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${c.hue} 75% 50%)` }} aria-hidden /> {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Aucun favori ne correspond"
              description="Modifiez la recherche ou les filtres."
              action={filtersActive ? <Button variant="secondary" onClick={reset}>Réinitialiser les filtres</Button> : undefined}
            />
          ) : (
            <>
              <p className="mb-3 text-xs text-muted" aria-live="polite">{list.length} favori{list.length > 1 ? 's' : ''}</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((b) => <FavoriteItem key={b.id} bookmark={b} onEdit={() => setEditing(b)} />)}
              </ul>
            </>
          )}
        </>
      )}

      <BookmarkEditor bookmark={editing} open={editing != null} onClose={() => setEditing(null)} />
      <CategoryManager open={managing} onClose={() => setManaging(false)} />
    </>
  );
}
