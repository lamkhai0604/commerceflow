import { toCents } from '@/lib/money';
import { getProduct, listCategories, listProducts, listRelated } from './catalogApi';
import { DEMO_PRODUCTS } from './demoData';

test('first page holds nine products and reports the full total', async () => {
  const page = await listProducts();
  expect(page).toMatchObject({ page: 0, size: 9, totalElements: DEMO_PRODUCTS.length });
  expect(page.items).toHaveLength(9);
});

test('an out-of-range page is clamped to the last page instead of returning nothing', async () => {
  const page = await listProducts({ page: 99 });
  expect(page.page).toBe(Math.ceil(DEMO_PRODUCTS.length / 9) - 1);
  expect(page.items.length).toBeGreaterThan(0);
});

test('category, price band and stock filters combine', async () => {
  const page = await listProducts({ category: 'living', price: 'over-500', inStock: true, size: 50 });
  expect(page.items.length).toBeGreaterThan(0);
  for (const item of page.items) {
    expect(item.categorySlug).toBe('living');
    expect(toCents(item.price)).toBeGreaterThan(50000);
    expect(item.available).toBe(true);
  }
});

test('search matches names, descriptions and room names case-insensitively', async () => {
  expect((await listProducts({ q: 'VASE', size: 50 })).items.map(p => p.slug))
    .toEqual(expect.arrayContaining(['stoneware-vase-cream', 'concrete-bottle-vases-set-of-3']));
  expect((await listProducts({ q: 'bath', size: 50 })).items.map(p => p.slug)).toContain('freestanding-soaking-tub');
  expect((await listProducts({ q: 'no such thing' })).totalElements).toBe(0);
});

test('sorting by price and name follows the API sort values', async () => {
  const ascending = (await listProducts({ sort: 'price,asc', size: 50 })).items.map(p => toCents(p.price));
  expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
  const descending = (await listProducts({ sort: 'price,desc', size: 50 })).items.map(p => toCents(p.price));
  expect(descending).toEqual([...descending].sort((a, b) => b - a));
  const names = (await listProducts({ sort: 'name,asc', size: 50 })).items.map(p => p.name);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
});

test('category counts add up to the catalog size and every product has both image sizes declared', async () => {
  const categories = await listCategories();
  expect(categories.reduce((sum, c) => sum + c.productCount, 0)).toBe(DEMO_PRODUCTS.length);
  for (const product of DEMO_PRODUCTS) expect(product.image).toMatch(/^\/images\/products\/[a-z0-9-]+$/);
});

test('product lookup by slug and related products exclude the product itself and unavailable items', async () => {
  const vase = await getProduct('stoneware-vase-cream');
  expect(vase?.name).toBe('Stoneware Vase, Cream');
  expect(await getProduct('missing')).toBeUndefined();
  const related = await listRelated(vase!);
  expect(related).toHaveLength(4);
  expect(related.every(p => p.id !== vase!.id && p.available)).toBe(true);
  expect(related[0].categoryId).toBe(vase!.categoryId);
});
