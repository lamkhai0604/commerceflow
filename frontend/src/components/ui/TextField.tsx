import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircleIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** Field-level error; shown under the input and linked with aria-describedby. */
  error?: string;
  hint?: ReactNode;
  /** Content inside the right edge of the input, such as a show-password button. */
  end?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, error, hint, end, required, className, ...props }, ref,
) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-stone-900">
        {label}{required && <span aria-hidden="true" className="text-red-700"> *</span>}
      </label>
      <div className={cn('mt-1.5 flex items-center rounded-xl border bg-white focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-pine-700',
        error ? 'border-2 border-red-700' : 'border-stone-400')}>
        <input ref={ref} id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy}
          className="h-12 w-full min-w-0 rounded-xl bg-transparent px-3.5 text-[15px] text-stone-900 outline-none placeholder:text-stone-500 disabled:cursor-not-allowed disabled:text-stone-500"
          {...props} />
        {end && <div className="pr-1.5">{end}</div>}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-red-700">
          <AlertCircleIcon size={14} className="mt-0.5 shrink-0" />{error}
        </p>
      )}
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-stone-600">{hint}</p>}
    </div>
  );
});
