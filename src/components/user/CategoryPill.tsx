import type { ReactNode } from 'react';
import type { Category } from '@/lib/user/types';
import { cn } from '@/lib/cn';

export function categoryStyle(hue: number) {
  return { backgroundColor: `hsl(${hue} 80% 50% / 0.14)`, color: `hsl(${hue} 70% var(--pill-l, 42%))`, boxShadow: `inset 0 0 0 1px hsl(${hue} 70% 50% / 0.35)` };
}

export function CategoryPill({ category, className, children }: { category: Category; className?: string; children?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium [--pill-l:38%] dark:[--pill-l:70%]', className)} style={categoryStyle(category.hue)}>
      {category.name}
      {children}
    </span>
  );
}
