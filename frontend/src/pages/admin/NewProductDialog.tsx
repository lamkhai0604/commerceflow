import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import adminApi from '@/features/admin/adminApi';
import { PLACEHOLDER_IMAGE, type AdminProduct } from '@/features/admin/types';
import { listCategories } from '@/features/catalog/catalogApi';
import type { CategorySummary } from '@/features/catalog/types';
import { isCommerceFailure } from '@/features/commerce/types';
import { useAsync } from '@/lib/useAsync';

const PRICE = /^\d{1,5}(\.\d{1,2})?$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Turns a product name into a URL address: "Linen Table Runner" becomes "linen-table-runner". */
export function slugFromName(name: string) {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);
}

interface Props { open: boolean; products: AdminProduct[]; onClose: () => void; onCreated: (product: AdminProduct) => void }

export function NewProductDialog({ open, products, onClose, onCreated }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} labelledBy="new-product-title" dismissible={!busy} className="max-h-dvh overflow-y-auto p-6">
      {/* The form only exists while the dialog is open, so it always starts empty. */}
      <NewProductForm products={products} onClose={onClose} onCreated={onCreated} onBusy={setBusy} />
    </Dialog>
  );
}

function NewProductForm({ products, onClose, onCreated, onBusy }: Omit<Props, 'open'> & { onBusy: (busy: boolean) => void }) {
  const categories = useAsync<CategorySummary[]>(() => listCategories(), 'categories');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(PLACEHOLDER_IMAGE);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string>();
  const [saving, setSaving] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const [attempt, setAttempt] = useState(0);
  // After a failed submission, move focus (and the scroll position) to the first field that needs attention.
  useEffect(() => {
    if (attempt) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);

  // One option per photo already in the store; the picture is named after the first product that uses it.
  const photos = [...new Map(products.map(p => [p.imageUrl, p.name])).entries()].filter(([path]) => path !== PLACEHOLDER_IMAGE);

  const changeName = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugFromName(value));
    setErrors(previous => ({ ...previous, name: '', slug: slugEdited ? previous.slug ?? '' : '' }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const invalid: Record<string, string> = {};
    if (!name.trim()) invalid.name = 'Name is required.';
    else if (name.trim().length > 200) invalid.name = 'Name must be 200 characters or fewer.';
    if (!SLUG.test(slug)) invalid.slug = 'Use lowercase letters, numbers and single hyphens, for example linen-table-runner.';
    if (!categoryId) invalid.category = 'Please choose a category.';
    if (!PRICE.test(price.trim()) || Number(price) < 0.01) invalid.price = 'Enter a price from 0.01 to 99999.99 with at most two decimals.';
    if (!/^\d{1,6}$/.test(stock.trim()) || Number(stock) > 100000) invalid.stock = 'Enter a whole number from 0 to 100000.';
    setErrors(invalid);
    if (Object.keys(invalid).length) { setAttempt(value => value + 1); return; }
    setSaving(true); onBusy(true); setFailure(undefined);
    try {
      onCreated(await adminApi.createProduct({
        name: name.trim(), slug, categoryId, description, price: Number(price).toFixed(2), stockQuantity: Number(stock), active,
        imagePath: image === PLACEHOLDER_IMAGE ? undefined : image,
      }));
    } catch (error) {
      if (isCommerceFailure(error) && error.code === 'PRODUCT_SLUG_CONFLICT') { setErrors({ slug: 'Another product already uses this address. Choose a different one.' }); setAttempt(value => value + 1); }
      else setFailure('We could not create the product. Nothing was created; please try again.');
      setSaving(false); onBusy(false);
    }
  };

  const select = 'mt-1.5 h-12 w-full rounded-xl border bg-white px-3 text-[15px]';
  return (
    <>
      <h2 id="new-product-title" className="text-xl font-bold tracking-tight">New product</h2>
      <form ref={form} onSubmit={submit} noValidate className="mt-4 grid gap-4">
        <TextField id="new-name" label="Name" required data-autofocus value={name} onChange={e => changeName(e.target.value)} error={errors.name} />
        <TextField id="new-slug" label="Address (slug)" required value={slug} error={errors.slug}
          hint={slug ? `Page: /products/${slug}` : 'Filled in from the name; you can change it.'}
          onChange={e => { setSlug(e.target.value); setSlugEdited(true); setErrors(previous => ({ ...previous, slug: '' })); }} />
        <div>
          <label htmlFor="new-category" className="block text-sm font-semibold">Category<span aria-hidden="true" className="text-red-700"> *</span></label>
          <select id="new-category" value={categoryId} required aria-invalid={errors.category ? true : undefined}
            onChange={e => { setCategoryId(e.target.value); setErrors(previous => ({ ...previous, category: '' })); }}
            className={`${select} ${errors.category ? 'border-2 border-red-700' : 'border-stone-400'}`}>
            <option value="">{categories.status === 'loading' ? 'Loading…' : 'Choose a category'}</option>
            {categories.status === 'success' && categories.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.category && <p className="mt-1.5 text-[13px] text-red-700">{errors.category}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="new-price" label="Price (USD)" required inputMode="decimal" value={price} error={errors.price}
            onChange={e => { setPrice(e.target.value); setErrors(previous => ({ ...previous, price: '' })); }} />
          <TextField id="new-stock" label="In stock" required inputMode="numeric" value={stock} error={errors.stock}
            onChange={e => { setStock(e.target.value); setErrors(previous => ({ ...previous, stock: '' })); }} />
        </div>
        <div>
          <label htmlFor="new-description" className="block text-sm font-semibold">Description</label>
          <textarea id="new-description" rows={3} maxLength={4000} value={description} onChange={e => setDescription(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-stone-400 bg-white p-3 text-[15px]" />
        </div>
        <div>
          <label htmlFor="new-image" className="block text-sm font-semibold">Photo</label>
          <div className="mt-1.5 flex items-center gap-3">
            <img src={`${image}-480.webp`} alt="" className="h-16 w-13 shrink-0 rounded-lg bg-linen object-cover" />
            <select id="new-image" value={image} onChange={e => setImage(e.target.value)} className={`${select} mt-0 border-stone-400`}>
              <option value={PLACEHOLDER_IMAGE}>Placeholder</option>
              {photos.map(([path, product]) => <option key={path} value={path}>Same photo as {product}</option>)}
            </select>
          </div>
          <p className="mt-1.5 text-[13px] text-stone-600">Uploading new photos is not available yet; choose a photo already in the store.</p>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-[15px]">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="size-[18px] accent-pine-700" />
          Show in the store right away
        </label>
        {failure && <Alert tone="error">{failure}</Alert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} loadingLabel="Creating…">Create product</Button>
        </div>
      </form>
    </>
  );
}
