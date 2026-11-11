import { cn } from '@/lib/cn';

interface ProductImageProps {
  /** Base path; `-480.webp` and `-960.webp` variants exist. */
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  /** The largest image on the page loads eagerly; everything else is lazy. */
  priority?: boolean;
}

export function ProductImage({ src, alt, sizes, className, priority = false }: ProductImageProps) {
  return (
    <img src={`${src}-480.webp`} srcSet={`${src}-480.webp 480w, ${src}-960.webp 960w`} sizes={sizes} alt={alt}
      width={480} height={600} loading={priority ? 'eager' : 'lazy'} decoding="async"
      // React 18 only knows the lowercase attribute name; the camel-case prop is reported as unknown.
      {...(priority ? { fetchpriority: 'high' } : {})}
      className={cn('aspect-[4/5] w-full rounded-(--radius-card) bg-linen object-cover', className)} />
  );
}
