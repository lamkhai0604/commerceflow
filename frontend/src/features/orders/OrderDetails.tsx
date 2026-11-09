import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Feedback';
import type { Order } from '@/features/commerce/types';
import { formatMoney } from '@/lib/money';

const STATUS: Record<Order['orderStatus'], string> = {
  CONFIRMED: 'Confirmed', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export const orderStatusLabel = (order: Order) => STATUS[order.orderStatus] ?? order.orderStatus;
export const formatOrderDate = (iso: string) => dateFormat.format(new Date(iso));
export const itemCount = (order: Order) => order.items.reduce((sum, item) => sum + item.quantity, 0);

/** Everything a customer needs to know about one order: items, delivery address and amounts. */
export function OrderDetails({ order, headingLevel = 2 }: { order: Order; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as const;
  const a = order.shippingAddress;
  const box = 'rounded-(--radius-card) border border-stone-200 p-5';
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-labelledby={`items-${order.id}`} className={`${box} self-start`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <H id={`items-${order.id}`} className="text-lg font-bold">Items</H>
          <Badge tone="accent">{orderStatusLabel(order)}</Badge>
        </div>
        <ul className="mt-2 divide-y divide-stone-200">
          {order.items.map(item => (
            <li key={item.productId} className="flex items-center gap-3 py-3">
              <img src={`${item.imageUrl}-480.webp`} alt="" className="h-16 w-13 shrink-0 rounded-lg bg-linen object-cover" />
              <span className="min-w-0 flex-1 text-sm">
                <Link to={`/products/${item.productSlug}`} className="block font-semibold hover:underline">{item.productName}</Link>
                <span className="text-stone-600">Qty {item.quantity} · {formatMoney(item.unitPrice)} each</span>
              </span>
              <span className="text-sm font-semibold">{formatMoney(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid content-start gap-6">
        <section aria-labelledby={`summary-${order.id}`} className="rounded-(--radius-card) bg-stone-50 p-5">
          <H id={`summary-${order.id}`} className="text-lg font-bold">Summary</H>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-[15px]">
            <dt className="text-stone-700">Placed</dt><dd className="font-semibold">{formatOrderDate(order.createdAt)}</dd>
            <dt className="text-stone-700">Subtotal</dt><dd className="font-semibold">{formatMoney(order.subtotalAmount)}</dd>
            <dt className="text-stone-700">Shipping ({order.deliveryMethod === 'EXPRESS' ? 'Express' : 'Standard'})</dt>
            <dd className="font-semibold">{order.shippingAmount === '0.00' ? 'Free' : formatMoney(order.shippingAmount)}</dd>
            <dt className="border-t border-stone-200 pt-2 text-lg font-bold">Total</dt>
            <dd className="border-t border-stone-200 pt-2 text-lg font-bold">{formatMoney(order.totalAmount)}</dd>
            <dt className="text-stone-700">Payment</dt><dd className="font-semibold">{order.paymentStatus === 'PAID' ? 'Paid (demo)' : 'Refunded'}</dd>
          </dl>
        </section>
        <section aria-labelledby={`address-${order.id}`} className={box}>
          <H id={`address-${order.id}`} className="text-lg font-bold">Shipping to</H>
          <address className="mt-2 text-[15px] leading-relaxed not-italic text-stone-800">
            {a.recipientName}<br />{a.addressLine1}<br />{a.addressLine2 && <>{a.addressLine2}<br /></>}
            {a.city}, {a.state} {a.postalCode}<br />United States
          </address>
          <p className="mt-3 text-sm text-stone-600">Contact: {order.contactEmail}</p>
        </section>
      </div>
    </div>
  );
}
