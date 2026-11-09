import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { BagIcon, InfoIcon, UserIcon } from '@/components/icons';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/TextField';
import { authActions } from '@/features/auth/authSlice';
import { normalizeEmail } from '@/features/auth/authValidation';
import { cartActions, lineTotal, selectCartLines, selectSubtotalCents } from '@/features/cart/cartSlice';
import { shippingCents } from '@/features/cart/components/CartSummary';
import { CartSyncError } from '@/features/cart/components/CartMessages';
import { US_STATES, validateCheckout, type CheckoutField, type CheckoutForm } from '@/features/checkout/checkoutValidation';
import commerceApi, { newIdempotencyKey } from '@/features/commerce/commerceApi';
import { isCommerceFailure, type CheckoutDetails, type CommerceFailure, type Order } from '@/features/commerce/types';
import { formatMoney, fromCents } from '@/lib/money';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const EXPRESS_CENTS = 1900;

const PAYMENT_OPTIONS = [
  ['APPROVE', 'Payment approved', 'The order is placed.'],
  ['DECLINE', 'Payment declined', 'No order is created and nothing is charged.'],
  ['UNAVAILABLE', 'Payment service unavailable', 'A temporary failure you can retry.'],
] as const;

/**
 * Outcome of a checkout attempt for the customer, and whether the idempotency key must be kept. The key is kept
 * only when the outcome is not final (no answer, payment service unavailable, still processing), so that trying
 * again can never create a second order (ADR-006).
 */
export function describeCheckoutFailure(error: unknown): { message: string; keepKey: boolean; reloadCart?: boolean } {
  const failure: CommerceFailure = isCommerceFailure(error) ? error : {};
  switch (failure.code) {
    case 'PAYMENT_DECLINED':
      return { message: 'The demo payment was declined. No order was created and nothing was charged. Choose another payment outcome to try again.', keepKey: false };
    case 'PAYMENT_TEMPORARILY_UNAVAILABLE':
      return { message: 'The demo payment service is temporarily unavailable. Nothing was charged. Please try again in a few seconds.', keepKey: true };
    case 'INSUFFICIENT_STOCK': {
      const detail = failure.shortages?.map(s => s.available > 0
        ? `${s.productName}: you asked for ${s.requested}, only ${s.available} ${s.available === 1 ? 'is' : 'are'} available.`
        : `${s.productName} is no longer available.`).join(' ');
      return { message: `Some items are no longer available in the quantity you chose.${detail ? ` ${detail}` : ''} No order was created. Please review your cart and try again.`, keepKey: false, reloadCart: true };
    }
    case 'CART_EMPTY':
      return { message: 'Your cart is empty, so there is nothing to order.', keepKey: false, reloadCart: true };
    case 'IDEMPOTENCY_IN_PROGRESS':
      return { message: 'Your order is still being processed. Wait a moment, then select Place order again. You will not be charged twice.', keepKey: true };
    case 'IDEMPOTENCY_PAYLOAD_MISMATCH':
      return { message: 'An earlier attempt with different details was already recorded. Please check your orders before placing the order again.', keepKey: false };
    case 'VALIDATION_ERROR':
      return { message: 'Some details were not accepted. Please check the address and try again.', keepKey: true };
    case 'UNAUTHENTICATED':
      return { message: 'Your session has expired. Please log in again to continue.', keepKey: false };
    case 'ACCESS_DENIED':
      return { message: 'You are logged in, so this order must be placed from your account. Refresh the page and try again.', keepKey: false };
    case 'CSRF_INVALID':
      return { message: 'Security verification failed. Please refresh the page and try again.', keepKey: true };
    default:
      return { message: 'We could not confirm your order. Select Place order again: if the first attempt went through, you will see that same order and will not be charged twice.', keepKey: true };
  }
}

export default function CheckoutPage() {
  useDocumentTitle('Checkout');
  const auth = useAppSelector(state => state.auth);
  const [params, setParams] = useSearchParams();
  const lines = useAppSelector(selectCartLines);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <EmptyState headingLevel={1} icon={<BagIcon size={36} />} title="Your cart is empty" description="Add a product before checking out."
          action={<ButtonLink to="/products">Start shopping</ButtonLink>} />
      </div>
    );
  }
  if (auth.initializing) return <div className="mx-auto max-w-7xl px-5 py-10"><Skeleton className="h-96" /></div>;
  if (!auth.isLoggedIn && params.get('as') !== 'guest') return <CheckoutChoice onGuest={() => setParams({ as: 'guest' })} />;
  return <CheckoutForm key={auth.currentUser?.id ?? 'guest'} />;
}

/** Signed-out visitors who open /checkout directly choose how to check out (the same choice as the cart dialog). */
function CheckoutChoice({ onGuest }: { onGuest: () => void }) {
  const dispatch = useAppDispatch();
  const signIn = (mode: 'login' | 'register') => { dispatch(cartActions.checkoutAwaitingSignIn()); dispatch(authActions.openDialog(mode)); };
  const card = 'rounded-(--radius-card) border border-stone-200 p-6';
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-[-0.03em]">How would you like to check out?</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <section className={card}>
          <h2 className="text-lg font-bold">Guest checkout</h2>
          <p className="mt-2 text-[15px] text-stone-700">No account needed. Track the order later with its number and your email address.</p>
          <Button variant="secondary" className="mt-5" onClick={onGuest}>Continue as guest</Button>
        </section>
        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><UserIcon size={20} />Member checkout</h2>
          <p className="mt-2 text-[15px] text-stone-700">Your cart is saved to your account and orders appear in your order history.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => signIn('login')}>Log in</Button>
            <Button variant="ghost" onClick={() => signIn('register')}>Create account</Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function CheckoutForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const lines = useAppSelector(selectCartLines);
  const subtotal = useAppSelector(selectSubtotalCents);
  const user = useAppSelector(state => state.auth.currentUser);
  const serverCart = useAppSelector(state => !!state.cart.server);
  const member = !!user;
  const [form, setForm] = useState<CheckoutForm>({
    email: '', fullName: user?.fullName ?? '', address1: '', address2: '', city: '', state: '', zip: '', delivery: 'standard', payment: 'APPROVE',
  });
  const [errors, setErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);
  // One key per checkout attempt, reused when the same attempt is retried (ADR-006).
  const key = useRef<string>();
  useEffect(() => {
    if (attempt) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);
  useEffect(() => { if (failure) failureRef.current?.focus(); }, [failure]);

  const shipping = form.delivery === 'express' ? EXPRESS_CENTS : shippingCents(subtotal);
  const total = subtotal + shipping;
  const unavailable = lines.filter(line => line.available === false);
  const set = (field: keyof CheckoutForm) => (value: string) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => { const next = { ...previous }; delete next[field as CheckoutField]; return next; });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const invalid = validateCheckout(form, { requireEmail: !member });
    setErrors(invalid);
    if (Object.keys(invalid).length) { setAttempt(value => value + 1); return; }
    setSubmitting(true);
    setFailure(undefined);
    key.current ??= newIdempotencyKey();
    const details: CheckoutDetails = {
      shippingAddress: {
        recipientName: form.fullName.trim(), addressLine1: form.address1.trim(), addressLine2: form.address2.trim() || null,
        city: form.city.trim(), state: form.state, postalCode: form.zip.trim(), countryCode: 'US',
      },
      deliveryMethod: form.delivery === 'express' ? 'EXPRESS' : 'STANDARD',
      paymentScenario: form.payment,
    };
    try {
      const order: Order = member
        ? await commerceApi.checkoutMember(key.current, details)
        : await commerceApi.checkoutGuest(key.current, {
          ...details, email: normalizeEmail(form.email), items: lines.map(l => ({ productId: l.productId, quantity: l.quantity })),
        });
      key.current = undefined;
      navigate('/checkout/confirmation', { replace: true, state: { order } });
      dispatch(cartActions.cleared());
    } catch (error) {
      const outcome = describeCheckoutFailure(error);
      if (!outcome.keepKey) key.current = undefined;
      if (outcome.reloadCart && member) {
        commerceApi.cart().then(cart => dispatch(cartActions.serverCartLoaded(cart)), () => undefined);
      }
      setFailure(outcome.message);
      setSubmitting(false);
    }
  };

  const section = 'rounded-(--radius-card) border border-stone-200 p-5 sm:p-6';
  return (
    <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-6 lg:pt-10 xl:px-8">
      <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Checkout</h1>
      <p className="mt-2 flex items-center gap-2 text-[15px] text-stone-700">
        <InfoIcon size={18} />{member ? `Member checkout as ${user.email}.` : 'Guest checkout.'} Demo store: no payment is taken and nothing is shipped.
      </p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form ref={formRef} noValidate onSubmit={submit} aria-label="Checkout" className="flex flex-col gap-6">
          <CartSyncError />
          {member && !serverCart && (
            <Alert tone="warning">Your saved cart is still loading. Please wait a moment before placing the order.</Alert>
          )}
          <fieldset className={section}>
            <legend className="px-1 text-lg font-bold">Contact</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {member ? (
                <div>
                  <p className="text-sm font-semibold">Email address</p>
                  <p className="mt-1.5 flex h-12 items-center rounded-xl bg-stone-50 px-3.5 text-[15px] text-stone-700">{user.email}</p>
                </div>
              ) : (
                <TextField id="checkout-email" label="Email address" type="email" autoComplete="email" required
                  hint="Used to track your order." value={form.email} onChange={e => set('email')(e.target.value)} error={errors.email} />
              )}
              <TextField id="checkout-name" label="Full name" autoComplete="name" required
                value={form.fullName} onChange={e => set('fullName')(e.target.value)} error={errors.fullName} />
            </div>
          </fieldset>

          <fieldset className={section}>
            <legend className="px-1 text-lg font-bold">Shipping address</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-6">
              <TextField className="sm:col-span-6" id="checkout-address1" label="Street address" autoComplete="address-line1" required
                value={form.address1} onChange={e => set('address1')(e.target.value)} error={errors.address1} />
              <TextField className="sm:col-span-6" id="checkout-address2" label="Apartment, suite (optional)" autoComplete="address-line2"
                value={form.address2} onChange={e => set('address2')(e.target.value)} error={errors.address2} />
              <TextField className="sm:col-span-3" id="checkout-city" label="City" autoComplete="address-level2" required
                value={form.city} onChange={e => set('city')(e.target.value)} error={errors.city} />
              <div className="sm:col-span-1">
                <label htmlFor="checkout-state" className="block text-sm font-semibold">State<span aria-hidden="true" className="text-red-700"> *</span></label>
                <select id="checkout-state" required autoComplete="address-level1" value={form.state}
                  aria-invalid={errors.state ? true : undefined} aria-describedby={errors.state ? 'checkout-state-error' : undefined}
                  onChange={e => set('state')(e.target.value)}
                  className={`mt-1.5 h-12 w-full rounded-xl bg-white px-2 text-[15px] ${errors.state ? 'border-2 border-red-700' : 'border border-stone-400'}`}>
                  <option value="">—</option>
                  {US_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
                {errors.state && <p id="checkout-state-error" className="mt-1.5 text-[13px] text-red-700">{errors.state}</p>}
              </div>
              <TextField className="sm:col-span-2" id="checkout-zip" label="ZIP code" autoComplete="postal-code" inputMode="numeric" required
                value={form.zip} onChange={e => set('zip')(e.target.value)} error={errors.zip} />
            </div>
            <p className="mt-3 text-sm text-stone-600">Country: United States</p>
          </fieldset>

          <fieldset className={section}>
            <legend className="px-1 text-lg font-bold">Delivery</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {([['standard', 'Standard', '3–5 business days', shippingCents(subtotal)], ['express', 'Express', '1–2 business days', EXPRESS_CENTS]] as const)
                .map(([value, label, time, cost]) => (
                  <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${form.delivery === value ? 'border-2 border-pine-700' : 'border-stone-300'}`}>
                    <input type="radio" name="delivery" value={value} checked={form.delivery === value} onChange={() => set('delivery')(value)} className="mt-1 size-[18px] accent-pine-700" />
                    <span className="flex-1"><span className="block font-semibold">{label}</span><span className="text-sm text-stone-600">{time}</span></span>
                    <span className="font-semibold">{cost ? formatMoney(fromCents(cost)) : 'Free'}</span>
                  </label>
                ))}
            </div>
          </fieldset>

          <fieldset className={section}>
            <legend className="px-1 text-lg font-bold">Payment (demo)</legend>
            <p className="mt-2 text-[15px] text-stone-700">No card details are collected. Choose the outcome you want to try.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {PAYMENT_OPTIONS.map(([value, label, description]) => (
                <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${form.payment === value ? 'border-2 border-pine-700' : 'border-stone-300'}`}>
                  <input type="radio" name="payment" value={value} checked={form.payment === value} onChange={() => set('payment')(value)} className="mt-1 size-[18px] accent-pine-700" />
                  <span><span className="block font-semibold">{label}</span><span className="text-sm text-stone-600">{description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          {unavailable.length > 0 && (
            <Alert tone="warning">
              {unavailable.map(l => l.name).join(', ')} {unavailable.length === 1 ? 'is' : 'are'} no longer available. Remove {unavailable.length === 1 ? 'it' : 'them'} from your cart to place the order.
            </Alert>
          )}
          {failure && <div ref={failureRef} tabIndex={-1} className="outline-none"><Alert tone="error">{failure}</Alert></div>}

          <Button type="submit" size="lg" loading={submitting} loadingLabel="Placing order…" disabled={member && !serverCart}
            className="self-stretch sm:self-start">
            Place order · {formatMoney(fromCents(total))}
          </Button>
          <p className="-mt-3 text-[13px] text-stone-600">Prices, stock and totals are confirmed by the store when you place the order.</p>
        </form>

        <aside aria-labelledby="checkout-summary" className="rounded-(--radius-card) bg-stone-50 p-6 lg:sticky lg:top-24">
          <h2 id="checkout-summary" className="text-lg font-bold">Order summary</h2>
          <ul className="mt-4 divide-y divide-stone-200">
            {lines.map(line => (
              <li key={line.productId} className="flex items-center gap-3 py-3">
                <img src={`${line.image}-480.webp`} alt="" className="h-16 w-13 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 text-sm"><span className="block font-semibold">{line.name}</span><span className="text-stone-600">Qty {line.quantity}</span></span>
                <span className="text-sm font-semibold">{formatMoney(lineTotal(line))}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 border-t border-stone-200 pt-4 text-[15px]">
            <dt className="text-stone-700">Subtotal</dt><dd className="font-semibold">{formatMoney(fromCents(subtotal))}</dd>
            <dt className="text-stone-700">Shipping</dt><dd className="font-semibold">{shipping ? formatMoney(fromCents(shipping)) : 'Free'}</dd>
            <dt className="text-lg font-bold">Total</dt><dd className="text-lg font-bold">{formatMoney(fromCents(total))}</dd>
          </dl>
        </aside>
      </div>
    </div>
  );
}
