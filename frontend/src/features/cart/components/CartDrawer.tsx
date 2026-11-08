import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { BagIcon, CloseIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/Feedback';
import { formatMoney, fromCents } from '@/lib/money';
import { cartActions, selectCartCount, selectSubtotalCents } from '../cartSlice';
import { CartLines } from './CartLines';
import { CartTotals, FreeShippingProgress, shippingCents } from './CartSummary';
import { UndoRemoval } from './UndoRemoval';

export function CartDrawer() {
  const dispatch = useAppDispatch();
  const open = useAppSelector(state => state.cart.drawerOpen);
  const count = useAppSelector(selectCartCount);
  const subtotal = useAppSelector(selectSubtotalCents);
  const close = useCallback(() => dispatch(cartActions.drawerClosed()), [dispatch]);
  const total = subtotal + shippingCents(subtotal);

  return (
    <Dialog open={open} onClose={close} labelledBy="cart-drawer-title" placement="right">
      <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
        <h2 id="cart-drawer-title" className="text-xl font-bold tracking-tight">
          Your cart {count > 0 && <span className="font-medium text-stone-600">({count} {count === 1 ? 'item' : 'items'})</span>}
        </h2>
        <button type="button" onClick={close} aria-label="Close cart"
          className="flex size-11 items-center justify-center rounded-full bg-linen hover:bg-stone-200"><CloseIcon size={18} /></button>
      </div>
      {count === 0 ? (
        <div className="flex flex-1 flex-col justify-center gap-4 p-6">
          <UndoRemoval />
          <EmptyState className="w-full" icon={<BagIcon size={36} />} title="Your cart is empty"
            description="Products you add will appear here."
            action={<ButtonLink to="/products" onClick={close} variant="primary">Start shopping</ButtonLink>} />
        </div>
      ) : (
        <>
          <div className="px-6 pt-4"><FreeShippingProgress /></div>
          <div className="flex-1 overflow-y-auto px-6 pb-4"><CartLines onNavigate={close} /></div>
          <div className="border-t border-stone-200 bg-stone-50 px-6 pt-5 pb-6">
            <CartTotals />
            <ButtonLink to="/checkout" onClick={close} size="lg" fullWidth className="mt-4.5">
              Check out · {formatMoney(fromCents(total))}
            </ButtonLink>
            <ButtonLink to="/cart" onClick={close} variant="link" fullWidth className="mt-1">View full cart</ButtonLink>
          </div>
        </>
      )}
    </Dialog>
  );
}
