import { useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { BagIcon, CloseIcon, LogoMark, MenuIcon, SearchIcon } from '@/components/icons';
import { Dialog } from '@/components/ui/Dialog';
import AccountMenu from '@/features/auth/components/AccountMenu';
import { cartActions, selectCartCount } from '@/features/cart/cartSlice';
import { listCategories } from '@/features/catalog/catalogApi';
import { useAsync } from '@/lib/useAsync';
import { cn } from '@/lib/cn';

/** "Shop all" plus one link per room from the catalog API; only "Shop all" shows until rooms load. */
export function useNavLinks() {
  const categories = useAsync(listCategories, 'categories');
  return [
    { label: 'Shop all', to: '/products' },
    ...(categories.data ?? []).map(c => ({ label: c.name, to: `/products?category=${c.slug}` })),
  ];
}

function useIsActive() {
  const location = useLocation();
  return (to: string) => {
    const [path, query] = to.split('?');
    if (location.pathname !== path) return false;
    const category = new URLSearchParams(location.search).get('category');
    return query ? `category=${category}` === query : !category;
  };
}

function SearchForm({ id, onSubmitted, className }: { id: string; onSubmitted?: () => void; className?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = term.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
    onSubmitted?.();
  };
  return (
    <form role="search" onSubmit={submit}
      className={cn('flex h-11 items-center gap-2 rounded-full border border-stone-300 px-3.5 focus-within:border-stone-900', className)}>
      <SearchIcon size={18} className="shrink-0 text-stone-600" />
      <label htmlFor={id} className="sr-only">Search products</label>
      <input id={id} type="search" value={term} onChange={e => setTerm(e.target.value)} placeholder="Search products"
        maxLength={120} className="w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-stone-500" />
    </form>
  );
}

export function Header() {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectCartCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = useIsActive();
  const NAV_LINKS = useNavLinks();
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-2 sm:px-6 xl:h-[72px] xl:gap-7 xl:px-8">
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu"
          className="flex size-11 items-center justify-center rounded-full hover:bg-linen xl:hidden"><MenuIcon size={22} /></button>
        <Link to="/" className="flex flex-1 items-center gap-2.5 text-lg font-bold tracking-tight text-stone-900 xl:flex-none">
          <span className="hidden sm:inline"><LogoMark /></span>CommerceFlow
        </Link>
        <nav aria-label="Main" className="hidden gap-5 text-[15px] font-medium xl:flex">
          {NAV_LINKS.map(link => (
            <NavLink key={link.to} to={link.to} aria-current={isActive(link.to) ? 'page' : undefined}
              className={() => cn('whitespace-nowrap py-2 hover:text-pine-700',
                isActive(link.to) ? 'text-pine-700 underline decoration-2 underline-offset-8' : 'text-stone-900')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden flex-1 xl:block" />
        <SearchForm id="header-search" className="hidden w-52 xl:flex" />
        <AccountMenu />
        <button type="button" onClick={() => dispatch(cartActions.drawerOpened())}
          aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-linen text-stone-900 hover:bg-stone-200">
          <BagIcon />
          {count > 0 && (
            <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pine-700 px-1 text-[11px] font-bold text-white">
              {count}
            </span>
          )}
        </button>
      </div>

      <Dialog open={menuOpen} onClose={closeMenu} labelledBy="mobile-menu-title" placement="left">
        <div className="flex items-center justify-between px-5 pt-3">
          <h2 id="mobile-menu-title" className="text-lg font-bold">Menu</h2>
          <button type="button" onClick={closeMenu} aria-label="Close menu"
            className="flex size-11 items-center justify-center rounded-full bg-linen"><CloseIcon size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <SearchForm id="menu-search" onSubmitted={closeMenu} className="mt-3 h-12" />
          <nav aria-label="Main" className="mt-3 flex flex-col text-[17px] font-medium">
            {NAV_LINKS.map(link => (
              <Link key={link.to} to={link.to} onClick={closeMenu} aria-current={isActive(link.to) ? 'page' : undefined}
                className={cn('border-b border-stone-200 py-3.5', isActive(link.to) ? 'text-pine-700' : 'text-stone-900')}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Dialog>
    </header>
  );
}
