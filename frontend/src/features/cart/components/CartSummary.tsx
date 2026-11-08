import { useAppSelector } from '@/app/hooks';
import { formatMoney, fromCents } from '@/lib/money';
import { FREE_SHIPPING_THRESHOLD_CENTS, selectSubtotalCents } from '../cartSlice';

export const STANDARD_SHIPPING_CENTS = 900;

export function shippingCents(subtotalCents: number) {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS || subtotalCents === 0 ? 0 : STANDARD_SHIPPING_CENTS;
}

/** Progress towards free shipping, stated in words as well as by the bar. */
export function FreeShippingProgress() {
  const subtotal = useAppSelector(selectSubtotalCents);
  const remaining = FREE_SHIPPING_THRESHOLD_CENTS - subtotal;
  const percent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100));
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
        <div className="h-full rounded-full bg-pine-700" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2.5 text-sm font-medium text-stone-700">
        {remaining > 0 ? `Add ${formatMoney(fromCents(remaining))} more for free shipping.` : 'Your order ships free.'}
      </p>
    </div>
  );
}

export function CartTotals() {
  const subtotal = useAppSelector(selectSubtotalCents);
  const shipping = shippingCents(subtotal);
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-[15px]">
      <dt className="text-stone-700">Subtotal</dt><dd className="font-semibold">{formatMoney(fromCents(subtotal))}</dd>
      <dt className="text-stone-700">Shipping</dt><dd className="font-semibold">{shipping ? formatMoney(fromCents(shipping)) : 'Free'}</dd>
      <dt className="text-stone-700">Tax</dt><dd className="text-stone-600">Not charged (demo)</dd>
    </dl>
  );
}
