/*
 * In-memory test double for `@/features/catalog/catalogApi`, backed by the same catalog as the V6 seed migration.
 * Component tests use it so they run without a server; the HTTP client has its own tests.
 */
import { toCents } from '@/lib/money';
import { DEMO_CATEGORIES, DEMO_FEATURED_SLUGS, DEMO_PRODUCTS } from './catalogFixtures';
import type { CategorySummary, PriceBand, ProductPage, ProductQuery, StorefrontProduct } from '@/features/catalog/types';

export const DEFAULT_PAGE_SIZE = 9;

const categoryById = new Map(DEMO_CATEGORIES.map(c => [c.id, c]));
const products: StorefrontProduct[] = DEMO_PRODUCTS.map(p => {
  const category = categoryById.get(p.categoryId)!;
  return { ...p, categoryName: category.name, categorySlug: category.slug };
});

const priceBands: Record<PriceBand, (cents: number) => boolean> = {
  'under-100': c => c < 10000,
  '100-500': c => c >= 10000 && c <= 50000,
  'over-500': c => c > 50000,
};

export async function listCategories(): Promise<CategorySummary[]> {
  return DEMO_CATEGORIES.map(c => ({ ...c, productCount: products.filter(p => p.categoryId === c.id).length }));
}

export async function listProducts(query: ProductQuery = {}): Promise<ProductPage> {
  const size = query.size ?? DEFAULT_PAGE_SIZE;
  const term = query.q?.trim().toLowerCase();
  const category = query.category ? DEMO_CATEGORIES.find(c => c.slug === query.category) : undefined;
  let items = products.filter(p =>
    (!term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term) || p.categoryName.toLowerCase().includes(term))
    && (!query.category || p.categoryId === category?.id)
    && (!query.price || priceBands[query.price](toCents(p.price)))
    && (!query.inStock || p.available));
  if (query.sort === 'name,asc') items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  if (query.sort === 'price,asc') items = [...items].sort((a, b) => toCents(a.price) - toCents(b.price));
  if (query.sort === 'price,desc') items = [...items].sort((a, b) => toCents(b.price) - toCents(a.price));
  const totalElements = items.length;
  const lastPage = Math.max(0, Math.ceil(totalElements / size) - 1);
  const page = Math.min(Math.max(0, query.page ?? 0), lastPage);
  return { items: items.slice(page * size, page * size + size), page, size, totalElements };
}

export async function getProduct(slug: string): Promise<StorefrontProduct | undefined> {
  return products.find(p => p.slug === slug);
}

export async function listFeatured(): Promise<StorefrontProduct[]> {
  return DEMO_FEATURED_SLUGS.map(slug => products.find(p => p.slug === slug)!);
}

/** Other products, same category first. */
export async function listRelated(product: StorefrontProduct, count = 4): Promise<StorefrontProduct[]> {
  const others = products.filter(p => p.id !== product.id && p.available);
  return [...others.filter(p => p.categoryId === product.categoryId), ...others.filter(p => p.categoryId !== product.categoryId)].slice(0, count);
}
