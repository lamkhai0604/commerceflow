import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { SpinnerIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-pine-700 text-white hover:bg-pine-800 disabled:bg-pine-600',
  secondary: 'border border-stone-400 bg-white text-stone-900 hover:border-stone-900',
  dark: 'bg-stone-900 text-white hover:bg-stone-700',
  ghost: 'bg-linen text-stone-900 hover:bg-stone-200',
  link: 'px-0! text-pine-700 underline underline-offset-4 hover:text-pine-800',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 text-sm',
  md: 'min-h-11 px-5 text-[15px]',
  lg: 'min-h-13 px-7 text-base',
};

export function buttonClasses({ variant = 'primary', size = 'md', fullWidth, className }: StyleOptions = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors',
    'disabled:cursor-not-allowed aria-disabled:cursor-not-allowed',
    variants[variant], sizes[size], fullWidth && 'w-full', className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleOptions {
  /** Shows a spinner, sets aria-busy and disables the button so the action cannot run twice. */
  loading?: boolean;
  /** Label shown while loading, for example "Adding to cart…". */
  loadingLabel?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, className, loading = false, loadingLabel, disabled, children, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })} {...props}>
      {loading && <SpinnerIcon size={18} className="animate-spin" />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
});

export function ButtonLink({ variant, size, fullWidth, className, ...props }: LinkProps & StyleOptions) {
  return <Link className={buttonClasses({ variant, size, fullWidth, className })} {...props} />;
}
