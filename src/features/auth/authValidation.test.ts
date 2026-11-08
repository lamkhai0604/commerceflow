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

test.each(['"a b"@example.com', '"a@b"@example.com', 'user@localhost', 'ü@example.com', 'user@例子.公司'])('does not reject Hibernate-accepted email %s', email => {
  expect(validateAuth({ ...valid, email }, true, valid.password)).toEqual({});
});
test('combining sequences and lowercase expansion count code points', () => {
  expect(codePoints('e\u0301'.repeat(25))).toBe(50);
  expect(normalizeEmail('İ@EXAMPLE.COM')).toBe('i\u0307@example.com');
});
test('separate exact min/max password copy', () => {
  expect(validateAuth({ ...valid, password: 'x'.repeat(11) }, true, 'x'.repeat(11)).password).toBe('Password must contain at least 12 Unicode code points.');
  expect(validateAuth({ ...valid, password: 'x'.repeat(129) }, true, 'x'.repeat(129)).password).toBe('Password cannot exceed 128 Unicode code points.');
});

test.each(['a..b@example.com', 'user@-bad.com', 'user@example.com.', 'a'.repeat(65) + '@example.com'])('rejects observed Hibernate-invalid email %s', email => {
  expect(validateAuth({ ...valid, email }, true, valid.password).email).toBe('Please enter a valid email address.');
});
