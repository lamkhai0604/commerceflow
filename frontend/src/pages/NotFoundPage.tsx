import { ButtonLink } from '@/components/ui/Button';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <section className="mx-auto max-w-xl px-5 py-20 text-center">
      <p className="text-sm font-semibold text-stone-600">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">We could not find that page</h1>
      <p className="mt-3 text-stone-700">The link may be out of date, or the page may have moved.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink to="/">Back to home</ButtonLink>
        <ButtonLink to="/products" variant="secondary">Browse products</ButtonLink>
      </div>
    </section>
  );
}
