import { useParams } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { ChevronLeftIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, LoadError, Skeleton } from '@/components/ui/Feedback';
import commerceApi from '@/features/commerce/commerceApi';
import { OrderDetails } from '@/features/orders/OrderDetails';
import { useAsync } from '@/lib/useAsync';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { SignInRequired } from './OrdersPage';

export default function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const user = useAppSelector(state => state.auth.currentUser);
  useDocumentTitle('Order details');
  if (!user) return <SignInRequired title="Log in to see this order" description="Order details are available to the member who placed the order." />;
  return <Detail key={orderId} orderId={orderId} />;
}

function Detail({ orderId }: { orderId: string }) {
  const order = useAsync(() => commerceApi.order(orderId), orderId);
  const notFound = order.status === 'error' && (order.error as { status?: number })?.status === 404;
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
      <ButtonLink to="/account/orders" variant="link" size="sm"><ChevronLeftIcon size={16} />Order history</ButtonLink>
      {order.status === 'loading' && <Skeleton className="mt-6 h-72" />}
      {notFound && <EmptyState className="mt-6" title="Order not found" description="This order does not exist or belongs to another account." />}
      {order.status === 'error' && !notFound && <LoadError className="mt-6" onRetry={order.retry}>We could not load this order.</LoadError>}
      {order.status === 'success' && (
        <>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">Order {order.data.orderNumber}</h1>
          <div className="mt-8"><OrderDetails order={order.data} /></div>
        </>
      )}
    </div>
  );
}
