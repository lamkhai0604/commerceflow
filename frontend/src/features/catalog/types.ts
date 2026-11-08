import type { Money } from '@/lib/money';

/** Mirrors `Category` in the OpenAPI v1.0 design baseline. */
export interface Category {
  id: string;
  name: string;
  slug: string;
}

/** Mirrors `Product` in the OpenAPI v1.0 design baseline (public projection). */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  price: Money;
  currency: 'USD';
  available: boolean;
}

/**
 * Presentation data the storefront needs beyond the API contract. Kept separate so the
 * API-backed implementation can source it elsewhere (for example a media service) later.
 */
export interface ProductMedia {
  /** Base path without size suffix; files exist at `${image}-480.webp` and `${image}-960.webp`. */
  image: string;
  imageAlt: string;
  details: string[];
}

export type StorefrontProduct = Product & ProductMedia & { categoryName: string; categorySlug: string };

export interface CategorySummary extends Category {
  image: string;
  productCount: number;
}

/** Sort values accepted by `GET /products` in the OpenAPI baseline; `featured` omits the parameter. */
export type ProductSort = 'featured' | 'name,asc' | 'price,asc' | 'price,desc';

export interface ProductQuery {
  q?: string;
  category?: string;
  /** Zero-based page index. */
  page?: number;
  size?: number;
  sort?: ProductSort;
  /** Price band filter (storefront-only until the API supports price filtering). */
  price?: PriceBand;
  inStock?: boolean;
}

export type PriceBand = 'under-100' | '100-500' | 'over-500';

/** Mirrors `ProductPage` in the OpenAPI baseline. */
export interface ProductPage {
  items: StorefrontProduct[];
  page: number;
  size: number;
  totalElements: number;
}
