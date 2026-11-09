import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { CartDrawer } from '@/features/cart/components/CartDrawer';
import { CartNoticeToast } from '@/features/cart/components/CartMessages';
import { CheckoutGate } from '@/features/checkout/CheckoutGate';
import { useServerWaking } from '@/lib/serverWake';
import { Header, useNavLinks } from './Header';

/** Moves to the top of the page on navigation, as a full page load would. */
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);
  return null;
}

export default function MainLayout() {
  const { pathname } = useLocation();
  return (
    <ToastProvider>
      <ScrollToTop />
      <div className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
          Skip to content
        </a>
        <p className="bg-pine-700 px-4 py-2 text-center text-[13px] text-white">
          Demo store · Prices in US dollars · No real orders or payments are taken
        </p>
        <Header />
        <ServerWakeNotice />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          <ErrorBoundary resetKey={pathname}><Outlet /></ErrorBoundary>
        </main>
        <Footer />
      </div>
      <CartDrawer />
      <CheckoutGate />
      <CartNoticeToast />
    </ToastProvider>
  );
}

/** Shown while a sleeping free-tier API instance starts (S3-D01); requests retry on their own. */
function ServerWakeNotice() {
  const waking = useServerWaking();
  if (!waking) return null;
  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900">
      Starting the server. This can take up to two minutes on the free hosting plan; the page will continue on its own.
    </div>
  );
}

function Footer() {
  const NAV_LINKS = useNavLinks();
  const column = 'flex flex-col gap-2.5 text-sm';
  const link = 'text-stone-300 hover:text-white';
  return (
    <footer className="mt-24 bg-stone-900 text-stone-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pt-14 pb-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 xl:px-8">
        <div>
          <p className="text-lg font-bold tracking-tight text-white">CommerceFlow</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-300">
            A portfolio e-commerce project. Products, prices and checkout are for demonstration only.
          </p>
        </div>
        <nav aria-label="Shop">
          <h2 className="text-sm font-semibold text-white">Shop</h2>
          <div className={`mt-3.5 ${column}`}>
            {NAV_LINKS.slice(0, 4).map(l => <Link key={l.to} to={l.to} className={link}>{l.label}</Link>)}
          </div>
        </nav>
        <nav aria-label="Help">
          <h2 className="text-sm font-semibold text-white">Help</h2>
          <div className={`mt-3.5 ${column}`}>
            <Link to="/cart" className={link}>Your cart</Link>
            <Link to="/track-order" className={link}>Track an order</Link>
            <Link to="/account/orders" className={link}>Order history</Link>
          </div>
        </nav>
        <nav aria-label="Project">
          <h2 className="text-sm font-semibold text-white">Project</h2>
          <div className={`mt-3.5 ${column}`}>
            <a href="https://github.com/lamkhai0604/commerceflow" className={link}>Source on GitHub</a>
            <a href="https://github.com/lamkhai0604/commerceflow/blob/master/frontend/public/images/SOURCES.md" className={link}>Image credits</a>
          </div>
        </nav>
      </div>
      <div className="mx-auto max-w-7xl border-t border-stone-700 px-5 py-6 text-[13px] text-stone-300 sm:px-6 xl:px-8">
        © {new Date().getFullYear()} CommerceFlow. Built by Lam Khai.
      </div>
    </footer>
  );
}
