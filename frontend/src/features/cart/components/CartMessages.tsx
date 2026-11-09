import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/Toast';
import { cartActions } from '../cartSlice';

/** Shown in the cart when a change could not be saved to the signed-in customer's server cart. */
export function CartSyncError({ className }: { className?: string }) {
  const dispatch = useAppDispatch();
  const message = useAppSelector(state => state.cart.syncError);
  if (!message) return null;
  return <Alert tone="error" className={className} onDismiss={() => dispatch(cartActions.syncErrorDismissed())}>{message}</Alert>;
}

/** Turns one-off cart notices (for example after the browser cart was merged on log-in) into a toast. */
export function CartNoticeToast() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const notice = useAppSelector(state => state.cart.notice);
  useEffect(() => {
    if (!notice) return;
    toast({ title: notice.title, description: notice.description, tone: 'info', action: { label: 'View cart', to: '/cart' } });
    dispatch(cartActions.noticeCleared());
  }, [notice, toast, dispatch]);
  return null;
}
