import { Link } from 'react-router-dom';
import { LockIcon, ReturnIcon, TruckIcon } from '@/components/icons';
import { buttonClasses, ButtonLink } from '@/components/ui/Button';
import { LoadError, Skeleton } from '@/components/ui/Feedback';
import { listCategories, listFeatured } from '@/features/catalog/catalogApi';
import { ProductCard, ProductCardSkeleton } from '@/features/catalog/components/ProductCard';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useAsync } from '@/lib/useAsync';

const container = 'mx-auto max-w-7xl px-5 sm:px-6 xl:px-8';

export default function HomePage() {
  useDocumentTitle();
  const categories = useAsync(listCategories, 'categories');
  const featured = useAsync(listFeatured, 'featured');

  return (
    <>
      <section className={`${container} grid items-center gap-10 pt-8 pb-10 lg:grid-cols-2 lg:gap-12 lg:pt-14`}>
        <div>
          <p className="text-[13px] font-semibold tracking-[0.08em] text-pine-700 uppercase">New this season</p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-bold tracking-[-0.035em] text-balance sm:text-5xl xl:text-6xl">
            Everyday objects, made to last.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-stone-700 sm:text-lg">
            Considered furniture and homeware for the kitchen, living room and quiet corners of your home.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/products" size="lg">Shop all products</ButtonLink>
            <a href="#rooms" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>Shop by room</a>
          </div>
        </div>
        <img src="/images/site/hero.webp" alt="A bright living room with a black sofa, a white dresser and green plants"
          width={1400} height={1200} fetchPriority="high"
          className="aspect-[7/6] w-full rounded-[28px] bg-linen object-cover" />
      </section>

      <section aria-label="Store benefits" className={container}>
        <ul className="grid gap-4 border-y border-stone-200 py-6 text-[15px] sm:grid-cols-3">
          <li className="flex items-center gap-3"><TruckIcon className="shrink-0 text-pine-700" /><span><strong className="font-semibold">Free shipping</strong> on orders over $75</span></li>
          <li className="flex items-center gap-3"><ReturnIcon className="shrink-0 text-pine-700" /><span><strong className="font-semibold">30-day returns</strong> on unused items (demo policy)</span></li>
          <li className="flex items-center gap-3"><LockIcon className="shrink-0 text-pine-700" /><span><strong className="font-semibold">Demo checkout</strong>, no card needed</span></li>
        </ul>
      </section>

      <section id="rooms" aria-labelledby="rooms-title" className={`${container} scroll-mt-24 pt-16 lg:pt-20`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="rooms-title" className="text-2xl font-bold tracking-tight sm:text-3xl">Shop by room</h2>
          <Link to="/products" className="text-[15px] font-semibold text-pine-700 hover:underline">View all products</Link>
        </div>
        {categories.status === 'error'
          ? <LoadError className="mt-6" onRetry={categories.retry}>We could not load the rooms.</LoadError>
          : (
            <ul className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" aria-busy={categories.status === 'loading'}>
              {categories.status === 'success'
                ? categories.data.map(category => (
                  <li key={category.id}>
                    <Link to={`/products?category=${category.slug}`} className="group block">
                      <img src={category.image} alt="" width={600} height={690} loading="lazy"
                        className="aspect-[6/7] w-full rounded-(--radius-card) bg-linen object-cover transition-opacity group-hover:opacity-90" />
                      <span className="mt-3 block text-[15px] font-semibold text-stone-900 group-hover:underline">{category.name}</span>
                      <span className="block text-sm text-stone-600">{category.productCount} {category.productCount === 1 ? 'product' : 'products'}</span>
                    </Link>
                  </li>
                ))
                : Array.from({ length: 6 }, (_, i) => <li key={i}><Skeleton className="aspect-[6/7] w-full rounded-(--radius-card)" /></li>)}
            </ul>
          )}
      </section>

      <section aria-labelledby="featured-title" className={`${container} pt-16 lg:pt-20`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="featured-title" className="text-2xl font-bold tracking-tight sm:text-3xl">Featured</h2>
            <p className="mt-2 text-base text-stone-600">A few pieces to start with.</p>
          </div>
          <Link to="/products" className="text-[15px] font-semibold text-pine-700 hover:underline">Shop all</Link>
        </div>
        {featured.status === 'error'
          ? <LoadError className="mt-6" onRetry={featured.retry}>We could not load the featured products.</LoadError>
          : (
            <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6" aria-busy={featured.status === 'loading'}>
              {featured.status === 'success'
                ? featured.data.map(product => <ProductCard key={product.id} product={product} />)
                : Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}
      </section>

      <section className={`${container} pt-16 lg:pt-20`}>
        <div className="grid overflow-hidden rounded-[28px] bg-linen md:grid-cols-2">
          <img src="/images/site/dining-edit.webp" alt="A dining table with grey chairs under a brass chandelier"
            width={1200} height={900} loading="lazy" className="h-full min-h-64 w-full object-cover" />
          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
            <p className="text-[13px] font-semibold tracking-[0.08em] text-pine-700 uppercase">Kitchen &amp; Dining</p>
            <h2 className="mt-3 text-3xl leading-tight font-bold tracking-tight">Gather around the table.</h2>
            <p className="mt-4 text-base leading-relaxed text-stone-700 sm:text-[17px]">
              Chairs, stools and stoneware for long dinners and slow mornings.
            </p>
            <ButtonLink to="/products?category=kitchen-dining" variant="dark" className="mt-7 self-start">Shop Kitchen &amp; Dining</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
