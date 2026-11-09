import type { Money } from '@/lib/money';
import type { Order } from '@/features/commerce/types';

export type OrderStatus = Order['orderStatus'];

export interface AuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  reason: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AdminOrder {
  order: Order;
  history: AuditEntry[];
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: Money;
  currency: 'USD';
  stockQuantity: number;
  active: boolean;
  imageUrl: string;
}

export interface ProductChanges {
  name?: string;
  description?: string;
  price?: Money;
  active?: boolean;
}
