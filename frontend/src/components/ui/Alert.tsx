import type { ReactNode } from 'react';
import { AlertCircleIcon, CheckIcon, CloseIcon, InfoIcon, WarningIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

export type AlertTone = 'success' | 'error' | 'warning' | 'info';

const tones: Record<AlertTone, { box: string; Icon: typeof CheckIcon }> = {
  success: { box: 'border-green-200 bg-green-50 text-green-900', Icon: CheckIcon },
  error: { box: 'border-red-200 bg-red-50 text-red-900', Icon: AlertCircleIcon },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', Icon: WarningIcon },
  info: { box: 'border-stone-200 bg-linen text-stone-900', Icon: InfoIcon },
};

interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
  /** Defaults to "alert" for errors (announced immediately) and "status" otherwise. */
  role?: 'alert' | 'status';
  onDismiss?: () => void;
  className?: string;
}

/** Inline status message (StatusAlert in the UI/UX specification). */
export function Alert({ tone, children, role, onDismiss, className }: AlertProps) {
  const { box, Icon } = tones[tone];
  return (
    <div role={role ?? (tone === 'error' ? 'alert' : 'status')}
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', box, className)}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message"
          className="-m-2 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5">
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
