import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, LoadError, Skeleton } from '@/components/ui/Feedback';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { MAX_QUANTITY } from '@/features/cart/cartSlice';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { getProduct, listRelated } from '@/features/catalog/catalogApi';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { ProductImage } from '@/features/catalog/components/ProductImage';
import type { StorefrontProduct } from '@/features/catalog/types';
import { formatMoney, fromCents, toCents } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const result = useAsync(() => getProduct(slug), slug);
  useDocumentTitle(result.status === 'success' ? result.data?.name ?? 'Product not found' : undefined);

  if (result.status === 'error') {
    return <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6"><LoadError onRetry={result.retry}>We could not load this product.</LoadError></div>;
  }
  if (result.status === 'success' && !result.data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <EmptyState title="Product not found" description="It may have been removed, or the link may be incomplete."
          action={<ButtonLink to="/products">Browse all products</ButtonLink>} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-6 lg:pt-8 xl:px-8" aria-busy={result.status === 'loading'}>
      {result.status === 'success' && result.data ? <ProductDetail key={result.data.id} product={result.data} /> : <ProductDetailSkeleton />}
    </div>
  );
}

function ProductDetail({ product }: { product: StorefrontProduct }) {
  const limit = Math.min(MAX_QUANTITY, product.stockLeft ?? MAX_QUANTITY);
  const [chosen, setQuantity] = useState(1);
  const quantity = Math.min(chosen, limit);
  const addToCart = useAddToCart();
  const related = useAsync(() => listRelated(product), product.id);

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-stone-600">
        <ol className="flex flex-wrap gap-1.5">
          <li><Link to="/" className="underline-offset-4 hover:underline">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to={`/products?category=${product.categorySlug}`} className="underline-offset-4 hover:underline">{product.categoryName}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <ProductImage src={product.image} alt={product.imageAlt} priority sizes="(min-width: 1024px) 55vw, 100vw" className="rounded-3xl" />

        <div>
          <p className="text-sm text-stone-600">{product.categoryName}</p>
          <h1 className="mt-2 text-3xl leading-tight font-bold tracking-[-0.03em] sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-2xl font-semibold">{formatMoney(product.price)}</p>
          <p className="mt-5 text-base leading-relaxed text-stone-700 sm:text-[17px]">{product.description}</p>

          {product.available ? (
            <>
              <div className="mt-8 flex flex-wrap gap-3">
                <QuantityStepper size="lg" label="Quantity" value={quantity} max={limit} onChange={setQuantity} />
                <Button size="lg" className="flex-1 basis-56" onClick={() => addToCart(product, quantity)}>
                  Add to cart · {formatMoney(fromCents(toCents(product.price) * quantity))}
                </Button>
              </div>
              <p className="mt-3.5 flex items-center gap-2 text-sm text-green-800">
                <CheckIcon size={18} />{product.stockLeft ? `Only ${product.stockLeft} left` : 'In stock'} · Standard delivery in 3–5 business days
              </p>
            </>
          ) : (
            <div className="mt-8">
              <Button size="lg" fullWidth disabled>Sold out</Button>
              <p className="mt-3.5 text-sm text-stone-600">This product is out of stock. Browse other pieces in{' '}
                <Link to={`/products?category=${product.categorySlug}`} className="font-semibold text-pine-700 underline">{product.categoryName}</Link>.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-stone-200">
            <details open className="group border-b border-stone-200 py-4">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-[15px] font-semibold">
                Details and dimensions<span aria-hidden="true" className="text-xl group-open:rotate-45">+</span>
              </summary>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-stone-700">
                {product.details.map(detail => <li key={detail}>{detail}</li>)}
              </ul>
            </details>
            <details className="group border-b border-stone-200 py-4">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-[15px] font-semibold">
                Shipping and returns<span aria-hidden="true" className="text-xl group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-stone-700">
                Free shipping on orders over $75; otherwise $9.00. Our demonstration policy is 30 days for unused items; this demo store has no returns process.
                No orders are shipped.
              </p>
            </details>
          </div>
        </div>
      </div>

      {related.status === 'success' && related.data.length > 0 && (
        <section aria-labelledby="related-title" className="mt-20">
          <h2 id="related-title" className="text-2xl font-bold tracking-tight">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
            {related.data.map(p => <ProductCard key={p.id} product={p} showAddToCart={false} />)}
          </div>
        </section>
      )}
    </>
  );
}

function ProductDetailSkeleton() {
  return (
    <div aria-hidden="true" className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
      <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
      <div>
        <Skeleton className="h-4 w-24" /><Skeleton className="mt-4 h-9 w-3/4" /><Skeleton className="mt-4 h-7 w-28" />
        <Skeleton className="mt-6 h-20 w-full" /><Skeleton className="mt-8 h-13 w-full rounded-full" />
      </div>
    </div>
  );
}
