import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { selectArrow } from './Field';

/** Petit select sans libellé visible (filtres) — le libellé est fourni via aria-label. */
export function FilterSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { 'aria-label': string }) {
  return (
    <select
      {...props}
      style={selectArrow}
      className={cn('field h-10 w-auto min-w-[9rem] appearance-none bg-no-repeat py-0 pr-9', className)}
    />
  );
}
