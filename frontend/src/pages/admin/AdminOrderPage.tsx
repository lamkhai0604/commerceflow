import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeftIcon } from '@/components/icons';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Badge, EmptyState, LoadError, Skeleton } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import adminApi from '@/features/admin/adminApi';
import type { AdminOrder, AuditEntry, OrderStatus } from '@/features/admin/types';
import { isCommerceFailure } from '@/features/commerce/types';
import { formatOrderDate, itemCount, OrderDetails, orderStatusLabel } from '@/features/orders/OrderDetails';
import { useAsync } from '@/lib/useAsync';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const ACTION_LABEL: Record<string, string> = {
  ORDER_SHIPPED: 'Marked as shipped', ORDER_DELIVERED: 'Marked as delivered', ORDER_CANCELLED: 'Cancelled',
};

export default function AdminOrderPage() {
  const { orderId = '' } = useParams();
  useDocumentTitle('Administration · Order');
  const loaded = useAsync(() => adminApi.order(orderId), orderId);
  const notFound = loaded.status === 'error' && (loaded.error as { status?: number })?.status === 404;
  return (
    <div>
      <ButtonLink to="/admin/orders" variant="link" size="sm"><ChevronLeftIcon size={16} />All orders</ButtonLink>
      {loaded.status === 'loading' && <Skeleton className="mt-4 h-72" />}
      {notFound && <EmptyState className="mt-4" title="Order not found" description="This order does not exist." />}
      {loaded.status === 'error' && !notFound && <LoadError className="mt-4" onRetry={loaded.retry}>We could not load this order.</LoadError>}
      {loaded.status === 'success' && <OrderView key={orderId} initial={loaded.data} />}
    </div>
  );
}

function OrderView({ initial }: { initial: AdminOrder }) {
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState<OrderStatus>();
  const [error, setError] = useState<string>();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const { order } = data;

  const change = async (status: OrderStatus, why?: string) => {
    if (saving) return;
    setSaving(status); setError(undefined);
    try {
      setData(await adminApi.changeStatus(order.id, status, why));
      setCancelling(false); setReason('');
      toast({ title: status === 'CANCELLED' ? 'Order cancelled' : status === 'SHIPPED' ? 'Order marked as shipped' : 'Order marked as delivered',
        description: status === 'CANCELLED' ? 'Stock was returned and the payment marked as refunded (demo).' : order.orderNumber, tone: 'success' });
    } catch (failure) {
      const code = isCommerceFailure(failure) ? failure.code : undefined;
      setError(code === 'INVALID_STATE_TRANSITION'
        ? 'This order was changed by someone else, so that step is no longer possible. The current state is shown below.'
        : 'We could not save the change. Nothing was changed; please try again.');
      setCancelling(false);
      if (code === 'INVALID_STATE_TRANSITION') adminApi.order(order.id).then(setData, () => undefined);
    } finally { setSaving(undefined); }
  };

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Order {order.orderNumber}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <Badge tone="accent">{orderStatusLabel(order)}</Badge>{order.guest ? 'Guest order' : 'Member order'} · {formatOrderDate(order.createdAt)} · {itemCount(order)} {itemCount(order) === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.orderStatus === 'CONFIRMED' && (
            <>
              <Button loading={saving === 'SHIPPED'} loadingLabel="Saving…" disabled={!!saving} onClick={() => change('SHIPPED')}>Mark as shipped</Button>
              <Button variant="secondary" disabled={!!saving} onClick={() => setCancelling(true)}>Cancel order</Button>
            </>
          )}
          {order.orderStatus === 'SHIPPED' && (
            <Button loading={saving === 'DELIVERED'} loadingLabel="Saving…" onClick={() => change('DELIVERED')}>Mark as delivered</Button>
          )}
        </div>
      </div>
      {(order.orderStatus === 'DELIVERED' || order.orderStatus === 'CANCELLED') && (
        <p className="mt-3 text-sm text-stone-600">{order.orderStatus === 'CANCELLED' ? 'This order is cancelled: its stock was returned.' : 'This order is complete.'} No further changes are possible.</p>
      )}
      {error && <Alert tone="error" className="mt-4" onDismiss={() => setError(undefined)}>{error}</Alert>}

      <div className="mt-6"><OrderDetails order={order} /></div>
      <History entries={data.history} />

      <CancelDialog open={cancelling} order={order} reason={reason} onReason={setReason} saving={saving === 'CANCELLED'}
        onClose={() => setCancelling(false)} onConfirm={() => change('CANCELLED', reason.trim() || undefined)} />
    </>
  );
}

function History({ entries }: { entries: AuditEntry[] }) {
  return (
    <section aria-labelledby="history-heading" className="mt-8">
      <h2 id="history-heading" className="text-lg font-bold">History</h2>
      {entries.length === 0 ? <p className="mt-2 text-sm text-stone-600">No administrative changes yet. The order was placed by the customer.</p> : (
        <ol className="mt-3 grid gap-2">
          {entries.map(entry => (
            <li key={entry.id} className="rounded-xl bg-stone-50 px-4 py-3 text-sm">
              <span className="font-semibold">{ACTION_LABEL[entry.action] ?? entry.action}</span>
              <span className="text-stone-600"> · {formatOrderDate(entry.createdAt)} · {entry.actorEmail}</span>
              {entry.reason && <span className="mt-1 block text-stone-700">Reason: {entry.reason}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CancelDialog({ open, order, reason, onReason, saving, onClose, onConfirm }: {
  open: boolean; order: AdminOrder['order']; reason: string; onReason: (value: string) => void; saving: boolean; onClose: () => void; onConfirm: () => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (open) field.current?.focus(); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} labelledBy="cancel-title" dismissible={!saving} className="p-6">
      <h2 id="cancel-title" className="text-xl font-bold tracking-tight">Cancel order {order.orderNumber}?</h2>
      <p className="mt-2 text-[15px] text-stone-700">
        The {itemCount(order)} {itemCount(order) === 1 ? 'item goes' : 'items go'} back into stock and the payment is marked as refunded (demonstration payment: nothing is returned). This cannot be undone.
      </p>
      <label htmlFor="cancel-reason" className="mt-4 block text-sm font-semibold">Reason (optional)</label>
      <textarea id="cancel-reason" ref={field} value={reason} maxLength={200} rows={3} onChange={e => onReason(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-stone-400 bg-white p-3 text-[15px]" />
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" disabled={saving} onClick={onClose}>Keep order</Button>
        <Button variant="dark" loading={saving} loadingLabel="Cancelling…" onClick={onConfirm}>Cancel order</Button>
      </div>
    </Dialog>
  );
}
