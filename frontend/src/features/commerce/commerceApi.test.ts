import axios, { type InternalAxiosRequestConfig } from 'axios';
import { createCommerceApi, newIdempotencyKey } from './commerceApi';

const cart = { items: [], currency: 'USD', estimatedTotal: '0.00' };
function setup() {
  let token = 0;
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
    config, statusText: 'OK', headers: {} as Record<string, string>,
    status: config.url === '/orders' && config.method === 'post' ? 201 : 200,
    data: config.url === '/auth/csrf' ? { headerName: 'X-CSRF-TOKEN', token: `token-${++token}` } : cart,
  }));
  return { api: createCommerceApi(axios.create({ adapter })), adapter };
}
const rejected = (status: number, data: unknown, headers: Record<string, string> = {}) => ({ isAxiosError: true, response: { status, data, headers } });
const details = {
  shippingAddress: { recipientName: 'Jane', addressLine1: '1 Main St', city: 'Seattle', state: 'WA', postalCode: '98101' },
  deliveryMethod: 'STANDARD' as const, paymentScenario: 'APPROVE' as const,
};

test('writes send cookies, the in-memory CSRF token and the Idempotency-Key; reads need no token', async () => {
  const { api, adapter } = setup();
  await api.cart();
  await api.addItem({ productId: 'p1', quantity: 2 });
  await api.checkoutMember('key-12345678', details);
  const calls = adapter.mock.calls.map(([c]) => c);
  expect(calls.map(c => `${c.method} ${c.url}`)).toEqual(['get /cart', 'get /auth/csrf', 'post /cart/items', 'post /orders']);
  expect(calls.every(c => c.withCredentials)).toBe(true);
  expect(calls[2].headers?.['X-CSRF-TOKEN']).toBe('token-1');
  expect(calls[3].headers?.['X-CSRF-TOKEN']).toBe('token-1');
  expect(calls[3].headers?.['Idempotency-Key']).toBe('key-12345678');
  expect(JSON.parse(calls[2].data)).toEqual({ productId: 'p1', quantity: 2 });
});

test('a CSRF rejection is sent once more with a fresh token, never twice', async () => {
  const { api, adapter } = setup();
  await api.addItem({ productId: 'p1', quantity: 1 });
  adapter.mockRejectedValueOnce(rejected(403, { code: 'CSRF_INVALID' }));
  await api.addItem({ productId: 'p1', quantity: 1 });
  const posts = adapter.mock.calls.map(([c]) => c).filter(c => c.method === 'post');
  expect(posts.map(c => c.headers?.['X-CSRF-TOKEN'])).toEqual(['token-1', 'token-1', 'token-2']);

  adapter.mockRejectedValueOnce(rejected(403, { code: 'CSRF_INVALID' }));
  adapter.mockImplementationOnce(async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: { headerName: 'X-CSRF-TOKEN', token: 'token-x' } }));
  adapter.mockRejectedValueOnce(rejected(403, { code: 'CSRF_INVALID' }));
  await expect(api.addItem({ productId: 'p1', quantity: 1 })).rejects.toEqual({ status: 403, code: 'CSRF_INVALID', retryAfterSeconds: undefined });
});

test('failures expose only status, documented code and Retry-After', async () => {
  const { api, adapter } = setup();
  adapter.mockResolvedValueOnce({ config: {} as InternalAxiosRequestConfig, status: 200, statusText: 'OK', headers: {}, data: { headerName: 'X-CSRF-TOKEN', token: 't' } });
  adapter.mockRejectedValueOnce(rejected(503, { code: 'PAYMENT_TEMPORARILY_UNAVAILABLE', detail: 'internal detail' }, { 'retry-after': '5' }));
  const failure = await api.checkoutGuest('key-12345678', { ...details, email: 'a@b.co', items: [] }).catch(e => e);
  expect(failure).toEqual({ status: 503, code: 'PAYMENT_TEMPORARILY_UNAVAILABLE', retryAfterSeconds: 5 });
  // A network failure has no status: the caller must treat the outcome as unknown.
  adapter.mockRejectedValueOnce({ isAxiosError: true, code: 'ECONNABORTED' });
  await expect(api.checkoutGuest('key-12345678', { ...details, email: 'a@b.co', items: [] })).rejects.toEqual({ status: undefined, code: undefined, retryAfterSeconds: undefined });
});

test('idempotency keys are random and match the documented pattern', () => {
  const keys = new Set(Array.from({ length: 50 }, newIdempotencyKey));
  expect(keys.size).toBe(50);
  for (const key of keys) expect(key).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
});
