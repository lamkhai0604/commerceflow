import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { SignInRequired } from './OrdersPage';

/** The signed-in customer's own details. Names and emails come from the session; nothing here can be edited yet. */
export default function AccountPage() {
  useDocumentTitle('Your account');
  const user = useAppSelector(state => state.auth.currentUser);
  if (!user) return <SignInRequired title="Log in to see your account" description="Your account shows your details and your orders." />;
  const admin = user.roles.includes('ADMIN');
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-[-0.03em]">Your account</h1>
      <section aria-labelledby="details-heading" className="mt-8 rounded-(--radius-card) border border-stone-200 p-6">
        <h2 id="details-heading" className="text-lg font-bold">Details</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-[15px]">
          <dt className="text-stone-700">Name</dt><dd className="font-semibold">{user.fullName}</dd>
          <dt className="text-stone-700">Email</dt><dd className="font-semibold break-all">{user.email}</dd>
          <dt className="text-stone-700">Account type</dt>
          <dd className="flex flex-wrap gap-2"><Badge tone="muted">Customer</Badge>{admin && <Badge tone="accent">Administrator</Badge>}</dd>
        </dl>
      </section>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink to="/account/orders">Order history</ButtonLink>
        {admin && <ButtonLink to="/admin" variant="secondary">Administration</ButtonLink>}
      </div>
    </div>
  );
}
