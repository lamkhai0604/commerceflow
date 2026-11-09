import type { Order } from '@/features/commerce/types';

export const MUG_ID = 'aa6357c0-e6bc-5e13-86d9-d5326ecaf437';

export const mugLine = { productId: MUG_ID, slug: 'stoneware-mug', name: 'Stoneware Mug', unitPrice: '18.00', image: '/images/products/stoneware-mug', quantity: 2 };

export const member = { id: '0f8fad5b-d9cb-469f-a165-70867728950e', email: 'jane@example.com', fullName: 'Jane Doe', roles: ['CUSTOMER' as const] };

export function order(overrides: Partial<Order> = {}): Order {
  return {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', orderNumber: 'CF-7K2M9QXA', orderStatus: 'CONFIRMED', paymentStatus: 'PAID',
    deliveryMethod: 'EXPRESS', contactEmail: 'jane@example.com', subtotalAmount: '36.00', shippingAmount: '19.00', totalAmount: '55.00',
    currency: 'USD', createdAt: '2026-11-09T10:15:00Z', guest: true,
    items: [{ productId: MUG_ID, productName: 'Stoneware Mug', productSlug: 'stoneware-mug', imageUrl: '/images/products/stoneware-mug',
      unitPrice: '18.00', quantity: 2, lineTotal: '36.00' }],
    shippingAddress: { recipientName: 'Jane Doe', addressLine1: '1 Main St', addressLine2: null, city: 'Seattle', state: 'WA', postalCode: '98101', countryCode: 'US' },
    ...overrides,
  };
}
