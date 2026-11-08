/*
 * Catalog client for the public API (OpenAPI v1.2 catalog, CR-S3-01). Pages depend only on these functions;
 * component tests replace this module with an in-memory fake (src/test/fakeCatalogApi.ts).
 */
import axios, { type AxiosInstance } from 'axios';
import { withWakeRetry } from '@/lib/serverWake';
import type { Money } from '@/lib/money';
import type { CategorySummary, PriceBand, ProductPage, ProductQuery, StorefrontProduct } from './types';

export const DEFAULT_PAGE_SIZE = 9;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface ApiCategory { id: string; name: string; slug: string; productCount: number }
interface ApiProduct {
  id: string; name: string; slug: string; description: string; categoryId: string; price: Money; currency: 'USD';
  available: boolean; imageUrl: string; imageAlt: string; details: string[];
}
interface ApiProductPage { items: ApiProduct[]; page: number; size: number; totalElements: number }

/** Price bands shown in the filters, as inclusive API bounds. */
const PRICE_BOUNDS: Record<PriceBand, { minPrice?: Money; maxPrice?: Money }> = {
  'under-100': { maxPrice: '99.99' },
  '100-500': { minPrice: '100.00', maxPrice: '500.00' },
  'over-500': { minPrice: '500.01' },
};

export function createCatalogApi(http: AxiosInstance) {
  let categoriesRequest: Promise<CategorySummary[]> | undefined;

  const get = <T,>(url: string, params?: Record<string, unknown>) =>
    withWakeRetry(() => http.get<T>(url, { params }).then(response => response.data));

  function listCategories(): Promise<CategorySummary[]> {
    // Categories change rarely; one request per visit is enough. A failed request is not cached.
    categoriesRequest ??= get<ApiCategory[]>('/categories')
      .then(list => list.map(c => ({ ...c, image: `/images/categories/${c.slug}.webp` })))
      .catch(error => { categoriesRequest = undefined; throw error; });
    return categoriesRequest;
  }

  async function toStorefront(products: ApiProduct[]): Promise<StorefrontProduct[]> {
    const categories = new Map((await listCategories()).map(c => [c.id, c]));
    return products.map(({ imageUrl, ...product }) => {
      const category = categories.get(product.categoryId);
      return { ...product, image: imageUrl, categoryName: category?.name ?? '', categorySlug: category?.slug ?? '' };
    });
  }

  async function listProducts(query: ProductQuery = {}): Promise<ProductPage> {
    const params = {
      q: query.q || undefined,
      category: query.category || undefined,
      ...(query.price ? PRICE_BOUNDS[query.price] : {}),
      available: query.inStock ? true : undefined,
      sort: query.sort && query.sort !== 'featured' ? query.sort : undefined,
      page: query.page ?? 0,
      size: query.size ?? DEFAULT_PAGE_SIZE,
    };
    const page = await get<ApiProductPage>('/products', params);
    return { ...page, items: await toStorefront(page.items) };
  }

  async function getProduct(slug: string): Promise<StorefrontProduct | undefined> {
    try {
      const product = await get<ApiProduct>(`/products/${encodeURIComponent(slug)}`);
      return (await toStorefront([product]))[0];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return undefined;
      throw error;
    }
  }

  async function listFeatured(): Promise<StorefrontProduct[]> {
    return (await listProducts({ size: 4 })).items;
  }

  /** Other available products, same room first. */
  async function listRelated(product: StorefrontProduct, count = 4): Promise<StorefrontProduct[]> {
    const sameRoom = (await listProducts({ category: product.categorySlug, inStock: true, size: count + 1 })).items;
    let related = sameRoom.filter(p => p.id !== product.id);
    if (related.length < count) {
      const others = (await listProducts({ inStock: true, size: count * 2 })).items;
      related = [...related, ...others.filter(p => p.id !== product.id && !related.some(r => r.id === p.id))];
    }
    return related.slice(0, count);
  }

  return { listCategories, listProducts, getProduct, listFeatured, listRelated };
}

const api = createCatalogApi(axios.create({ baseURL: API_BASE_URL, timeout: 20_000 }));
export const { listCategories, listProducts, getProduct, listFeatured, listRelated } = api;
