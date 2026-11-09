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
}

export type CheckoutField = Exclude<keyof CheckoutForm, 'delivery'>;

export const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
  'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

/** Field order matches the form so focus can move to the first problem. */
export function validateCheckout(form: CheckoutForm): Partial<Record<CheckoutField, string>> {
  const errors: Partial<Record<CheckoutField, string>> = {};
  const email = normalizeEmail(form.email);
  if (!email) errors.email = 'Email address is required.';
  else if (!isEmailCandidate(email) || !email.includes('.')) errors.email = 'Please enter a valid email address.';
  if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!form.address1.trim()) errors.address1 = 'Street address is required.';
  if (!form.city.trim()) errors.city = 'City is required.';
  if (!US_STATES.includes(form.state)) errors.state = 'Please choose a state.';
  if (!/^\d{5}(-\d{4})?$/.test(form.zip.trim())) errors.zip = 'Please enter a 5-digit ZIP code.';
  return errors;
}
