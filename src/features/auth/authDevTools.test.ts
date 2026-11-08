import { sanitizeAuthAction } from './authDevTools';
import { authActions } from './authSlice';

test.each([
  authActions.login({ email: 'test@example.com', password: 'SECRET' }),
  authActions.register({ email: 'test@example.com', password: 'SECRET', fullName: 'Customer' }),
])('credential action redaction is immutable', action => {
  const sanitized = sanitizeAuthAction(action);
  expect(sanitized).toEqual({ type: action.type, payload: '[REDACTED]' });
  expect(JSON.stringify(sanitized)).not.toContain('SECRET');
  expect(action.payload.password).toBe('SECRET');
});
test('unrelated actions are preserved', () => {
  const action = { type: 'products/fetch' }; expect(sanitizeAuthAction(action)).toBe(action);
});
