import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

interface PaginationProps {
  /** Zero-based current page, matching the API's `page` parameter. */
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}

const cell = 'flex size-11 items-center justify-center rounded-xl text-[15px] font-semibold';

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i);
  const edge = (target: number, label: string, icon: ReactNode, enabled: boolean) => enabled
    ? <Link to={hrefFor(target)} aria-label={label} className={cn(cell, 'border border-stone-200 text-stone-900 hover:border-stone-900')}>{icon}</Link>
    : <span aria-hidden="true" className={cn(cell, 'border border-stone-200 text-stone-300')}>{icon}</span>;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-2">
      {edge(page - 1, 'Previous page', <ChevronLeftIcon size={18} />, page > 0)}
      {pages.map(p => (
        <Link key={p} to={hrefFor(p)} aria-label={`Page ${p + 1}`} aria-current={p === page ? 'page' : undefined}
          className={cn(cell, p === page ? 'bg-stone-900 text-white' : 'border border-stone-200 text-stone-900 hover:border-stone-900')}>
          {p + 1}
        </Link>
      ))}
      {edge(page + 1, 'Next page', <ChevronRightIcon size={18} />, page < totalPages - 1)}
    </nav>
  );
}
