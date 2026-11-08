import axios, { type InternalAxiosRequestConfig } from 'axios';
import { createCatalogApi } from './catalogApi';

const categories = [
  { id: 'c-living', name: 'Living', slug: 'living', productCount: 2 },
  { id: 'c-decor', name: 'Decor', slug: 'decor', productCount: 1 },
];
const product = (id: string, categoryId: string) => ({
  id, name: `Product ${id}`, slug: `product-${id}`, description: '', categoryId, price: '10.00', currency: 'USD',
  available: true, imageUrl: `/images/products/product-${id}`, imageAlt: 'alt', details: [],
});

function setup(handler: (config: InternalAxiosRequestConfig) => { status: number; data: unknown }) {
  const calls: InternalAxiosRequestConfig[] = [];
  const http = axios.create({
    adapter: async config => {
      calls.push(config);
      const { status, data } = handler(config);
      const response = { config, status, data, statusText: '', headers: {} };
      if (status >= 400) throw new axios.AxiosError('failed', String(status), config, undefined, response);
      return response;
    },
  });
  return { api: createCatalogApi(http), calls };
}

test('listing maps storefront filters to API parameters and joins room names', async () => {
  const { api, calls } = setup(config => config.url === '/categories'
    ? { status: 200, data: categories }
    : { status: 200, data: { items: [product('1', 'c-decor')], page: 1, size: 9, totalElements: 10 } });
  const page = await api.listProducts({ q: 'vase', category: 'decor', price: '100-500', inStock: true, sort: 'price,asc', page: 1 });
  const listing = calls.find(c => c.url === '/products')!;
  expect(listing.params).toEqual({ q: 'vase', category: 'decor', minPrice: '100.00', maxPrice: '500.00', available: true, sort: 'price,asc', page: 1, size: 9 });
  expect(page.items[0]).toMatchObject({ categoryName: 'Decor', categorySlug: 'decor', image: '/images/products/product-1' });
  expect(page.totalElements).toBe(10);
});

test('featured sorting and empty filters are not sent; categories are requested once per visit', async () => {
  const { api, calls } = setup(config => config.url === '/categories'
    ? { status: 200, data: categories } : { status: 200, data: { items: [], page: 0, size: 9, totalElements: 0 } });
  await api.listProducts({ sort: 'featured', q: '' });
  await api.listProducts({ price: 'under-100' });
  expect(calls.filter(c => c.url === '/products')[0].params).toEqual({ q: undefined, category: undefined, available: undefined, sort: undefined, page: 0, size: 9 });
  expect(calls.filter(c => c.url === '/products')[1].params).toMatchObject({ maxPrice: '99.99' });
  expect(calls.filter(c => c.url === '/categories')).toHaveLength(1);
  const rooms = await api.listCategories();
  expect(rooms[0].image).toBe('/images/categories/living.webp');
});

test('an unknown product resolves to undefined; other failures are reported', async () => {
  const { api } = setup(config => config.url === '/categories' ? { status: 200, data: categories }
    : config.url === '/products/missing' ? { status: 404, data: { code: 'RESOURCE_NOT_FOUND' } } : { status: 500, data: {} });
  await expect(api.getProduct('missing')).resolves.toBeUndefined();
  await expect(api.getProduct('broken')).rejects.toBeTruthy();
});

test('related products prefer the same room and exclude the product itself', async () => {
  const { api } = setup(config => {
    if (config.url === '/categories') return { status: 200, data: categories };
    const items = config.params.category === 'living' ? [product('1', 'c-living'), product('2', 'c-living')]
      : [product('1', 'c-living'), product('3', 'c-decor'), product('4', 'c-decor'), product('5', 'c-decor')];
    return { status: 200, data: { items, page: 0, size: 5, totalElements: items.length } };
  });
  const self = (await api.listProducts({})).items[0];
  const related = await api.listRelated(self);
  expect(related.map(p => p.id)).toEqual(['2', '3', '4', '5']);
});
