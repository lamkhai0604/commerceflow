import { formatMoney, fromCents, toCents } from './money';

test('formats API money strings as US dollars', () => {
  expect(formatMoney('1290.00')).toBe('$1,290.00');
  expect(formatMoney('0.05')).toBe('$0.05');
});

test('converts between money strings and integer cents without floating-point drift', () => {
  expect(toCents('89.99')).toBe(8999);
  expect(fromCents(toCents('0.10') + toCents('0.20'))).toBe('0.30');
  expect(fromCents(5)).toBe('0.05');
});

test.each(['89.9', '-1.00', '1,000.00', 'abc'])('rejects malformed money value %s', value => {
  expect(() => toCents(value)).toThrow('Invalid money value');
});
