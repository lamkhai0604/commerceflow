import { Link, Outlet } from 'react-router-dom';
import AccountMenu from '@/features/auth/components/AccountMenu';

export default function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="border-b border-stone-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight text-stone-900">CommerceFlow</Link>
          <AccountMenu />
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-stone-600 sm:px-6">
          © {new Date().getFullYear()} CommerceFlow. A portfolio project; no real orders or payments are processed.
        </div>
      </footer>
    </div>
  );
}
