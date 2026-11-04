import { codePoints, normalizeEmail, validateAuth } from './authValidation';
const valid = { email: 'test@example.com', password: '🔐'.repeat(12), fullName: '😀'.repeat(50) };
test('Unicode code points rather than UTF-16 units; exact full name and password', () => {
  expect(codePoints(valid.fullName)).toBe(50);
  expect(validateAuth(valid, true, valid.password)).toEqual({});
  expect(validateAuth({ ...valid, fullName: '😀'.repeat(51) }, true, valid.password).fullName).toBeDefined();
  expect(valid.fullName).toBe('😀'.repeat(50));
});
test.each([11, 129])('rejects registration password length %s', length => {
  expect(validateAuth({ ...valid, password: '🔐'.repeat(length) }, true, '🔐'.repeat(length)).password).toBeDefined();
});
test.each([12, 128])('accepts registration password length %s', length => {
  const password = '🔐'.repeat(length); expect(validateAuth({ ...valid, password }, true, password)).toEqual({});
});
test('normalizes before email validation and length checks', () => {
  const email = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(61);
  expect(email.length).toBe(254);
  expect(normalizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
  expect(validateAuth({ ...valid, email: `  ${email.toUpperCase()}  ` }, true, valid.password)).toEqual({});
  expect(validateAuth({ ...valid, email: `x${email}` }, true, valid.password).email).toBeDefined();
});
test('rejects blank fields and confirmation mismatch; login does not inherit creation limits', () => {
  expect(validateAuth({ ...valid, fullName: ' ', password: ' '.repeat(12) }, true, 'x')).toEqual(expect.objectContaining({ fullName: expect.any(String), password: expect.any(String), confirmPassword: expect.any(String) }));
  expect(validateAuth({ email: valid.email, password: 'x' })).toEqual({});
});
