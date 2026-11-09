import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Decorative loading placeholder; the surrounding region announces loading with aria-busy. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-skeleton', className)} />;
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  /** The next useful action, for example a button that clears filters. */
  action?: ReactNode;
  className?: string;
}

/** Explains why nothing is shown and offers the next step. */
export function EmptyState({ title, description, icon, action, className, headingLevel = 2 }: EmptyStateProps & { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className={cn('flex flex-col items-center rounded-(--radius-card) border border-dashed border-stone-300 px-6 py-12 text-center', className)}>
      {icon && <div className="text-stone-600">{icon}</div>}
      <Heading className="mt-3 text-lg font-semibold text-stone-900">{title}</Heading>
      <p className="mt-1 max-w-sm text-[15px] text-stone-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'muted' | 'accent' }) {
  const tones = { neutral: 'bg-white text-stone-900', muted: 'bg-stone-200 text-stone-700', accent: 'bg-amber-100 text-amber-900' };
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>{children}</span>;
}

/** A data view that failed to load: says so and offers a retry (the only safe next step for a read). */
export function LoadError({ children, onRetry, className }: { children: ReactNode; onRetry: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900', className)}>
      <span>{children} Please try again.</span>
      <button type="button" onClick={onRetry} className="min-h-10 rounded-full bg-red-900 px-4 text-[13px] font-semibold text-white hover:bg-red-800">Try again</button>
    </div>
  );
}
