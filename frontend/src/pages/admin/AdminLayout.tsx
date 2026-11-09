import { NavLink, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { SignInRequired } from '../OrdersPage';

/** Administration shell: only administrators see it. The API enforces the role again on every request. */
export default function AdminLayout() {
  useDocumentTitle('Administration');
  const auth = useAppSelector(state => state.auth);
  if (auth.initializing) return <div className="mx-auto max-w-5xl px-5 py-12"><Skeleton className="h-40" /></div>;
  if (!auth.isLoggedIn) return <SignInRequired title="Log in to open administration" description="Administration is available to administrator accounts." />;
  if (!auth.currentUser?.roles.includes('ADMIN')) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <EmptyState headingLevel={1} title="You do not have access to administration" description="This area is for administrator accounts." />
      </div>
    );
  }
  const tab = ({ isActive }: { isActive: boolean }) => cn('inline-flex min-h-11 items-center border-b-2 px-1 text-[15px] font-semibold',
    isActive ? 'border-pine-700 text-pine-700' : 'border-transparent text-stone-600 hover:text-stone-900');
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-[-0.03em]">Administration</h1>
      <nav aria-label="Administration" className="mt-5 flex gap-6 border-b border-stone-200">
        <NavLink to="/admin/orders" className={tab}>Orders</NavLink>
        <NavLink to="/admin/products" className={tab}>Products and stock</NavLink>
      </nav>
      <div className="mt-8"><Outlet /></div>
    </div>
  );
}
