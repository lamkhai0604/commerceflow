import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import adminApi from '@/features/admin/adminApi';
import type { AdminOrder, AdminProduct } from '@/features/admin/types';
import { member, order } from '@/test/orderFixtures';
import { renderApp } from '@/test/renderApp';

vi.mock('@/features/catalog/catalogApi', () => import('@/test/fakeCatalogApi'));
vi.mock('@/features/admin/adminApi', () => ({
  default: { clearCsrf: vi.fn(), orders: vi.fn(), order: vi.fn(), changeStatus: vi.fn(), products: vi.fn(), updateProduct: vi.fn(), setStock: vi.fn() },
}));
vi.mock('@/features/commerce/commerceApi', () => ({ default: { clearCsrf: vi.fn(), cart: vi.fn(), orders: vi.fn(), order: vi.fn() } }));

const api = vi.mocked(adminApi);
beforeEach(() => vi.resetAllMocks());

const admin = { isLoggedIn: true, currentUser: { ...member, email: 'boss@example.com', fullName: 'Boss', roles: ['CUSTOMER' as const, 'ADMIN' as const] } };
const customer = { isLoggedIn: true, currentUser: member };

const adminOrder = (overrides: Partial<AdminOrder['order']> = {}, history: AdminOrder['history'] = []): AdminOrder => ({ order: order({ guest: false, ...overrides }), history });
const product = (overrides: Partial<AdminProduct> = {}): AdminProduct => ({
  id: 'p1', name: 'Stoneware Mug', slug: 'stoneware-mug', description: 'A mug.', categoryId: 'c1', categoryName: 'Kitchen & Dining',
  price: '18.00', currency: 'USD', stockQuantity: 25, active: true, imageUrl: '/images/products/stoneware-mug', ...overrides,
});

test('administration is closed to signed-out visitors and to customers, and the API is never called', async () => {
  const view = renderApp('/admin/orders');
  expect(await screen.findByRole('heading', { level: 1, name: 'Log in to open administration' })).toBeInTheDocument();
  view.unmount();
  renderApp('/admin/orders', {}, customer);
  expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to administration' })).toBeInTheDocument();
  expect(api.orders).not.toHaveBeenCalled();
});

test('the account menu offers Administration only to administrators', () => {
  const view = renderApp('/', {}, customer);
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
  expect(screen.queryByRole('menuitem', { name: 'Administration' })).not.toBeInTheDocument();
  view.unmount();
  renderApp('/', {}, admin);
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
  expect(screen.getByRole('menuitem', { name: 'Administration' })).toBeInTheDocument();
});

test('orders: lists newest first, filters by status and searches by number or email', async () => {
  api.orders.mockResolvedValue([order({ guest: false }), order({ id: 'o2', orderNumber: 'CF-AAAA2222', orderStatus: 'SHIPPED', guest: true })]);
  renderApp('/admin', {}, admin);
  const link = await screen.findByRole('link', { name: /CF-7K2M9QXA/ });
  expect(link).toHaveAttribute('href', '/admin/orders/7c9e6679-7425-40de-944b-e07fc1f90ae7');
  expect(screen.getByRole('link', { name: /CF-AAAA2222/ })).toHaveTextContent('Guest');
  expect(screen.getByRole('status')).toHaveTextContent('2 orders, newest first');
  expect(api.orders).toHaveBeenLastCalledWith({ status: undefined, q: undefined });

  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'SHIPPED' } });
  await waitFor(() => expect(api.orders).toHaveBeenLastCalledWith({ status: 'SHIPPED', q: undefined }));
  fireEvent.change(screen.getByLabelText('Order number or email'), { target: { value: ' jane ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(api.orders).toHaveBeenLastCalledWith({ status: 'SHIPPED', q: 'jane' }));
});

test('order: a confirmed order can be shipped, then delivered, and the history shows who did it', async () => {
  api.order.mockResolvedValue(adminOrder());
  api.changeStatus.mockResolvedValueOnce(adminOrder({ orderStatus: 'SHIPPED' }, [
    { id: 'h1', actorEmail: 'boss@example.com', action: 'ORDER_SHIPPED', reason: 'Packed', details: {}, createdAt: '2026-11-09T11:00:00Z' }]));
  renderApp('/admin/orders/7c9e6679-7425-40de-944b-e07fc1f90ae7', {}, admin);
  expect(await screen.findByRole('heading', { name: 'Order CF-7K2M9QXA' })).toBeInTheDocument();
  expect(screen.getByText('No administrative changes yet.', { exact: false })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }));
  expect(await screen.findByRole('button', { name: 'Mark as delivered' })).toBeInTheDocument();
  expect(api.changeStatus).toHaveBeenCalledWith('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'SHIPPED', undefined);
  expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
  expect(screen.getByText('Marked as shipped')).toBeInTheDocument();
  expect(screen.getByText('Reason: Packed')).toBeInTheDocument();

  api.changeStatus.mockResolvedValueOnce(adminOrder({ orderStatus: 'DELIVERED' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mark as delivered' }));
  expect(await screen.findByText(/This order is complete/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark as delivered' })).not.toBeInTheDocument();
});

test('order: cancelling asks for confirmation, explains the effect and sends the reason', async () => {
  api.order.mockResolvedValue(adminOrder());
  api.changeStatus.mockResolvedValueOnce(adminOrder({ orderStatus: 'CANCELLED', paymentStatus: 'REFUNDED' }));
  renderApp('/admin/orders/7c9e6679-7425-40de-944b-e07fc1f90ae7', {}, admin);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
  const dialog = screen.getByRole('dialog', { name: 'Cancel order CF-7K2M9QXA?' });
  expect(within(dialog).getByText(/go back into stock/)).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('Reason (optional)'), { target: { value: ' Customer asked ' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));
  expect(await screen.findByText(/This order is cancelled/)).toBeInTheDocument();
  expect(api.changeStatus).toHaveBeenCalledWith('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'CANCELLED', 'Customer asked');
  expect(screen.getByText('Refunded')).toBeInTheDocument();
});

test('order: if someone else already changed it, the page says so and shows the current state', async () => {
  api.order.mockResolvedValueOnce(adminOrder());
  renderApp('/admin/orders/7c9e6679-7425-40de-944b-e07fc1f90ae7', {}, admin);
  const cancel = await screen.findByRole('button', { name: 'Cancel order' });
  api.changeStatus.mockRejectedValueOnce({ status: 409, code: 'INVALID_STATE_TRANSITION' });
  api.order.mockResolvedValueOnce(adminOrder({ orderStatus: 'CANCELLED', paymentStatus: 'REFUNDED' }));
  fireEvent.click(cancel);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel order' }));
  expect(await screen.findByText(/changed by someone else/)).toBeInTheDocument();
  expect(await screen.findByText(/This order is cancelled/)).toBeInTheDocument();
});

test('products: saving stock sends the value that was loaded as the expected value', async () => {
  api.products.mockResolvedValue([product(), product({ id: 'p2', name: 'Oak Nightstand', stockQuantity: 3 })]);
  api.setStock.mockResolvedValueOnce(product({ stockQuantity: 40 }));
  renderApp('/admin/products', {}, admin);
  expect(await screen.findByText('Oak Nightstand')).toBeInTheDocument();
  expect(screen.getByText('Low stock')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Save stock' })).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: 'Save stock' }).every(button => (button as HTMLButtonElement).disabled)).toBe(true);
  fireEvent.change(screen.getByLabelText('In stock', { selector: '#stock-p1' }), { target: { value: '40' } });
  fireEvent.click(within(screen.getByRole('form', { name: 'Stock for Stoneware Mug' })).getByRole('button', { name: 'Save stock' }));
  await waitFor(() => expect(api.setStock).toHaveBeenCalledWith('p1', 40, 25));
  expect(await screen.findByText('Stock saved')).toBeInTheDocument();
});

test('products: a stale stock edit is refused and the current stock is shown instead', async () => {
  api.products.mockResolvedValueOnce([product()]);
  renderApp('/admin/products', {}, admin);
  await screen.findByText('Stoneware Mug');
  api.setStock.mockRejectedValueOnce({ status: 409, code: 'STOCK_CHANGED' });
  api.products.mockResolvedValueOnce([product({ stockQuantity: 22 })]);
  fireEvent.change(screen.getByLabelText('In stock'), { target: { value: '40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save stock' }));
  expect(await screen.findByText(/Stock changed since this page loaded/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText('In stock')).toHaveValue('22'));
});

test('products: stock must be a whole number and nothing is sent otherwise', async () => {
  api.products.mockResolvedValue([product()]);
  renderApp('/admin/products', {}, admin);
  await screen.findByText('Stoneware Mug');
  fireEvent.change(screen.getByLabelText('In stock'), { target: { value: '-3' } });
  expect(screen.getByText('Enter a whole number from 0 to 100000.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save stock' })).toBeDisabled();
  expect(api.setStock).not.toHaveBeenCalled();
});

test('products: hiding a product and editing its price send only what changed', async () => {
  api.products.mockResolvedValue([product()]);
  api.updateProduct.mockResolvedValueOnce(product({ active: false })).mockResolvedValueOnce(product({ active: false, price: '20.50' }));
  renderApp('/admin/products', {}, admin);
  await screen.findByText('Stoneware Mug');
  fireEvent.click(screen.getByRole('button', { name: 'Hide Stoneware Mug' }));
  expect(await screen.findByText('Hidden')).toBeInTheDocument();
  expect(api.updateProduct).toHaveBeenLastCalledWith('p1', { active: false });

  fireEvent.click(screen.getByRole('button', { name: 'Edit details of Stoneware Mug' }));
  const dialog = screen.getByRole('dialog', { name: 'Edit Stoneware Mug' });
  fireEvent.change(within(dialog).getByLabelText(/^Price/), { target: { value: '0' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save product' }));
  expect(within(dialog).getByText(/Enter a price from 0.01/)).toBeInTheDocument();
  expect(api.updateProduct).toHaveBeenCalledTimes(1);
  fireEvent.change(within(dialog).getByLabelText(/^Price/), { target: { value: '20.5' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save product' }));
  await waitFor(() => expect(api.updateProduct).toHaveBeenLastCalledWith('p1', { price: '20.50' }));
  expect(await screen.findByText('$20.50', { exact: false })).toBeInTheDocument();
});

test('storefront: low stock is shown on the card and product page, and the quantity stops at what is left', async () => {
  renderApp('/products/oak-nightstand');
  expect(await screen.findByText(/Only 3 left/)).toBeInTheDocument();
  const plus = screen.getByRole('button', { name: 'Increase quantity' });
  fireEvent.click(plus); fireEvent.click(plus); fireEvent.click(plus);
  expect(screen.getByRole('button', { name: /Add to cart · \$630.00/ })).toBeInTheDocument();
  expect(plus).toBeDisabled();
});
