import { fireEvent, screen, within } from '@testing-library/react';
import { renderApp } from '@/test/renderApp';

// Pages read the catalog through this module; the in-memory fake holds the same data as the seed migration.
vi.mock('@/features/catalog/catalogApi', () => import('@/test/fakeCatalogApi'));

const mugLine = { productId: 'aa6357c0-e6bc-5e13-86d9-d5326ecaf437', slug: 'stoneware-mug', name: 'Stoneware Mug', unitPrice: '18.00', image: '/images/products/stoneware-mug', quantity: 2 };

test('home page: adding a featured product confirms what was added and updates the cart count', async () => {
  const { store } = renderApp('/');
  expect(await screen.findByRole('heading', { name: 'Everyday objects, made to last.' })).toBeInTheDocument();
  expect(screen.getByText(/No real orders or payments are taken/)).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Add Velvet Sofa, Forest to cart' }));
  const toast = screen.getByText('Added to your cart').closest('[role="status"]') as HTMLElement;
  expect(within(toast).getByText('Velvet Sofa, Forest · Qty 1')).toBeInTheDocument();
  expect(within(toast).getByRole('link', { name: 'View cart' })).toHaveAttribute('href', '/cart');
  expect(screen.getByRole('button', { name: 'Cart, 1 item' })).toBeInTheDocument();
  expect(store.getState().cart.lines).toHaveLength(1);
});

test('listing: results are summarised, and an empty search explains itself and offers a way back', async () => {
  renderApp('/products');
  expect(await screen.findByText('Showing 1–9 of 21 products')).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
});

test('listing: no matches shows an empty state whose action clears the search', async () => {
  renderApp('/products?q=zzz');
  expect(await screen.findByRole('heading', { name: 'No products match' })).toBeInTheDocument();
  expect(screen.getByText('Try a different search term or fewer filters.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show all products' }));
  expect(await screen.findByText('Showing 1–9 of 21 products')).toBeInTheDocument();
});

test('listing: choosing a room filters products and can be cleared', async () => {
  renderApp('/products');
  const filters = await screen.findByRole('complementary', { name: 'Filters' });
  fireEvent.click(await within(filters).findByRole('radio', { name: /Bath/ }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Bath' })).toBeInTheDocument();
  expect(await screen.findByText('1 product')).toBeInTheDocument();
  fireEvent.click(within(filters).getByRole('button', { name: 'Clear all filters' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Shop all' })).toBeInTheDocument();
});

test('product page: quantity updates the price on the button and adds that quantity', async () => {
  const { store } = renderApp('/products/stoneware-vase-cream');
  expect(await screen.findByRole('heading', { level: 1, name: 'Stoneware Vase, Cream' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add to cart · $136.00' }));
  expect(store.getState().cart.lines[0]).toMatchObject({ slug: 'stoneware-vase-cream', quantity: 2 });
  expect(screen.getByText('Stoneware Vase, Cream · Qty 2')).toBeInTheDocument();
});

test('product page: sold-out products cannot be added and unknown products explain what happened', async () => {
  renderApp('/products/compact-sofa-rust');
  expect(await screen.findByRole('button', { name: 'Sold out' })).toBeDisabled();
  expect(screen.getByText(/This product is out of stock/)).toBeInTheDocument();
});

test('product page: an unknown slug shows a not-found message with a next step', async () => {
  renderApp('/products/does-not-exist');
  expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Browse all products' })).toHaveAttribute('href', '/products');
});

test('cart page: removing a line can be undone, and totals reflect quantities', async () => {
  const { store } = renderApp('/cart', { lines: [mugLine] });
  expect(screen.getByText('Add $39.00 more for free shipping.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Stoneware Mug' }));
  expect(screen.getByText('Stoneware Mug removed from your cart.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(store.getState().cart.lines).toEqual([mugLine]);
});

test('listing: room counts are shown for the whole catalog', async () => {
  renderApp('/products');
  const [living] = await screen.findAllByRole('radio', { name: /^Living/ });
  expect(living.closest('label')?.textContent).toMatch(/^Living\d+$/);
});

test('listing: room counts are hidden while a search narrows the list', async () => {
  renderApp('/products?q=lamp');
  const [living] = await screen.findAllByRole('radio', { name: /^Living/ });
  expect(living.closest('label')?.textContent).toBe('Living');
});

test('cart page: an empty cart says so and links to the catalog', () => {
  renderApp('/cart');
  expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Start shopping' })).toHaveAttribute('href', '/products');
});

test('unknown routes show a helpful not-found page', () => {
  renderApp('/nowhere');
  expect(screen.getByRole('heading', { name: 'We could not find that page' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/products');
});
