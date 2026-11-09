import type { Money } from '@/lib/money';

/** Shapes of OpenAPI v1.3 (cart, checkout and orders). */
export interface ServerCartItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
  available: boolean;
}

export interface ServerCart {
  items: ServerCartItem[];
  currency: 'USD';
  estimatedTotal: Money;
}

export interface MergeResult {
  cart: ServerCart;
  skippedProductIds: string[];
}

export type DeliveryMethod = 'STANDARD' | 'EXPRESS';
export type PaymentScenario = 'APPROVE' | 'DECLINE' | 'UNAVAILABLE';

export interface ShippingAddress {
  recipientName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryCode?: 'US';
}

export interface OrderItem {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderStatus: 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PAID' | 'REFUNDED';
  deliveryMethod: DeliveryMethod;
  contactEmail: string;
  subtotalAmount: Money;
  shippingAmount: Money;
  totalAmount: Money;
  currency: 'USD';
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  createdAt: string;
  guest: boolean;
}

export interface CheckoutDetails {
  shippingAddress: ShippingAddress;
  deliveryMethod: DeliveryMethod;
  paymentScenario: PaymentScenario;
}

export interface Line {
  productId: string;
  quantity: number;
}

/** A failure the UI can safely show: no server detail, only the status, the documented code and Retry-After. */
export interface CommerceFailure {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
}

export const isCommerceFailure = (value: unknown): value is CommerceFailure =>
  !!value && typeof value === 'object' && ('status' in value || 'code' in value) && !(value instanceof Error);
