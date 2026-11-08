import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, CloseIcon, InfoIcon } from '@/components/icons';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: 'success' | 'info';
  action?: { label: string; to: string };
  /** Thumbnail shown on the left, for example the product just added. */
  image?: string;
}
interface ToastItem extends ToastInput { id: number }

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** Transient confirmations: readable for 5 s, dismissible, announced politely (role="status"). */
export const TOAST_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts(list => list.filter(t => t.id !== id)), []);
  const show = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    // Keep at most two visible so confirmations never cover the controls the user needs next.
    setToasts(list => [...list.slice(-1), { ...toast, id }]);
  }, []);
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
        {toasts.map(toast => <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss: dismissById }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const onDismiss = () => dismissById(toast.id);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismissById(toast.id), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [paused, dismissById, toast.id]);
  const Icon = toast.tone === 'info' ? InfoIcon : CheckIcon;
  return (
    <div role="status" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-(--shadow-overlay)">
      {toast.image
        ? <img src={toast.image} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
        : <Icon size={20} className={toast.tone === 'info' ? 'mt-0.5 text-stone-700' : 'mt-0.5 text-green-700'} />}
      <div className="min-w-0 flex-1">
        <p className={toast.tone === 'info' ? 'text-sm font-semibold text-stone-900' : 'text-sm font-semibold text-green-800'}>{toast.title}</p>
        {toast.description && <p className="mt-1 text-sm text-stone-900">{toast.description}</p>}
        {toast.action && (
          <Link to={toast.action.to} onClick={onDismiss}
            className="mt-2.5 inline-flex min-h-9 items-center rounded-full bg-stone-900 px-3.5 text-[13px] font-semibold text-white hover:bg-stone-700">
            {toast.action.label}
          </Link>
        )}
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification"
        className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-linen">
        <CloseIcon size={16} />
      </button>
    </div>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider');
  return show;
}
