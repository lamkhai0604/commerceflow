import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import commerceApi from '@/features/commerce/commerceApi';
import { member, mugLine, order } from '@/test/orderFixtures';
import { renderApp } from '@/test/renderApp';
import { describeCheckoutFailure } from './CheckoutPage';

vi.mock('@/features/catalog/catalogApi', () => import('@/test/fakeCatalogApi'));
vi.mock('@/features/commerce/commerceApi', () => {
  let n = 0;
  return {
    default: {
      clearCsrf: vi.fn(), cart: vi.fn(), addItem: vi.fn(), setQuantity: vi.fn(), removeItem: vi.fn(), merge: vi.fn(),
      checkoutMember: vi.fn(), checkoutGuest: vi.fn(), orders: vi.fn(), order: vi.fn(), lookup: vi.fn(),
    },
    newIdempotencyKey: () => `test-key-${++n}`,
  };
});

const api = vi.mocked(commerceApi);
beforeEach(() => vi.resetAllMocks());

const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
function fillAddress() {
  fill(/^Full name/, 'Jane Doe'); fill(/^Street address/, '1 Main St'); fill(/^City/, 'Seattle'); fill(/^State/, 'WA'); fill(/^ZIP code/, '98101');
}

test('guest: the cart asks how to check out; a declined payment can be retried and the confirmation shows the real order', async () => {
  const { store } = renderApp('/cart', { lines: [mugLine] });
  fireEvent.click(screen.getByRole('link', { name: 'Check out' }));
  const choice = screen.getByRole('dialog', { name: 'How would you like to check out?' });
  expect(within(choice).getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  fireEvent.click(within(choice).getByRole('button', { name: 'Continue as guest' }));

  expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Place order · $45.00' }));
  expect(screen.getByText('Email address is required.')).toBeInTheDocument();
  expect(screen.getByLabelText(/^Email address/)).toHaveAttribute('aria-invalid', 'true');
  expect(api.checkoutGuest).not.toHaveBeenCalled();

  fill(/^Email address/, ' Jane@Example.com '); fillAddress();
  fireEvent.click(screen.getByRole('radio', { name: /Express/ }));
  fireEvent.click(screen.getByRole('radio', { name: /Payment declined/ }));
  api.checkoutGuest.mockRejectedValueOnce({ status: 402, code: 'PAYMENT_DECLINED' });
  fireEvent.click(screen.getByRole('button', { name: 'Place order · $55.00' }));
  expect(await screen.findByText(/The demo payment was declined/)).toBeInTheDocument();
  expect(store.getState().cart.lines).toHaveLength(1);

  fireEvent.click(screen.getByRole('radio', { name: /Payment approved/ }));
  api.checkoutGuest.mockResolvedValueOnce(order());
  fireEvent.click(screen.getByRole('button', { name: 'Place order · $55.00' }));
  expect(await screen.findByRole('heading', { name: 'Thank you, Jane Doe.' })).toBeInTheDocument();
  expect(screen.getByText(/Your order/)).toHaveTextContent('Your order CF-7K2M9QXA is confirmed.');
  expect(store.getState().cart.lines).toEqual([]);

  const [firstKey, first] = api.checkoutGuest.mock.calls[0];
  const [secondKey, second] = api.checkoutGuest.mock.calls[1];
  // A declined payment is final for its key, so the next attempt uses a new one.
  expect(secondKey).not.toBe(firstKey);
  expect(first).toMatchObject({ email: 'jane@example.com', deliveryMethod: 'EXPRESS', paymentScenario: 'DECLINE',
    items: [{ productId: mugLine.productId, quantity: 2 }] });
  expect(second).toMatchObject({ paymentScenario: 'APPROVE', shippingAddress: { recipientName: 'Jane Doe', state: 'WA', postalCode: '98101' } });
});

test('guest: when the outcome is unknown, trying again reuses the same idempotency key', async () => {
  renderApp('/checkout?as=guest', { lines: [mugLine] });
  fill(/^Email address/, 'jane@example.com'); fillAddress();
  api.checkoutGuest.mockRejectedValueOnce({}).mockRejectedValueOnce({ status: 503, code: 'PAYMENT_TEMPORARILY_UNAVAILABLE', retryAfterSeconds: 5 })
    .mockResolvedValueOnce(order());
  fireEvent.click(screen.getByRole('button', { name: /Place order/ }));
  expect(await screen.findByText(/We could not confirm your order/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Place order/ }));
  expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Place order/ }));
  expect(await screen.findByRole('heading', { name: 'Thank you, Jane Doe.' })).toBeInTheDocument();
  const keys = api.checkoutGuest.mock.calls.map(call => call[0]);
  expect(new Set(keys).size).toBe(1);
});

test('signed-out visitors opening checkout directly choose guest or member; choosing to log in opens the log-in dialog', async () => {
  const { store } = renderApp('/checkout', { lines: [mugLine] });
  expect(screen.getByRole('heading', { name: 'How would you like to check out?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(store.getState().auth.dialog).toBe('login');
  expect(store.getState().cart.checkoutChoice).toBe('awaitingSignIn');
  expect(await screen.findByRole('dialog', { name: 'Log in to CommerceFlow' })).toBeInTheDocument();
});

test('member: checkout uses the account email and the server cart, and links to order history', async () => {
  const { store } = renderApp('/checkout', { lines: [{ ...mugLine, itemId: 'c1', available: true }], server: true },
    { isLoggedIn: true, currentUser: member });
  expect(screen.getByText('Member checkout as jane@example.com.', { exact: false })).toBeInTheDocument();
  expect(screen.queryByLabelText(/^Email address/)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/^Full name/)).toHaveValue('Jane Doe');
  fill(/^Street address/, '1 Main St'); fill(/^City/, 'Seattle'); fill(/^State/, 'WA'); fill(/^ZIP code/, '98101');
  api.checkoutMember.mockResolvedValueOnce(order({ guest: false, deliveryMethod: 'STANDARD', shippingAmount: '9.00', totalAmount: '45.00' }));
  fireEvent.click(screen.getByRole('button', { name: 'Place order · $45.00' }));
  expect(await screen.findByRole('link', { name: 'View order history' })).toHaveAttribute('href', '/account/orders');
  expect(api.checkoutMember).toHaveBeenCalledWith(expect.stringMatching(/^test-key-\d+$/), expect.objectContaining({ deliveryMethod: 'STANDARD' }));
  expect(api.checkoutGuest).not.toHaveBeenCalled();
  expect(store.getState().cart.lines).toEqual([]);
});

test('member: insufficient stock reloads the server cart and explains that no order was created', async () => {
  renderApp('/checkout', { lines: [{ ...mugLine, itemId: 'c1', available: true }], server: true }, { isLoggedIn: true, currentUser: member });
  fill(/^Street address/, '1 Main St'); fill(/^City/, 'Seattle'); fill(/^State/, 'WA'); fill(/^ZIP code/, '98101');
  api.checkoutMember.mockRejectedValueOnce({ status: 409, code: 'INSUFFICIENT_STOCK' });
  api.cart.mockResolvedValueOnce({ currency: 'USD', estimatedTotal: '36.00', items: [{ id: 'c1', productId: mugLine.productId, slug: mugLine.slug,
    name: mugLine.name, imageUrl: mugLine.image, unitPrice: '18.00', quantity: 2, lineTotal: '36.00', available: true }] });
  fireEvent.click(screen.getByRole('button', { name: /Place order/ }));
  expect(await screen.findByText(/no longer available in the quantity you chose/)).toBeInTheDocument();
  await waitFor(() => expect(api.cart).toHaveBeenCalled());
});

test('track an order: validates input, finds the order, and does not reveal which detail was wrong', async () => {
  renderApp('/track-order');
  fireEvent.click(screen.getByRole('button', { name: 'Find order' }));
  expect(screen.getByText(/Enter the order number as shown/)).toBeInTheDocument();
  fill(/^Order number/, 'cf-7k2m9qxa'); fill(/^Email address/, 'jane@example.com');
  api.lookup.mockRejectedValueOnce({ status: 404, code: 'RESOURCE_NOT_FOUND' });
  fireEvent.click(screen.getByRole('button', { name: 'Find order' }));
  expect(await screen.findByText(/could not find an order with that number and email address/)).toBeInTheDocument();
  expect(api.lookup).toHaveBeenLastCalledWith('CF-7K2M9QXA', 'jane@example.com');

  api.lookup.mockResolvedValueOnce(order());
  fireEvent.click(screen.getByRole('button', { name: 'Find order' }));
  expect(await screen.findByRole('heading', { name: 'Order CF-7K2M9QXA' })).toBeInTheDocument();
  expect(screen.getByText('Seattle, WA 98101', { exact: false })).toBeInTheDocument();
});

test('order history: members see their orders; signed-out visitors are asked to log in', async () => {
  api.orders.mockResolvedValueOnce([order({ guest: false })]);
  renderApp('/account/orders', {}, { isLoggedIn: true, currentUser: member });
  const link = await screen.findByRole('link', { name: /CF-7K2M9QXA/ });
  expect(link).toHaveAttribute('href', '/account/orders/7c9e6679-7425-40de-944b-e07fc1f90ae7');
  expect(link).toHaveTextContent('2 items');
  expect(link).toHaveTextContent('$55.00');
});

test('order history: signed-out visitors are offered log-in or guest tracking', () => {
  renderApp('/account/orders');
  expect(screen.getByRole('heading', { name: 'Log in to see your orders' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Track a guest order' })).toHaveAttribute('href', '/track-order');
  expect(api.orders).not.toHaveBeenCalled();
});

test('checkout failures keep the idempotency key only when the outcome is not final', () => {
  const keep = (status: number | undefined, code?: string) => describeCheckoutFailure({ status, code }).keepKey;
  expect(keep(402, 'PAYMENT_DECLINED')).toBe(false);
  expect(keep(409, 'INSUFFICIENT_STOCK')).toBe(false);
  expect(keep(409, 'IDEMPOTENCY_PAYLOAD_MISMATCH')).toBe(false);
  expect(keep(409, 'IDEMPOTENCY_IN_PROGRESS')).toBe(true);
  expect(keep(503, 'PAYMENT_TEMPORARILY_UNAVAILABLE')).toBe(true);
  expect(describeCheckoutFailure(new Error('network')).keepKey).toBe(true);
});
