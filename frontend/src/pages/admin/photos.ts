import { PLACEHOLDER_IMAGE, type AdminProduct } from '@/features/admin/types';

/** One choice per photo already in the store, named after the first product that uses it. Uploading is not available (S6-D01). */
export function photoOptions(products: AdminProduct[]): Array<[path: string, productName: string]> {
  return [...new Map(products.map(p => [p.imageUrl, p.name] as [string, string])).entries()].filter(([path]) => path !== PLACEHOLDER_IMAGE);
}
