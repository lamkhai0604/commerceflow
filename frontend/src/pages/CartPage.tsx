import { useAppSelector } from '@/app/hooks';
import { BagIcon } from '@/components/icons';
import { ButtonLink, buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { selectCartCount, selectSubtotalCents } from '@/features/cart/cartSlice';
import { CartLines } from '@/features/cart/components/CartLines';
import { CartSyncError } from '@/features/cart/components/CartMessages';
import { CheckoutLink } from '@/features/checkout/CheckoutGate';
import { CartTotals, FreeShippingProgress, shippingCents } from '@/features/cart/components/CartSummary';
import { UndoRemoval } from '@/features/cart/components/UndoRemoval';
import { formatMoney, fromCents } from '@/lib/money';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function CartPage() {
  useDocumentTitle('Your cart');
  const count = useAppSelector(selectCartCount);
  const subtotal = useAppSelector(selectSubtotalCents);

  return (
    <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-6 lg:pt-10 xl:px-8">
      <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Your cart</h1>
      {count === 0 ? (
        <>
        <UndoRemoval className="mt-6" />
        <EmptyState className="mt-6" icon={<BagIcon size={36} />} title="Your cart is empty"
          description="Browse the catalog and add something you like."
          action={<ButtonLink to="/products">Start shopping</ButtonLink>} />
        </>
      ) : (
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section aria-label="Cart items"><CartSyncError className="mb-4" /><CartLines imageSize="md" /></section>
          <section aria-labelledby="summary-title" className="rounded-(--radius-card) bg-stone-50 p-6 lg:sticky lg:top-24">
            <h2 id="summary-title" className="text-lg font-bold">Order summary</h2>
            <div className="mt-4"><FreeShippingProgress /></div>
            <div className="mt-5"><CartTotals /></div>
            <div className="mt-4 flex justify-between border-t border-stone-200 pt-4 text-lg font-bold">
              <span>Total</span><span>{formatMoney(fromCents(subtotal + shippingCents(subtotal)))}</span>
            </div>
            <CheckoutLink className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-5' })}>Check out</CheckoutLink>
            <p className="mt-3 text-center text-[13px] text-stone-600">Demo checkout. No payment is taken.</p>
          </section>
        </div>
      )}
    </div>
  );
}
