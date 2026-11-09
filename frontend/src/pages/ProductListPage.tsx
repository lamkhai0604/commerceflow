import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, LoadError } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { DEFAULT_PAGE_SIZE, listCategories, listProducts } from '@/features/catalog/catalogApi';
import { ProductCard, ProductCardSkeleton } from '@/features/catalog/components/ProductCard';
import type { CategorySummary, PriceBand, ProductQuery, ProductSort } from '@/features/catalog/types';
import { useAsync } from '@/lib/useAsync';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'name,asc', label: 'Name: A to Z' },
];
const PRICES: { value: PriceBand | ''; label: string }[] = [
  { value: '', label: 'Any price' },
  { value: 'under-100', label: 'Under $100' },
  { value: '100-500', label: '$100 to $500' },
  { value: 'over-500', label: 'Over $500' },
];

/** Reads the listing state from the URL so filters survive reloads, back navigation and sharing. */
function useListingParams() {
  const [params, setParams] = useSearchParams();
  const sort = SORTS.some(s => s.value === params.get('sort')) ? params.get('sort') as ProductSort : 'featured';
  const price = PRICES.some(p => p.value && p.value === params.get('price')) ? params.get('price') as PriceBand : undefined;
  const query: ProductQuery = {
    q: params.get('q')?.slice(0, 120) || undefined,
    category: params.get('category') || undefined,
    sort,
    price,
    inStock: params.get('inStock') === 'true',
    page: Math.max(0, (Number.parseInt(params.get('page') ?? '1', 10) || 1) - 1),
    size: DEFAULT_PAGE_SIZE,
  };
  /** Any filter change returns to the first page. */
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const hrefFor = (page: number) => {
    const next = new URLSearchParams(params);
    if (page > 0) next.set('page', String(page + 1)); else next.delete('page');
    return `/products?${next}`;
  };
  return { query, update, hrefFor, clear: () => setParams(query.q ? { q: query.q } : {}) };
}

export default function ProductListPage() {
  const { query, update, hrefFor, clear } = useListingParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = useAsync(listCategories, 'categories');
  const key = JSON.stringify(query);
  const result = useAsync(() => listProducts(query), key);
  const category = categories.data?.find(c => c.slug === query.category);
  const title = query.q ? `Results for “${query.q}”` : category?.name ?? 'Shop all';
  useDocumentTitle(title);
  const hasFilters = !!(query.category || query.price || query.inStock);

  const filters = (idPrefix: string) => (
    <FilterPanel idPrefix={idPrefix} categories={categories.data ?? []} query={query} update={update}
      clear={hasFilters ? clear : undefined} />
  );

  return (
    <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-6 lg:pt-8 xl:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-stone-600">
        <ol className="flex flex-wrap gap-1.5">
          <li><Link to="/" className="underline-offset-4 hover:underline">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{title}</h1>
          <p role="status" className="mt-2 text-[15px] text-stone-600">
            {result.status === 'success' ? resultSummary(result.data.page, result.data.size, result.data.items.length, result.data.totalElements)
              : result.status === 'loading' ? 'Loading products…' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            Filters{hasFilters ? ' (on)' : ''}
          </Button>
          <label htmlFor="sort" className="text-sm text-stone-700">Sort by</label>
          <select id="sort" value={query.sort} onChange={e => update({ sort: e.target.value === 'featured' ? undefined : e.target.value })}
            className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900">
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-7 flex items-start gap-10">
        <aside aria-label="Filters" className="hidden w-60 shrink-0 lg:block">{filters('desktop')}</aside>
        <section aria-label="Products" className="min-w-0 flex-1" aria-busy={result.status === 'loading'}>
          {result.status === 'error' && <LoadError onRetry={result.retry}>We could not load products.</LoadError>}
          {result.status === 'loading' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-6">
              {Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}
          {result.status === 'success' && (result.data.totalElements === 0 ? (
            <EmptyState icon={<SearchIcon size={36} />} title="No products match"
              description={query.q ? 'Try a different search term or fewer filters.' : 'Try fewer filters.'}
              action={<Button variant="secondary" onClick={() => (hasFilters ? clear() : update({ q: undefined }))}>
                {hasFilters ? 'Clear filters' : 'Show all products'}
              </Button>} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-6">
                {result.data.items.map(product => <ProductCard key={product.id} product={product} headingLevel="h2"
                  sizes="(min-width: 1024px) 22vw, (min-width: 768px) 33vw, 50vw" />)}
              </div>
              <div className="mt-12">
                <Pagination page={result.data.page} totalPages={Math.ceil(result.data.totalElements / result.data.size)} hrefFor={hrefFor} />
              </div>
            </>
          ))}
        </section>
      </div>

      <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} labelledBy="filters-title" placement="left">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 id="filters-title" className="text-lg font-bold">Filters</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{filters('mobile')}</div>
        <div className="border-t border-stone-200 p-5">
          <Button fullWidth size="lg" onClick={() => setFiltersOpen(false)}>
            {result.status === 'success' ? `Show ${result.data.totalElements} ${result.data.totalElements === 1 ? 'product' : 'products'}` : 'Show products'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function resultSummary(page: number, size: number, shown: number, total: number) {
  if (total === 0) return 'No products found';
  if (total <= size) return `${total} ${total === 1 ? 'product' : 'products'}`;
  return `Showing ${page * size + 1}–${page * size + shown} of ${total} products`;
}

interface FilterPanelProps {
  idPrefix: string;
  categories: CategorySummary[];
  query: ProductQuery;
  update: (changes: Record<string, string | undefined>) => void;
  clear?: () => void;
}

function FilterPanel({ idPrefix, categories, query, update, clear }: FilterPanelProps) {
  const option = 'flex min-h-10 cursor-pointer items-center gap-3 text-[15px]';
  const control = 'size-[18px] accent-pine-700';
  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="text-[15px] font-semibold">Room</legend>
        <div className="mt-2.5 flex flex-col">
          <label className={option}>
            <input type="radio" name={`${idPrefix}-room`} className={control} checked={!query.category} onChange={() => update({ category: undefined })} />
            All rooms
          </label>
          {categories.map(c => (
            <label key={c.id} className={option}>
              <input type="radio" name={`${idPrefix}-room`} className={control} checked={query.category === c.slug} onChange={() => update({ category: c.slug })} />
              {c.name}<span className="ml-auto text-[13px] text-stone-600">{c.productCount}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="border-t border-stone-200 pt-5">
        <legend className="float-left w-full text-[15px] font-semibold">Price</legend>
        <div className="clear-both flex flex-col pt-2.5">
          {PRICES.map(p => (
            <label key={p.label} className={option}>
              <input type="radio" name={`${idPrefix}-price`} className={control} checked={(query.price ?? '') === p.value}
                onChange={() => update({ price: p.value || undefined })} />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="border-t border-stone-200 pt-5">
        <label className={option}>
          <input type="checkbox" className={control} checked={!!query.inStock} onChange={e => update({ inStock: e.target.checked ? 'true' : undefined })} />
          In stock only
        </label>
        {clear && <Button variant="link" size="sm" className="mt-2" onClick={clear}>Clear all filters</Button>}
      </div>
    </div>
  );
}
