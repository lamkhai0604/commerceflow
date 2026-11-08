import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  /** Called when the user presses Escape or clicks the backdrop. Not called while `dismissible` is false. */
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  placement?: 'center' | 'right' | 'left';
  /** Set false while an action is in progress so the dialog cannot be dismissed mid-request. */
  dismissible?: boolean;
  className?: string;
}

const placements = {
  center: 'm-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl',
  right: 'ml-auto h-dvh w-full max-w-[460px]',
  left: 'mr-auto h-dvh w-full max-w-[360px]',
};

/**
 * Modal built on the native <dialog> element: the browser traps focus, makes the page inert,
 * handles Escape and returns focus to the opener when it closes.
 */
export function Dialog({ open, onClose, labelledBy, children, placement = 'center', dismissible = true, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first focusable element; honour an explicit initial focus target instead.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const cancel = (event: Event) => { event.preventDefault(); if (dismissible) onClose(); };
    dialog.addEventListener('cancel', cancel);
    return () => dialog.removeEventListener('cancel', cancel);
  }, [dismissible, onClose]);

  return (
    <dialog ref={ref} aria-labelledby={labelledBy} aria-modal="true"
      onClick={event => { if (event.target === ref.current && dismissible) onClose(); }}
      className={cn('bg-white text-stone-900 shadow-(--shadow-overlay) open:flex open:flex-col', placements[placement], className)}>
      {open && children}
    </dialog>
  );
}
