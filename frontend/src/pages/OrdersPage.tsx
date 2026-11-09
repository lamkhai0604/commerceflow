import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { BagIcon, ChevronRightIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge, EmptyState, LoadError, Skeleton } from '@/components/ui/Feedback';
import { authActions } from '@/features/auth/authSlice';
import commerceApi from '@/features/commerce/commerceApi';
import { formatOrderDate, itemCount, orderStatusLabel } from '@/features/orders/OrderDetails';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

/** Shown on member-only pages to signed-out visitors. */
export function SignInRequired({ title, description }: { title: string; description: string }) {
  const dispatch = useAppDispatch();
  const initializing = useAppSelector(state => state.auth.initializing);
  if (initializing) return <div className="mx-auto max-w-3xl px-5 py-12"><Skeleton className="h-40" /></div>;
  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <EmptyState headingLevel={1} title={title} description={description} action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => dispatch(authActions.openDialog('login'))}>Log in</Button>
          <ButtonLink to="/track-order" variant="secondary">Track a guest order</ButtonLink>
        </div>} />
    </div>
  );
}

export default function OrdersPage() {
  useDocumentTitle('Order history');
  const user = useAppSelector(state => state.auth.currentUser);
  if (!user) return <SignInRequired title="Log in to see your orders" description="Order history is available to members. Guest orders can be tracked with the order number and email address." />;
  return <OrderList userId={user.id} />;
}

function OrderList({ userId }: { userId: string }) {
  const orders = useAsync(() => commerceApi.orders(), userId);
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-[-0.03em]">Order history</h1>
      <div className="mt-8">
        {orders.status === 'loading' && <div className="grid gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}</div>}
        {orders.status === 'error' && <LoadError onRetry={orders.retry}>We could not load your orders.</LoadError>}
        {orders.status === 'success' && orders.data.length === 0 && (
          <EmptyState icon={<BagIcon size={36} />} title="No orders yet" description="Orders you place while logged in appear here."
            action={<ButtonLink to="/products">Start shopping</ButtonLink>} />
        )}
        {orders.status === 'success' && orders.data.length > 0 && (
          <ul className="grid gap-3">
            {orders.data.map(order => (
              <li key={order.id}>
                <Link to={`/account/orders/${order.id}`}
                  className="flex items-center gap-4 rounded-(--radius-card) border border-stone-200 p-4 hover:border-stone-900">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{order.orderNumber}</span><Badge tone="accent">{orderStatusLabel(order)}</Badge>
                    </span>
                    <span className="mt-1 block text-sm text-stone-600">
                      {formatOrderDate(order.createdAt)} · {itemCount(order)} {itemCount(order) === 1 ? 'item' : 'items'}
                    </span>
                  </span>
                  <span className="font-semibold">{formatMoney(order.totalAmount)}</span>
                  <ChevronRightIcon size={18} className="text-stone-500" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
