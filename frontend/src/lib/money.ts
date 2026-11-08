/**
 * Money values follow the API contract: USD decimal strings such as "89.99".
 * Arithmetic is done in integer cents to avoid floating-point rounding.
 */
export type Money = string;

const MONEY_PATTERN = /^\d+\.\d{2}$/;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function toCents(value: Money): number {
  if (!MONEY_PATTERN.test(value)) throw new Error(`Invalid money value: ${value}`);
  const [dollars, cents] = value.split('.');
  return Number(dollars) * 100 + Number(cents);
}

export function fromCents(cents: number): Money {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`Invalid cents value: ${cents}`);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** "1290.00" → "$1,290.00" */
export function formatMoney(value: Money): string {
  return usd.format(toCents(value) / 100);
}
