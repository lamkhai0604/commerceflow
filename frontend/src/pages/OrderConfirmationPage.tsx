import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { CheckIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import type { Order } from '@/features/commerce/types';
import { OrderDetails } from '@/features/orders/OrderDetails';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

/** Shown once, right after checkout, from the order the API returned. */
export default function OrderConfirmationPage() {
  const order = (useLocation().state as { order?: Order } | null)?.order;
  const signedIn = useAppSelector(state => state.auth.isLoggedIn);
  useDocumentTitle(order ? 'Order confirmed' : 'Order not found');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <EmptyState headingLevel={1} title="No recent order" description="Order confirmations are shown once, right after checkout. You can still find an order with Track an order."
          action={<ButtonLink to="/track-order">Track an order</ButtonLink>} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-pine-50 text-pine-700"><CheckIcon size={28} /></span>
        <h1 ref={heading} tabIndex={-1} className="mt-5 text-3xl font-bold tracking-tight outline-none">
          Thank you, {order.shippingAddress.recipientName}.
        </h1>
        <p role="status" className="mt-3 text-lg text-stone-700">
          Your order <strong className="font-semibold text-stone-900">{order.orderNumber}</strong> is confirmed.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-stone-600">
          {order.guest
            ? <>Keep the order number: with it and {order.contactEmail} you can <Link to="/track-order" className="underline underline-offset-4">track this order</Link>.</>
            : <>You can find this order any time in your <Link to="/account/orders" className="underline underline-offset-4">order history</Link>.</>}
          {' '}This is a demo store: no payment was taken, nothing will be shipped and no email is sent.
        </p>
      </div>
      <div className="mt-10"><OrderDetails order={order} /></div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/products">Continue shopping</ButtonLink>
        {signedIn && !order.guest && <ButtonLink to="/account/orders" variant="secondary">View order history</ButtonLink>}
      </div>
    </div>
  );
}
