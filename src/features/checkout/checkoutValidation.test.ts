import { validateCheckout, type CheckoutForm } from './checkoutValidation';

const valid: CheckoutForm = {
  email: 'jane@example.com', fullName: 'Jane Doe', address1: '1 Main St', address2: '', city: 'Seattle', state: 'WA', zip: '98101', delivery: 'standard',
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
