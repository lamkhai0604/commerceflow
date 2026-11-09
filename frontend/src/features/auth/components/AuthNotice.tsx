import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Alert } from '@/components/ui/Alert';
import { authActions } from '@/features/auth/authSlice';
import { cn } from '@/lib/cn';

/** Success and info notices auto-dismiss after this delay (UI/UX specification, Toast). */
export const NOTICE_DURATION_MS = 4000;

/**
 * Authentication notices. Session-expiry warnings stay until dismissed or resolved; success and info notices
 * dismiss themselves. Inside the dialog they render inline; elsewhere as a floating toast (`floating`).
 */
export default function AuthNotice({ floating = false }: { floating?: boolean }) {
  const dispatch = useAppDispatch();
  const { notice, noticeSeverity } = useAppSelector(state => state.auth);
  const persistent = noticeSeverity === 'warning';

  useEffect(() => {
    if (!notice || persistent) return;
    const timer = window.setTimeout(() => dispatch(authActions.dismissNotice()), NOTICE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [notice, persistent, dispatch]);

  if (!notice) return null;
  const alert = (
    <Alert tone={persistent ? 'warning' : noticeSeverity === 'info' ? 'info' : 'success'} role={persistent ? 'alert' : 'status'}
      onDismiss={() => dispatch(authActions.dismissNotice())}
      className={cn(floating && 'pointer-events-auto bg-white shadow-(--shadow-overlay)')}>
      {notice}
    </Alert>
  );
  return floating
    ? <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6">{alert}</div>
    : alert;
}
