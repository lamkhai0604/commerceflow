import { createApiClient } from '@/lib/apiClient';
import type { CheckoutDetails, Line, MergeResult, Order, ServerCart } from './types';

type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Client for carts, checkout and orders (OpenAPI v1.3). Like the authentication client, cookies stay
 * browser-managed and the CSRF token is kept in memory only.
 */
export function createCommerceApi(client: ApiClient = createApiClient()) {
  const { get, write } = client;

  const checkout = (url: string, key: string, body: unknown) =>
    write<Order>({ method: 'POST', url, data: body, headers: { 'Idempotency-Key': key } }, 201).then(result => result.data);

  return {
    clearCsrf: client.clearCsrf,
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
