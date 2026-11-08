import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { formatMoney, type Money } from '@/lib/money';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export interface DemoOrder {
  number: string;
  name: string;
  email: string;
  itemCount: number;
  total: Money;
  delivery: 'standard' | 'express';
}

export default function OrderConfirmationPage() {
  const order = (useLocation().state as { order?: DemoOrder } | null)?.order;
  useDocumentTitle(order ? 'Order confirmed' : 'Order not found');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <EmptyState title="No recent order" description="Order confirmations are shown once, right after checkout."
          action={<ButtonLink to="/products">Continue shopping</ButtonLink>} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-pine-50 text-pine-700"><CheckIcon size={28} /></span>
      <h1 ref={heading} tabIndex={-1} className="mt-5 text-3xl font-bold tracking-tight outline-none">Thank you, {order.name}.</h1>
      <p role="status" className="mt-3 text-lg text-stone-700">
        Your demo order <strong className="font-semibold text-stone-900">{order.number}</strong> is confirmed.
      </p>
      <dl className="mx-auto mt-8 grid max-w-sm grid-cols-[1fr_auto] gap-y-2 rounded-(--radius-card) bg-stone-50 p-5 text-left text-[15px]">
        <dt className="text-stone-700">Items</dt><dd className="font-semibold">{order.itemCount}</dd>
        <dt className="text-stone-700">Delivery</dt><dd className="font-semibold">{order.delivery === 'express' ? 'Express' : 'Standard'}</dd>
        <dt className="text-stone-700">Total</dt><dd className="font-semibold">{formatMoney(order.total)}</dd>
      </dl>
      <p className="mt-6 text-sm text-stone-600">This is a demo store: no payment was taken, nothing will be shipped and no email is sent to {order.email}.</p>
      <ButtonLink to="/products" className="mt-8">Continue shopping</ButtonLink>
    </div>
  );
}
