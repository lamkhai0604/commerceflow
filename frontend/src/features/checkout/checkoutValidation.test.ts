import { validateCheckout, type CheckoutForm } from './checkoutValidation';

const valid: CheckoutForm = {
  email: 'jane@example.com', fullName: 'Jane Doe', address1: '1 Main St', address2: '', city: 'Seattle', state: 'WA', zip: '98101', delivery: 'standard', payment: 'APPROVE',
};

test('a complete US address passes, including ZIP+4', () => {
  expect(validateCheckout(valid)).toEqual({});
  expect(validateCheckout({ ...valid, zip: '98101-1234' })).toEqual({});
});

test('every missing or invalid field gets a specific message', () => {
  expect(validateCheckout({ ...valid, email: 'jane@', fullName: ' ', address1: '', city: '', state: 'XX', zip: '981' })).toEqual({
    email: 'Please enter a valid email address.',
    fullName: 'Full name is required.',
    address1: 'Street address is required.',
    city: 'City is required.',
    state: 'Please choose a state.',
    zip: 'Please enter a 5-digit ZIP code.',
  });
  expect(validateCheckout({ ...valid, email: '' }).email).toBe('Email address is required.');
});

test('members are not asked for an email address and server length limits are checked', () => {
  expect(validateCheckout({ ...valid, email: '' }, { requireEmail: false })).toEqual({});
  expect(validateCheckout({ ...valid, city: 'x'.repeat(101), address2: 'y'.repeat(201) })).toEqual({
    city: 'City must be 100 characters or fewer.', address2: 'This line must be 200 characters or fewer.',
  });
});
