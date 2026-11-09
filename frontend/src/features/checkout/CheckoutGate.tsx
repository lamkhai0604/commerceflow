import { useEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { CloseIcon, UserIcon } from '@/components/icons';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { authActions } from '@/features/auth/authSlice';
import { cartActions } from '@/features/cart/cartSlice';

/**
 * "Check out" control. Signed-in customers go straight to checkout; signed-out visitors are asked whether to
 * continue as a guest or to log in first (CR-S4-01). It is a link, so it still works without the dialog.
 */
export function CheckoutLink({ children, className, onNavigate }: { children: React.ReactNode; className?: string; onNavigate?: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const signedIn = useAppSelector(state => state.auth.isLoggedIn);
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (signedIn) { onNavigate?.(); navigate('/checkout'); }
    else dispatch(cartActions.checkoutChoiceOpened());
  };
  return <a href="/checkout" onClick={click} className={className}>{children}</a>;
}

/** The checkout choice dialog plus the hand-over to checkout once a customer who chose to log in is signed in. */
export function CheckoutGate() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const choice = useAppSelector(state => state.cart.checkoutChoice);
  const signedIn = useAppSelector(state => state.auth.isLoggedIn);
  const authDialog = useAppSelector(state => state.auth.dialog);

  useEffect(() => {
    if (choice !== 'awaitingSignIn') return;
    if (signedIn) { dispatch(cartActions.checkoutChoiceClosed()); navigate('/checkout'); }
    // The customer closed the log-in dialog without signing in: forget the intention.
    else if (!authDialog) dispatch(cartActions.checkoutChoiceClosed());
  }, [choice, signedIn, authDialog, dispatch, navigate]);

  const close = () => dispatch(cartActions.checkoutChoiceClosed());
  const signIn = (mode: 'login' | 'register') => {
    dispatch(cartActions.checkoutAwaitingSignIn());
    dispatch(authActions.openDialog(mode));
  };
  return (
    <Dialog open={choice === 'open'} onClose={close} labelledBy="checkout-choice-title" className="p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <h2 id="checkout-choice-title" className="text-xl font-bold tracking-tight">How would you like to check out?</h2>
        <button type="button" onClick={close} aria-label="Close" className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-linen">
          <CloseIcon />
        </button>
      </div>
      <div className="mt-5 grid gap-4">
        <section className="rounded-xl border border-stone-300 p-4">
          <h3 className="font-semibold">Check out as a guest</h3>
          <p className="mt-1 text-sm text-stone-700">No account needed. You can track the order later with its number and your email address.</p>
          <Button data-autofocus variant="secondary" fullWidth className="mt-3"
            onClick={() => { close(); navigate('/checkout?as=guest'); }}>Continue as guest</Button>
        </section>
        <section className="rounded-xl border border-stone-300 p-4">
          <h3 className="flex items-center gap-2 font-semibold"><UserIcon size={18} />Check out as a member</h3>
          <p className="mt-1 text-sm text-stone-700">Your cart is saved to your account and your orders appear in your order history.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button onClick={() => signIn('login')}>Log in</Button>
            <button type="button" onClick={() => signIn('register')} className={buttonClasses({ variant: 'ghost' })}>Create account</button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
