import axios, { AxiosRequestConfig } from 'axios';
import { createAuthApi } from './authApi';

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'customer@example.com', fullName: 'Customer', roles: ['CUSTOMER'] };
function setup() {
  let token = 0;
  const adapter = jest.fn(async (config: AxiosRequestConfig) => ({ config, headers: {}, status: config.url === '/auth/register' ? 201 : config.url === '/auth/logout' ? 204 : 200, statusText: 'OK',
    data: config.url === '/auth/csrf' ? { headerName: 'X-CSRF-TOKEN', token: `token-${++token}` } : user }));
  const http = axios.create({ adapter });
  return { api: createAuthApi(http), adapter };
}
const rejected = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });

test('bootstrap, registration and login use cookies, exact passwords, normalized email, and rotated CSRF', async () => {
  const storage = jest.spyOn(Storage.prototype, 'setItem');
  const { api, adapter } = setup();
  const password = '  🔐'.repeat(12);
  await api.register({ email: ' Customer@Example.com ', password, fullName: ' Customer ' });
  await api.login({ email: ' Customer@Example.com ', password });
  await api.bootstrap();
  await api.logout();
  const writes = adapter.mock.calls.map(([c]) => c).filter(c => c.method === 'post');
  expect(writes).toHaveLength(3);
  expect(writes.every(c => c.withCredentials === true)).toBe(true);
  expect(JSON.parse(writes[0].data)).toEqual({ email: user.email, password, fullName: ' Customer ' });
  expect(writes[0].headers?.['X-CSRF-TOKEN']).toBe('token-1');
  expect(writes[2].headers?.['X-CSRF-TOKEN']).toBe('token-2');
  expect(storage).not.toHaveBeenCalled(); storage.mockRestore();
});

test.each(['CSRF_INVALID', 'ACCESS_DENIED', 'FORBIDDEN', 'UNKNOWN'])('%s is never automatically retried', async code => {
  const { api, adapter } = setup(); await api.bootstrap();
  adapter.mockRejectedValueOnce(rejected(403, { code, detail: 'secret password SQL' }));
  await expect(api.login({ email: user.email, password: 'secret' })).rejects.toMatchObject({ status: 403, code });
  expect(adapter).toHaveBeenCalledTimes(2);

});

test('confirmed CSRF failure bootstraps only on the next explicit mutation', async () => {
  const { api, adapter } = setup(); await api.bootstrap();
  adapter.mockRejectedValueOnce(rejected(403, { code: 'CSRF_INVALID' }));
  await api.login({ email: user.email, password: 'secret' }).catch(() => undefined);
  expect(adapter).toHaveBeenCalledTimes(2);
  await api.login({ email: user.email, password: 'secret' });
  expect(adapter.mock.calls[2][0].url).toBe('/auth/csrf');
});

test.each([
  [401, { code: 'INVALID_CREDENTIALS' }, 'Invalid email or password.'],
  [401, { code: 'UNAUTHENTICATED' }, 'Your session has expired. Please log in again.'],
  [409, { code: 'EMAIL_CONFLICT' }, 'An account with this email already exists. Please log in instead.'],
  [403, { code: 'ACCESS_DENIED' }, 'You do not have permission to perform this action.'],
  [403, { code: 'INVALID_CREDENTIALS' }, 'We could not confirm the result. Please try again when you are ready.'],
  [500, '<html>secret</html>', 'We could not confirm the result. Please try again when you are ready.'],
])('safe status/code feedback for %s', async (status, data, message) => {
  const { api, adapter } = setup(); adapter.mockRejectedValueOnce(rejected(status as number, data));
  await expect(api.me()).rejects.toMatchObject({ status, message });
});

test('only unauthenticated responses notify session expiry; credential and role failures do not', async () => {
  const { api, adapter } = setup(); const listener = jest.fn(); const unsubscribe = api.onSessionExpired(listener);
  for (const [status, code] of [[401, 'INVALID_CREDENTIALS'], [403, 'ACCESS_DENIED'], [401, 'UNAUTHENTICATED']] as const) {
    adapter.mockRejectedValueOnce(rejected(status, { code })); await api.me().catch(() => undefined);
  }
  expect(listener).toHaveBeenCalledTimes(1); unsubscribe();
});

test('validation field names are allowlisted and values/messages are not reflected', async () => {
  const { api, adapter } = setup();
  adapter.mockRejectedValueOnce(rejected(400, { code: 'VALIDATION_ERROR', errors: { password: 'secret', injected: 'SQL' } }));
  await expect(api.me()).rejects.toMatchObject({ fields: { password: 'This field does not meet the documented requirements.' } });
});

test('transport failure and malformed successful profile use safe fallback', async () => {
  const { api, adapter } = setup(); adapter.mockRejectedValueOnce(new Error('password secret'));
  await expect(api.me()).rejects.toMatchObject({ message: 'We could not confirm the result. Please try again when you are ready.' });
  adapter.mockResolvedValueOnce({ config: {}, headers: {}, status: 200, statusText: 'OK', data: '<html>secret</html>' } as never);
  await expect(api.me()).rejects.toMatchObject({ message: 'We could not confirm the result. Please try again when you are ready.' });
});

test('malformed CSRF bootstrap never sends the mutation', async () => {
  const { api, adapter } = setup();
  adapter.mockResolvedValueOnce({ config: {}, headers: {}, status: 200, statusText: 'OK', data: { headerName: 'wrong', token: 'x' } } as never);
  await expect(api.register({ email: user.email, password: 'password-test', fullName: 'Customer' })).rejects.toMatchObject({ message: expect.stringContaining('security verification') });
  expect(adapter).toHaveBeenCalledTimes(1);
});

test('logout discards old CSRF and subsequent explicit login bootstraps again', async () => {
  const { api, adapter } = setup();
  await api.logout(); await api.login({ email: user.email, password: 'password-test' });
  expect(adapter.mock.calls.map(([c]) => c.url)).toEqual(['/auth/csrf', '/auth/logout', '/auth/csrf', '/auth/login']);
  expect(adapter.mock.calls[3][0].headers?.['X-CSRF-TOKEN']).toBe('token-2');
});

test('unexpected successful logout response does not claim confirmed invalidation', async () => {
  const { api, adapter } = setup(); await api.bootstrap();
  adapter.mockResolvedValueOnce({ config: {}, headers: {}, status: 200, statusText: 'OK', data: '<html>proxy page</html>' } as never);
  await expect(api.logout()).rejects.toMatchObject({ message: 'We could not confirm the result. Please try again when you are ready.' });
});

test.each([
  ['REQUIRED', 'Password is required.'],
  ['INVALID_FORMAT', 'Password has an invalid format.'],
  ['INVALID_VALUE', 'Password does not meet the documented requirements.'],
  ['UNKNOWN', 'This field does not meet the documented requirements.'],
])('safe field code %s', async (code, message) => {
  const { api, adapter } = setup();
  adapter.mockRejectedValueOnce(rejected(400, { code: 'VALIDATION_ERROR',
    errors: { password: 'SECRET' }, fieldErrors: [{ field: 'password', code }, { field: 'injected', code: 'REQUIRED' }] }));
  await expect(api.me()).rejects.toMatchObject({ fields: { password: message } });
});
test('email INVALID_FORMAT has field-specific copy', async () => {
  const { api, adapter } = setup();
  adapter.mockRejectedValueOnce(rejected(400, { code: 'VALIDATION_ERROR', fieldErrors: [{ field: 'email', code: 'INVALID_FORMAT' }] }));
  await expect(api.me()).rejects.toMatchObject({ fields: { email: 'Please enter a valid email address.' } });
});

test.each([
  { id: 'not-a-uuid' }, { email: 'invalid' }, { email: 'x'.repeat(243) + '@example.com' },
  { email: ' USER@example.com ' }, { fullName: '😀'.repeat(51) }, { fullName: ' ' },
  { fullName: null }, { roles: ['SUPERADMIN'] }, { roles: 'CUSTOMER' },
])('rejects malformed profile %j', async invalid => {
  const { api, adapter } = setup();
  adapter.mockResolvedValueOnce({ config: {}, headers: {}, status: 200, statusText: 'OK', data: { ...user, ...invalid } } as never);
  await expect(api.me()).rejects.toMatchObject({ message: 'We could not confirm the result. Please try again when you are ready.' });
});
test('profile keeps backend-compatible quoted email and Unicode boundary', async () => {
  const { api, adapter } = setup();
  const data = { ...user, email: '"a b"@example.com', fullName: '😀'.repeat(50), password: 'DO NOT RETAIN' };
  adapter.mockResolvedValueOnce({ config: {}, headers: {}, status: 200, statusText: 'OK', data } as never);
  await expect(api.me()).resolves.toEqual({ id: user.id, email: data.email, fullName: data.fullName, roles: user.roles });
});

test.each([{ code: 'UNKNOWN' }, '<html>Unauthorized</html>', {}])('characterizes unknown/non-JSON 401 notification without changing policy: %j', async body => {
  const { api, adapter } = setup(); const listener = jest.fn(); api.onSessionExpired(listener);
  adapter.mockRejectedValueOnce(rejected(401, body)); await api.me().catch(() => undefined);
  expect(listener).not.toHaveBeenCalled();
});
test('characterizes credential failure without identity expiry', async () => {
  const { api, adapter } = setup(); const listener = jest.fn(); api.onSessionExpired(listener); await api.bootstrap();
  adapter.mockRejectedValueOnce(rejected(401, { code: 'INVALID_CREDENTIALS' }));
  await expect(api.login({ email: user.email, password: 'wrong' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  expect(listener).not.toHaveBeenCalled();
});

test('characterizes current generic notifier even for unusual login UNAUTHENTICATED', async () => {
  const { api, adapter } = setup(); const listener = jest.fn(); api.onSessionExpired(listener); await api.bootstrap();
  adapter.mockRejectedValueOnce(rejected(401, { code: 'UNAUTHENTICATED' }));
  await api.login({ email: user.email, password: 'wrong' }).catch(() => undefined);
  expect(listener).toHaveBeenCalledTimes(1); // characterization, not the proposed context-aware policy
});
