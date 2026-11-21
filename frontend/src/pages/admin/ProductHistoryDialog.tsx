import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { LoadError, Skeleton } from '@/components/ui/Feedback';
import adminApi from '@/features/admin/adminApi';
import type { AuditEntry } from '@/features/admin/types';
import { formatOrderDate } from '@/features/orders/OrderDetails';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';

const ACTION: Record<string, string> = { PRODUCT_CREATED: 'Created', PRODUCT_UPDATED: 'Details changed', STOCK_SET: 'Stock set' };

type Change = { from?: unknown; to?: unknown };
const asChange = (value: unknown): Change | undefined => (value && typeof value === 'object' ? (value as Change) : undefined);
const money = (value: unknown) => { try { return formatMoney(String(value)); } catch { return String(value); } };

/** What an entry changed, in words. Only fields the API documents are shown; ids and paths are never printed. */
export function describeEntry(entry: AuditEntry): string[] {
  const d = entry.details;
  if (entry.action === 'PRODUCT_CREATED') return [`${String(d.name ?? '')}, ${money(d.price)}, ${String(d.stock ?? 0)} in stock`];
  if (entry.action === 'STOCK_SET') return [`Stock ${String(d.from)} → ${String(d.to)}`];
  const lines: string[] = [];
  const name = asChange(d.name); if (name) lines.push(`Name: ${String(name.from)} → ${String(name.to)}`);
  const price = asChange(d.price); if (price) lines.push(`Price: ${money(price.from)} → ${money(price.to)}`);
  const active = asChange(d.active); if (active) lines.push(active.to ? 'Shown in the store' : 'Hidden from the store');
  if (d.description) lines.push('Description changed');
  if (d.category) lines.push('Category changed');
  if (d.image) lines.push('Photo changed');
  return lines.length ? lines : ['Details changed'];
}

/** Administrative changes to one product, oldest first. Mounted only while open, so it always loads fresh data. */
export function ProductHistoryDialog({ open, productId, productName, onClose }: { open: boolean; productId: string; productName: string; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy={`history-${productId}`} className="max-h-dvh overflow-y-auto p-6">
      <History productId={productId} productName={productName} onClose={onClose} />
    </Dialog>
  );
}

function History({ productId, productName, onClose }: { productId: string; productName: string; onClose: () => void }) {
  const history = useAsync(() => adminApi.productHistory(productId), productId);
  return (
    <>
      <h2 id={`history-${productId}`} className="text-xl font-bold tracking-tight">History of {productName}</h2>
      <div className="mt-4">
        {history.status === 'loading' && <Skeleton className="h-24" />}
        {history.status === 'error' && <LoadError onRetry={history.retry}>We could not load the history.</LoadError>}
        {history.status === 'success' && history.data.length === 0 && <p className="text-sm text-stone-600">No administrative changes yet. This is the product as it was set up.</p>}
        {history.status === 'success' && history.data.length > 0 && (
          <ol className="grid gap-2">
            {history.data.map(entry => (
              <li key={entry.id} className="rounded-xl bg-stone-50 px-4 py-3 text-sm">
                <span className="font-semibold">{ACTION[entry.action] ?? entry.action}</span>
                <span className="text-stone-600"> · {formatOrderDate(entry.createdAt)} · {entry.actorEmail}</span>
                {describeEntry(entry).map(line => <span key={line} className="mt-1 block text-stone-700">{line}</span>)}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="mt-5 flex justify-end"><Button variant="secondary" data-autofocus onClick={onClose}>Close</Button></div>
    </>
  );
}
