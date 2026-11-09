import { useRef, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { isEmailCandidate, normalizeEmail } from '@/features/auth/authValidation';
import commerceApi from '@/features/commerce/commerceApi';
import { isCommerceFailure, type Order } from '@/features/commerce/types';
import { OrderDetails } from '@/features/orders/OrderDetails';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const ORDER_NUMBER = /^CF-[A-Z0-9]{8}$/;

/** Guest order lookup by order number and the email address used at checkout (CR-S4-01). */
export default function TrackOrderPage() {
  useDocumentTitle('Track an order');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ number?: string; email?: string }>({});
  const [failure, setFailure] = useState<string>();
  const [order, setOrder] = useState<Order>();
  const [loading, setLoading] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const result = useRef<HTMLHeadingElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const orderNumber = number.trim().toUpperCase();
    const address = normalizeEmail(email);
    const invalid: typeof errors = {};
    if (!ORDER_NUMBER.test(orderNumber)) invalid.number = 'Enter the order number as shown on your confirmation, for example CF-7K2M9QXA.';
    if (!address || !isEmailCandidate(address)) invalid.email = 'Please enter the email address used at checkout.';
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      window.setTimeout(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setLoading(true); setFailure(undefined); setOrder(undefined);
    try {
      setOrder(await commerceApi.lookup(orderNumber, address));
      window.setTimeout(() => result.current?.focus());
    } catch (error) {
      const status = isCommerceFailure(error) ? error.status : undefined;
      setFailure(status === 404 ? 'We could not find an order with that number and email address. Check both and try again.'
        : status === 429 ? 'Too many attempts. Please wait a few minutes before trying again.'
        : 'We could not look up the order right now. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-[-0.03em]">Track an order</h1>
      <p className="mt-2 max-w-xl text-[15px] text-stone-700">Enter the order number from your confirmation and the email address you used at checkout.</p>
      <form ref={form} noValidate onSubmit={submit} aria-label="Track an order" className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
        <TextField id="track-number" label="Order number" required autoCapitalize="characters" placeholder="CF-XXXXXXXX"
          value={number} onChange={e => { setNumber(e.target.value); setErrors(p => ({ ...p, number: undefined })); }} error={errors.number} />
        <TextField id="track-email" label="Email address" type="email" autoComplete="email" required
          value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }} error={errors.email} />
        <Button type="submit" loading={loading} loadingLabel="Looking up…" className="sm:col-span-2 sm:justify-self-start">Find order</Button>
      </form>
      {failure && <Alert tone="error" className="mt-6 max-w-xl">{failure}</Alert>}
      {order && (
        <section className="mt-10" aria-labelledby="track-result">
          <h2 id="track-result" ref={result} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">Order {order.orderNumber}</h2>
          <div className="mt-6"><OrderDetails order={order} headingLevel={3} /></div>
        </section>
      )}
    </div>
  );
}
