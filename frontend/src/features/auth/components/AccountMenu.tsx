import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { SpinnerIcon, UserIcon } from '@/components/icons';
import { Alert } from '@/components/ui/Alert';
import { authActions } from '@/features/auth/authSlice';
import AuthDialog from './AuthDialog';
import AuthNotice from './AuthNotice';

/**
 * Header account control: a menu button (WAI-ARIA menu pattern) that opens the authentication dialog or logs out.
 * Its accessible name, "Account menu", and the menu item names are used by the HTTPS E2E suite.
 */
export default function AccountMenu() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);
  const close = (restoreFocus = true) => { setOpen(false); if (restoreFocus) button.current?.focus(); };

  // When the authentication dialog closes, return focus to the control that opened it (the menu item is gone by then).
  const hadDialog = useRef(false);
  useEffect(() => {
    if (hadDialog.current && !auth.dialog) button.current?.focus();
    hadDialog.current = !!auth.dialog;
  }, [auth.dialog]);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const onMenuKey = (event: KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); list[(index + 1) % list.length]?.focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); list[(index - 1 + list.length) % list.length]?.focus(); }
    if (event.key === 'Home') { event.preventDefault(); list[0]?.focus(); }
    if (event.key === 'End') { event.preventDefault(); list[list.length - 1]?.focus(); }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') close(false);
  };
  const choose = (action: () => void) => { setOpen(false); action(); };
  const item = 'flex min-h-11 w-full items-center px-4 text-left text-[15px] text-stone-900 hover:bg-linen focus:bg-linen focus:outline-none disabled:text-stone-400';

  return (
    <div className="relative">
      {auth.dialog && (
        <AuthDialog key={auth.dialog} registration={auth.dialog === 'register'} onClose={() => dispatch(authActions.closeDialog())} />
      )}
      {auth.initializing ? (
        <span role="status" aria-label="Checking your session" className="block h-6 w-24 animate-pulse rounded-full bg-skeleton" />
      ) : (
        <button ref={button} type="button" aria-label="Account menu" aria-haspopup="menu" aria-controls={open ? menuId : undefined}
          aria-expanded={open} aria-busy={!!auth.pending} onClick={() => setOpen(value => !value)}
          onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); } }}
          className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2.5 text-[15px] font-medium text-stone-900 hover:bg-linen">
          {auth.pending === 'logout' ? <SpinnerIcon className="animate-spin" /> : <UserIcon />}
          <span className="hidden max-w-36 truncate sm:inline">
            {auth.pending === 'logout' ? 'Logging out...' : auth.currentUser?.fullName || 'Log in'}
          </span>
        </button>
      )}
      {open && (
        <div ref={menu} id={menuId} role="menu" aria-label="Account" onKeyDown={onMenuKey}
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white py-1.5 shadow-(--shadow-overlay)">
          {auth.isLoggedIn ? (
            <>
              <p className="truncate px-4 pt-1.5 pb-2 text-[13px] text-stone-600">{auth.currentUser?.email}</p>
              <button type="button" role="menuitem" tabIndex={-1} className={item}
                onClick={() => choose(() => navigate('/account/orders'))}>Order history</button>
              {auth.currentUser?.roles.includes('ADMIN') && (
                <button type="button" role="menuitem" tabIndex={-1} className={item}
                  onClick={() => choose(() => navigate('/admin'))}>Administration</button>
              )}
              <button type="button" role="menuitem" tabIndex={-1} disabled={!!auth.pending} className={item}
                onClick={() => choose(() => dispatch(authActions.logout()))}>Log out</button>
            </>
          ) : (
            <>
              <button type="button" role="menuitem" tabIndex={-1} disabled={!!auth.pending} className={item}
                onClick={() => choose(() => dispatch(authActions.openDialog('login')))}>Log in</button>
              <button type="button" role="menuitem" tabIndex={-1} disabled={!!auth.pending} className={item}
                onClick={() => choose(() => dispatch(authActions.openDialog('register')))}>Create account</button>
              <button type="button" role="menuitem" tabIndex={-1} className={item}
                onClick={() => choose(() => navigate('/track-order'))}>Track an order</button>
            </>
          )}
        </div>
      )}
      {!auth.dialog && auth.error && (
        <div className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))]">
          <Alert tone="error" className="bg-white shadow-(--shadow-overlay)" onDismiss={() => dispatch(authActions.dismissFeedback())}>
            {auth.error.message}
          </Alert>
        </div>
      )}
      {!auth.dialog && <AuthNotice floating />}
    </div>
  );
}
