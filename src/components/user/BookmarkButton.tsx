import { Star } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { Match } from '@/types';
import { cn } from '@/lib/cn';
import { useUserData } from '@/context/UserDataContext';

/** Étoile « ajouter / retirer des favoris ». Utilisable à l'intérieur d'un lien. */
export function BookmarkButton({ match, competition, size = 'md', className }: { match: Match; competition: string; size?: 'md' | 'lg'; className?: string }) {
  const { isBookmarked, toggleBookmark } = useUserData();
  const on = isBookmarked(competition, match.id);
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(match, competition);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Retirer ${match.home.shortName} – ${match.away.shortName} des favoris` : `Ajouter ${match.home.shortName} – ${match.away.shortName} aux favoris`}
      title={on ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={cn(
        'grid shrink-0 place-items-center rounded-full transition active:scale-90',
        size === 'lg' ? 'h-11 w-11' : 'h-8 w-8',
        on ? 'text-amber-400 hover:bg-amber-400/10' : 'text-muted hover:bg-elevated hover:text-fg',
        className,
      )}
    >
      <Star className={cn(size === 'lg' ? 'h-6 w-6' : 'h-[18px] w-[18px]', on && 'fill-current')} aria-hidden />
    </button>
  );
}
