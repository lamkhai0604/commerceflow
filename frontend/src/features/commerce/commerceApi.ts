import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { withWakeRetry } from '@/lib/serverWake';
import type { CheckoutDetails, CommerceFailure, Line, MergeResult, Order, ServerCart } from './types';

/**
 * Client for carts, checkout and orders (OpenAPI v1.3). Like the authentication client, cookies stay
 * browser-managed and the CSRF token is kept in memory only.
 */
export function createCommerceApi(http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 20000,
})) {
  let csrf: string | undefined;

  function failure(error: unknown): CommerceFailure {
    const response = axios.isAxiosError(error) ? error.response : undefined;
    const data = response?.data;
    const code = data && typeof data === 'object' && typeof data.code === 'string' ? data.code : undefined;
    const retry = Number(response?.headers?.['retry-after']);
    return { status: response?.status, code, retryAfterSeconds: Number.isFinite(retry) && retry > 0 ? retry : undefined };
  }

  async function token(): Promise<string> {
    if (csrf) return csrf;
    const response = await withWakeRetry(() => http.get<{ headerName: string; token: string }>('/auth/csrf', { withCredentials: true }));
    if (response.data?.headerName !== 'X-CSRF-TOKEN' || typeof response.data.token !== 'string' || !response.data.token)
      throw new Error('Could not prepare security verification.');
    csrf = response.data.token;
    return csrf;
  }

  async function get<T>(url: string): Promise<T> {
    try { return (await withWakeRetry(() => http.get<T>(url, { withCredentials: true }))).data; }
    catch (error) { throw failure(error); }
  }

  /**
   * Sends a write with the CSRF token. A CSRF rejection happens before the server does anything, so the request
   * is sent once more with a fresh token (the token changes when the customer logs in or out).
   */
  async function write<T>(config: AxiosRequestConfig, expectedStatus = 200): Promise<{ data: T; replayed: boolean }> {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await http.request<T>({
          ...config, withCredentials: true, headers: { ...config.headers, 'X-CSRF-TOKEN': await token() },
        });
        if (response.status !== expectedStatus) throw new Error('Unexpected response');
        return { data: response.data, replayed: response.headers?.['idempotent-replayed'] === 'true' };
      } catch (error) {
        const safe = failure(error);
        if (safe.status === 403 && safe.code === 'CSRF_INVALID') {
          csrf = undefined;
          if (attempt === 0) continue;
        }
        throw error instanceof Error && !axios.isAxiosError(error) ? error : safe;
      }
    }
  }

  const checkout = (url: string, key: string, body: unknown) =>
    write<Order>({ method: 'POST', url, data: body, headers: { 'Idempotency-Key': key } }, 201).then(result => result.data);

  return {
    clearCsrf: () => { csrf = undefined; },
    cart: () => get<ServerCart>('/cart'),
    addItem: (line: Line) => write<ServerCart>({ method: 'POST', url: '/cart/items', data: line }).then(r => r.data),
    setQuantity: (itemId: string, quantity: number) =>
      write<ServerCart>({ method: 'PATCH', url: `/cart/items/${encodeURIComponent(itemId)}`, data: { quantity } }).then(r => r.data),
    removeItem: (itemId: string) =>
      write<ServerCart>({ method: 'DELETE', url: `/cart/items/${encodeURIComponent(itemId)}` }).then(r => r.data),
    merge: (items: Line[]) => write<MergeResult>({ method: 'POST', url: '/cart/merge', data: { items } }).then(r => r.data),
    checkoutMember: (key: string, details: CheckoutDetails) => checkout('/orders', key, details),
    checkoutGuest: (key: string, details: CheckoutDetails & { email: string; items: Line[] }) => checkout('/checkout/guest', key, details),
    orders: () => get<Order[]>('/orders'),
    order: (id: string) => get<Order>(`/orders/${encodeURIComponent(id)}`),
    lookup: (orderNumber: string, email: string) =>
      write<Order>({ method: 'POST', url: '/orders/lookup', data: { orderNumber, email } }).then(r => r.data),
  };
}

export type CommerceApi = ReturnType<typeof createCommerceApi>;

const commerceApi = createCommerceApi();
export default commerceApi;

/** A random key for one checkout attempt: 32 URL-safe characters, within the documented 8–128. */
export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
