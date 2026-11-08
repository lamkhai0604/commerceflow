import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { BagIcon, InfoIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/TextField';
import { cartActions, lineTotal, selectCartLines, selectSubtotalCents } from '@/features/cart/cartSlice';
import { shippingCents } from '@/features/cart/components/CartSummary';
import { US_STATES, validateCheckout, type CheckoutField, type CheckoutForm } from '@/features/checkout/checkoutValidation';
import { formatMoney, fromCents } from '@/lib/money';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import type { DemoOrder } from './OrderConfirmationPage';

const EXPRESS_CENTS = 1900;

export default function CheckoutPage() {
  useDocumentTitle('Checkout');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const lines = useAppSelector(selectCartLines);
  const subtotal = useAppSelector(selectSubtotalCents);
  const user = useAppSelector(state => state.auth.currentUser);
  const [form, setForm] = useState<CheckoutForm>({
    email: user?.email ?? '', fullName: user?.fullName ?? '', address1: '', address2: '', city: '', state: '', zip: '', delivery: 'standard',
  });
  const [errors, setErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  // After a failed submission, move focus to the first field that needs attention.
  useEffect(() => {
    if (attempt) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <EmptyState icon={<BagIcon size={36} />} title="Your cart is empty" description="Add a product before checking out."
          action={<ButtonLink to="/products">Start shopping</ButtonLink>} />
      </div>
    );
  }

  const shipping = form.delivery === 'express' ? EXPRESS_CENTS : shippingCents(subtotal);
  const total = subtotal + shipping;
  const set = (field: keyof CheckoutForm) => (value: string) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => { const next = { ...previous }; delete next[field as CheckoutField]; return next; });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const invalid = validateCheckout(form);
    setErrors(invalid);
    if (Object.keys(invalid).length) { setAttempt(value => value + 1); return; }
    setSubmitting(true);
    const order: DemoOrder = {
      number: `CF-${Math.floor(100000 + Math.random() * 900000)}`,
      name: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      total: fromCents(total),
      delivery: form.delivery,
    };
    navigate('/checkout/confirmation', { replace: true, state: { order } });
    dispatch(cartActions.cleared());
  };

  const section = 'rounded-(--radius-card) border border-stone-200 p-5 sm:p-6';
  return (
    <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-6 lg:pt-10 xl:px-8">
      <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Checkout</h1>
      <p className="mt-2 flex items-center gap-2 text-[15px] text-stone-700"><InfoIcon size={18} />Demo checkout: no payment is taken and nothing is shipped.</p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form ref={formRef} noValidate onSubmit={submit} aria-label="Checkout" className="flex flex-col gap-6">
          <fieldset className={section}>
            <legend className="px-1 text-lg font-bold">Contact</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <TextField id="checkout-email" label="Email address" type="email" autoComplete="email" required
                value={form.email} onChange={e => set('email')(e.target.value)} error={errors.email} />
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
                value={form.address2} onChange={e => set('address2')(e.target.value)} />
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
            <legend className="px-1 text-lg font-bold">Payment</legend>
            <p className="mt-2 rounded-xl bg-linen p-4 text-[15px] text-stone-700">
              Demo payment. No card details are collected and you will not be charged.
            </p>
          </fieldset>

          <Button type="submit" size="lg" loading={submitting} loadingLabel="Placing demo order…" className="self-stretch sm:self-start">
            Place demo order · {formatMoney(fromCents(total))}
          </Button>
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
