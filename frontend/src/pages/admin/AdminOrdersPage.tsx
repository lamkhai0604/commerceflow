import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, LoadError, Skeleton } from '@/components/ui/Feedback';
import adminApi from '@/features/admin/adminApi';
import type { OrderStatus } from '@/features/admin/types';
import { formatOrderDate, itemCount, orderStatusLabel } from '@/features/orders/OrderDetails';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const STATUSES: Array<[OrderStatus | '', string]> = [['', 'All statuses'], ['CONFIRMED', 'Confirmed'], ['SHIPPED', 'Shipped'], ['DELIVERED', 'Delivered'], ['CANCELLED', 'Cancelled']];

export default function AdminOrdersPage() {
  useDocumentTitle('Administration · Orders');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const orders = useAsync(() => adminApi.orders({ status: status || undefined, q: q || undefined }), `${status}|${q}`);
  const submit = (event: FormEvent) => { event.preventDefault(); setQ(draft.trim()); };
  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="sr-only">Orders</h2>
      <form onSubmit={submit} role="search" aria-label="Find orders" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="order-status" className="block text-sm font-semibold">Status</label>
          <select id="order-status" value={status} onChange={e => setStatus(e.target.value as OrderStatus | '')}
            className="mt-1.5 h-12 rounded-xl border border-stone-400 bg-white px-3 text-[15px]">
            {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="min-w-56 flex-1">
          <label htmlFor="order-search" className="block text-sm font-semibold">Order number or email</label>
          <input id="order-search" value={draft} onChange={e => setDraft(e.target.value)} maxLength={120} placeholder="CF-XXXXXXXX or part of an email"
            className="mt-1.5 h-12 w-full rounded-xl border border-stone-400 bg-white px-3.5 text-[15px] placeholder:text-stone-500" />
        </div>
        <Button type="submit" variant="secondary" size="lg">Search</Button>
      </form>

      <div className="mt-6">
        {orders.status === 'loading' && <div className="grid gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}</div>}
        {orders.status === 'error' && <LoadError onRetry={orders.retry}>We could not load orders.</LoadError>}
        {orders.status === 'success' && orders.data.length === 0 && <EmptyState title="No orders found" description="Try another status or search term." />}
        {orders.status === 'success' && orders.data.length > 0 && (
          <>
            <p className="mb-3 text-sm text-stone-600" role="status">{orders.data.length} {orders.data.length === 1 ? 'order' : 'orders'}, newest first</p>
            <ul className="grid grid-cols-1 gap-3">
              {orders.data.map(order => (
                <li key={order.id}>
                  <Link to={`/admin/orders/${order.id}`} className="flex items-center gap-4 rounded-(--radius-card) border border-stone-200 p-4 hover:border-stone-900">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{order.orderNumber}</span><Badge tone="accent">{orderStatusLabel(order)}</Badge>
                        {order.guest && <Badge tone="muted">Guest</Badge>}
                      </span>
                      <span className="mt-1 block truncate text-sm text-stone-600">
                        {order.contactEmail} · {formatOrderDate(order.createdAt)} · {itemCount(order)} {itemCount(order) === 1 ? 'item' : 'items'}
                      </span>
                    </span>
                    <span className="font-semibold">{formatMoney(order.totalAmount)}</span>
                    <ChevronRightIcon size={18} className="text-stone-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
