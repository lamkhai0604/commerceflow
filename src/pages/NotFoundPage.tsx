import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-medium text-stone-500">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">We could not find that page</h1>
      <p className="mt-3 text-stone-600">The link may be out of date, or the page may have moved.</p>
      <Link to="/" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-stone-900 px-6 text-sm font-medium text-white hover:bg-stone-700">
        Back to home
      </Link>
    </section>
  );
}
