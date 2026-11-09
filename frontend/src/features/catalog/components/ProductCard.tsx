import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge, Skeleton } from '@/components/ui/Feedback';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { formatMoney } from '@/lib/money';
import type { StorefrontProduct } from '../types';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: StorefrontProduct;
  headingLevel?: 'h2' | 'h3';
  showAddToCart?: boolean;
  sizes?: string;
}

export function ProductCard({ product, headingLevel: Heading = 'h3', showAddToCart = true, sizes = '(min-width: 1024px) 25vw, 50vw' }: ProductCardProps) {
  const addToCart = useAddToCart();
  const href = `/products/${product.slug}`;
  return (
    <article className="flex flex-col">
      <Link to={href} tabIndex={-1} aria-hidden="true" className="relative block">
        <ProductImage src={product.image} alt="" sizes={sizes} />
        {!product.available && <span className="absolute top-3 left-3"><Badge tone="muted">Sold out</Badge></span>}
        {product.available && product.stockLeft && <span className="absolute top-3 left-3"><Badge tone="accent">Only {product.stockLeft} left</Badge></span>}
      </Link>
      <p className="mt-3.5 text-[13px] text-stone-600">{product.categoryName}</p>
      <Heading className="mt-1 text-base font-semibold">
        <Link to={href} className="text-stone-900 hover:underline hover:underline-offset-4">{product.name}</Link>
      </Heading>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-base font-semibold">{formatMoney(product.price)}</span>
        {showAddToCart && (product.available
          ? <Button size="sm" variant="secondary" className="border-pine-700! text-pine-700"
              aria-label={`Add ${product.name} to cart`} onClick={() => addToCart(product)}>Add to cart</Button>
          : <span className="text-[13px] text-stone-600">Out of stock</span>)}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-[4/5] w-full rounded-(--radius-card)" />
      <Skeleton className="mt-3.5 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/4" />
    </div>
  );
}
