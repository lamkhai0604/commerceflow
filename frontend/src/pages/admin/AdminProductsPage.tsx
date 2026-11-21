import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Badge, EmptyState, LoadError, Skeleton } from '@/components/ui/Feedback';
import { NewProductDialog } from './NewProductDialog';
import { photoOptions } from './photos';
import { ProductHistoryDialog } from './ProductHistoryDialog';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import adminApi from '@/features/admin/adminApi';
import { PLACEHOLDER_IMAGE, type AdminProduct, type ProductChanges } from '@/features/admin/types';
import { listCategories } from '@/features/catalog/catalogApi';
import { isCommerceFailure } from '@/features/commerce/types';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminProductsPage() {
  useDocumentTitle('Administration · Products and stock');
  const loaded = useAsync(() => adminApi.products(), 'products');
  return (
    <section aria-labelledby="products-heading">
      <h2 id="products-heading" className="sr-only">Products and stock</h2>
      {loaded.status === 'loading' && <div className="grid gap-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>}
      {loaded.status === 'error' && <LoadError onRetry={loaded.retry}>We could not load products.</LoadError>}
      {loaded.status === 'success' && <ProductList initial={loaded.data} />}
    </section>
  );
}

function ProductList({ initial }: { initial: AdminProduct[] }) {
  const [products, setProducts] = useState(initial);
  const [search, setSearch] = useState('');
  const shown = products.filter(p => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const photos = photoOptions(products);
  const replace = (updated: AdminProduct) => setProducts(list => list.map(p => (p.id === updated.id ? updated : p)));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-sm">
          <label htmlFor="product-search" className="block text-sm font-semibold">Find a product</label>
          <input id="product-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name"
            className="mt-1.5 h-12 w-full rounded-xl border border-stone-400 bg-white px-3.5 text-[15px] placeholder:text-stone-500" />
        </div>
        <Button size="lg" onClick={() => setCreating(true)}>New product</Button>
      </div>
      <NewProductDialog open={creating} products={products} onClose={() => setCreating(false)} onCreated={created => {
        setProducts(list => [...list, created]); setSearch(''); setCreating(false);
        toast({ title: 'Product created', description: created.active ? `${created.name} is in the store.` : `${created.name} is saved but hidden.`, tone: 'success' });
      }} />
      <p className="mt-4 text-sm text-stone-600" role="status">{shown.length} of {products.length} products</p>
      {shown.length === 0 ? <EmptyState className="mt-4" title="No products match" description="Try a different name." /> : (
        <ul className="mt-3 grid grid-cols-1 gap-3">{shown.map(product => <ProductRow key={product.id} product={product} photos={photos} onChange={replace} />)}</ul>
      )}
    </>
  );
}

function ProductRow({ product, photos, onChange }: { product: AdminProduct; photos: Array<[string, string]>; onChange: (product: AdminProduct) => void }) {
  const toast = useToast();
  const [stock, setStock] = useState(String(product.stockQuantity));
  const [saving, setSaving] = useState<'stock' | 'active'>();
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  // Follow the server value after a save or a reload (adjusting state during render, not in an effect).
  const [seen, setSeen] = useState(product.stockQuantity);
  if (seen !== product.stockQuantity) { setSeen(product.stockQuantity); setStock(String(product.stockQuantity)); }

  const parsed = /^\d{1,6}$/.test(stock.trim()) ? Number(stock) : NaN;
  const valid = Number.isInteger(parsed) && parsed >= 0 && parsed <= 100000;

  const saveStock = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving || parsed === product.stockQuantity) return;
    setSaving('stock'); setError(undefined);
    try {
      const updated = await adminApi.setStock(product.id, parsed, product.stockQuantity);
      onChange(updated);
      toast({ title: 'Stock saved', description: `${product.name}: ${updated.stockQuantity} in stock`, tone: 'success' });
    } catch (failure) {
      if (isCommerceFailure(failure) && failure.code === 'STOCK_CHANGED') {
        // Sales changed the stock since it was loaded: show the current value instead of overwriting it.
        setError('Stock changed since this page loaded (a customer may have bought some). The current value is shown; enter the new value again.');
        adminApi.products().then(list => { const fresh = list.find(p => p.id === product.id); if (fresh) onChange(fresh); }, () => undefined);
      } else setError('We could not save the stock. Nothing was changed; please try again.');
    } finally { setSaving(undefined); }
  };

  const toggleActive = async () => {
    if (saving) return;
    setSaving('active'); setError(undefined);
    try {
      const updated = await adminApi.updateProduct(product.id, { active: !product.active });
      onChange(updated);
      toast({ title: updated.active ? 'Product is on sale again' : 'Product hidden from the store', description: product.name, tone: 'success' });
    } catch { setError('We could not save the change. Nothing was changed; please try again.'); }
    finally { setSaving(undefined); }
  };

  return (
    <li className={`rounded-(--radius-card) border p-4 ${product.active ? 'border-stone-200' : 'border-stone-300 bg-stone-50'}`}>
      <div className="flex flex-wrap items-center gap-4">
        <img src={`${product.imageUrl}-480.webp`} alt="" className="h-16 w-13 shrink-0 rounded-lg bg-linen object-cover" />
        <div className="min-w-48 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {product.name}
            {!product.active && <Badge tone="muted">Hidden</Badge>}
            {product.active && product.stockQuantity === 0 && <Badge tone="muted">Sold out</Badge>}
            {product.active && product.stockQuantity > 0 && product.stockQuantity <= 5 && <Badge tone="accent">Low stock</Badge>}
          </p>
          <p className="text-sm text-stone-600">{product.categoryName} · {formatMoney(product.price)}</p>
        </div>
        <form onSubmit={saveStock} className="flex items-end gap-2" aria-label={`Stock for ${product.name}`}>
          <div>
            <label htmlFor={`stock-${product.id}`} className="block text-[13px] font-semibold">In stock</label>
            <input id={`stock-${product.id}`} inputMode="numeric" value={stock} onChange={e => setStock(e.target.value)}
              aria-invalid={valid ? undefined : true} className={`mt-1 h-11 w-24 rounded-xl bg-white px-3 text-[15px] ${valid ? 'border border-stone-400' : 'border-2 border-red-700'}`} />
          </div>
          <Button type="submit" size="sm" variant="secondary" loading={saving === 'stock'} loadingLabel="Saving…"
            disabled={!valid || parsed === product.stockQuantity}>Save stock</Button>
        </form>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={!!saving} onClick={() => setEditing(true)} aria-label={`Edit details of ${product.name}`}>Edit details</Button>
          <Button size="sm" variant="secondary" onClick={() => setHistory(true)} aria-label={`History of ${product.name}`}>History</Button>
          <Button size="sm" variant="secondary" loading={saving === 'active'} loadingLabel="Saving…" disabled={!!saving} onClick={toggleActive}
            aria-label={`${product.active ? 'Hide' : 'Show'} ${product.name}`}>{product.active ? 'Hide' : 'Show'}</Button>
        </div>
      </div>
      {!valid && <p className="mt-2 text-[13px] text-red-700">Enter a whole number from 0 to 100000.</p>}
      {error && <Alert tone="error" className="mt-3" onDismiss={() => setError(undefined)}>{error}</Alert>}
      <ProductHistoryDialog open={history} productId={product.id} productName={product.name} onClose={() => setHistory(false)} />
      <EditDialog open={editing} product={product} photos={photos} onClose={() => setEditing(false)} onSaved={updated => { onChange(updated); setEditing(false);
        toast({ title: 'Product saved', description: updated.name, tone: 'success' }); }} />
    </li>
  );
}

const PRICE = /^\d{1,5}(\.\d{1,2})?$/;

function EditDialog({ open, product, photos, onClose, onSaved }: { open: boolean; product: AdminProduct; photos: Array<[string, string]>; onClose: () => void; onSaved: (product: AdminProduct) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} labelledBy={`edit-${product.id}`} dismissible={!busy} className="p-6">
      {/* The form only exists while the dialog is open, so it starts from the saved values every time. */}
      <EditForm product={product} photos={photos} onClose={onClose} onSaved={onSaved} onBusy={setBusy} />
    </Dialog>
  );
}

function EditForm({ product, photos, onClose, onSaved, onBusy }: { product: AdminProduct; photos: Array<[string, string]>; onClose: () => void; onSaved: (product: AdminProduct) => void; onBusy: (busy: boolean) => void }) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price);
  const [description, setDescription] = useState(product.description);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [image, setImage] = useState(product.imageUrl);
  const categories = useAsync(() => listCategories(), 'categories');
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();
  const form = useRef<HTMLFormElement>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (attempt) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const invalid: typeof errors = {};
    if (!name.trim()) invalid.name = 'Name is required.';
    else if (name.trim().length > 200) invalid.name = 'Name must be 200 characters or fewer.';
    if (!PRICE.test(price.trim()) || Number(price) < 0.01) invalid.price = 'Enter a price from 0.01 to 99999.99 with at most two decimals.';
    setErrors(invalid);
    if (Object.keys(invalid).length) { setAttempt(value => value + 1); return; }
    const changes: ProductChanges = {};
    if (name.trim() !== product.name) changes.name = name.trim();
    if (description !== product.description) changes.description = description;
    if (Number(price) !== Number(product.price)) changes.price = Number(price).toFixed(2);
    if (categoryId !== product.categoryId) changes.categoryId = categoryId;
    if (image !== product.imageUrl && image !== PLACEHOLDER_IMAGE) changes.imagePath = image;
    if (Object.keys(changes).length === 0) { onClose(); return; }
    setSaving(true); onBusy(true); setFailure(undefined);
    try { onSaved(await adminApi.updateProduct(product.id, changes)); }
    catch { setFailure('We could not save the product. Nothing was changed; please try again.'); setSaving(false); onBusy(false); }
  };

  return (
    <>
      <h2 id={`edit-${product.id}`} className="text-xl font-bold tracking-tight">Edit {product.name}</h2>
      <form ref={form} onSubmit={submit} noValidate className="mt-4 grid gap-4">
        <TextField id={`name-${product.id}`} label="Name" required data-autofocus value={name} onChange={e => setName(e.target.value)} error={errors.name} />
        <TextField id={`price-${product.id}`} label="Price (USD)" required inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)}
          error={errors.price} hint="Applies to new orders. Existing orders keep the price they were placed at." />
        <div>
          <label htmlFor={`category-${product.id}`} className="block text-sm font-semibold">Category</label>
          <select id={`category-${product.id}`} value={categoryId} onChange={e => setCategoryId(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-xl border border-stone-400 bg-white px-3 text-[15px]">
            {categories.status !== 'success' && <option value={product.categoryId}>{product.categoryName}</option>}
            {categories.status === 'success' && categories.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`photo-${product.id}`} className="block text-sm font-semibold">Photo</label>
          <div className="mt-1.5 flex items-center gap-3">
            <img src={`${image}-480.webp`} alt="" className="h-16 w-13 shrink-0 rounded-lg bg-linen object-cover" />
            <select id={`photo-${product.id}`} value={image} onChange={e => setImage(e.target.value)}
              className="h-12 w-full rounded-xl border border-stone-400 bg-white px-3 text-[15px]">
              {image === PLACEHOLDER_IMAGE && <option value={PLACEHOLDER_IMAGE}>Placeholder</option>}
              {photos.map(([path, name]) => <option key={path} value={path}>{path === product.imageUrl ? 'Current photo' : `Same photo as ${name}`}</option>)}
            </select>
          </div>
          <p className="mt-1.5 text-[13px] text-stone-600">Uploading new photos is not available yet; choose a photo already in the store.</p>
        </div>
        <div>
          <label htmlFor={`description-${product.id}`} className="block text-sm font-semibold">Description</label>
          <textarea id={`description-${product.id}`} rows={4} maxLength={4000} value={description} onChange={e => setDescription(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-stone-400 bg-white p-3 text-[15px]" />
        </div>
        {failure && <Alert tone="error">{failure}</Alert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} loadingLabel="Saving…">Save product</Button>
        </div>
      </form>
    </>
  );
}
