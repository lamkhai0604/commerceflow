import { createApiClient } from '@/lib/apiClient';
import type { Order } from '@/features/commerce/types';
import type { AdminOrder, AdminProduct, OrderStatus, ProductChanges } from './types';

type ApiClient = ReturnType<typeof createApiClient>;

/** Client for administration (OpenAPI v1.4). Every call needs an ADMIN session; the API enforces it. */
export function createAdminApi(client: ApiClient = createApiClient()) {
  const { get, write } = client;
  return {
    clearCsrf: client.clearCsrf,
    orders: (filter: { status?: OrderStatus; q?: string } = {}) =>
      get<Order[]>('/admin/orders', { status: filter.status || undefined, q: filter.q || undefined }),
    order: (id: string) => get<AdminOrder>(`/admin/orders/${encodeURIComponent(id)}`),
    changeStatus: (id: string, status: OrderStatus, reason?: string) =>
      write<AdminOrder>({ method: 'PATCH', url: `/admin/orders/${encodeURIComponent(id)}/status`, data: { status, reason: reason || undefined } }).then(r => r.data),
    products: () => get<AdminProduct[]>('/admin/products', { limit: 200 }),
    updateProduct: (id: string, changes: ProductChanges) =>
      write<AdminProduct>({ method: 'PATCH', url: `/admin/products/${encodeURIComponent(id)}`, data: changes }).then(r => r.data),
    /** `expected` makes the edit apply only if sales have not changed the stock since it was read. */
    setStock: (id: string, stockQuantity: number, expected?: number) =>
      write<AdminProduct>({ method: 'PATCH', url: `/admin/products/${encodeURIComponent(id)}/inventory`,
        data: { stockQuantity, expectedStockQuantity: expected } }).then(r => r.data),
  };
}

const adminApi = createAdminApi();
export default adminApi;
