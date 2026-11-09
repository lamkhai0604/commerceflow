import { isEmailCandidate, normalizeEmail } from '@/features/auth/authValidation';

export interface CheckoutForm {
  email: string;
  fullName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  delivery: 'standard' | 'express';
  payment: 'APPROVE' | 'DECLINE' | 'UNAVAILABLE';
}

export type CheckoutField = Exclude<keyof CheckoutForm, 'delivery' | 'payment'>;

export const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
  'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

/** Field order matches the form so focus can move to the first problem. */
export function validateCheckout(form: CheckoutForm, { requireEmail = true } = {}): Partial<Record<CheckoutField, string>> {
  const errors: Partial<Record<CheckoutField, string>> = {};
  const email = normalizeEmail(form.email);
  // Members check out with their account email, so only guests are asked for one.
  if (!requireEmail) { /* nothing to check */ } else if (!email) errors.email = 'Email address is required.';
  else if (!isEmailCandidate(email) || !email.includes('.')) errors.email = 'Please enter a valid email address.';
  if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
  else if (form.fullName.trim().length > 150) errors.fullName = 'Full name must be 150 characters or fewer.';
  if (!form.address1.trim()) errors.address1 = 'Street address is required.';
  else if (form.address1.trim().length > 200) errors.address1 = 'Street address must be 200 characters or fewer.';
  if (form.address2.trim().length > 200) errors.address2 = 'This line must be 200 characters or fewer.';
  if (!form.city.trim()) errors.city = 'City is required.';
  else if (form.city.trim().length > 100) errors.city = 'City must be 100 characters or fewer.';
  if (!US_STATES.includes(form.state)) errors.state = 'Please choose a state.';
  if (!/^\d{5}(-\d{4})?$/.test(form.zip.trim())) errors.zip = 'Please enter a 5-digit ZIP code.';
  return errors;
}
