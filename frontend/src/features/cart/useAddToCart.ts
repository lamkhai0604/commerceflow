import { useCallback } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { useToast } from '@/components/ui/Toast';
import type { StorefrontProduct } from '@/features/catalog/types';
import { cartActions } from './cartSlice';

/** Adds a product and confirms it in the customer's terms (what was added, and how many). */
export function useAddToCart() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  return useCallback((product: StorefrontProduct, quantity = 1) => {
    dispatch(cartActions.added({
      line: { productId: product.id, slug: product.slug, name: product.name, unitPrice: product.price, image: product.image },
      quantity,
    }));
    toast({
      title: 'Added to your cart',
      description: `${product.name} · Qty ${quantity}`,
      image: `${product.image}-480.webp`,
      action: { label: 'View cart', to: '/cart' },
    });
  }, [dispatch, toast]);
}
