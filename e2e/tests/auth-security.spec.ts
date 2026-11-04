import { test } from '../support/fixtures';
import { api, check, cookie, csrf, expectProblem, expireOwnedSession, login, openLogin, origin, register } from '../support/api';
import { testUser } from '../support/testUsers';

test('E2E-10 missing/invalid CSRF is rejected and recovery requires explicit retry', async ({ page, browser }) => {
  const user = testUser(); await origin(page);
  await expectProblem(await api(page, 'POST', '/api/v1/auth/register', user), 403, 'CSRF_INVALID');
  const other = await browser.newContext({ ignoreHTTPSErrors: false });
  try { const p = await other.newPage(); await origin(p);
    await expectProblem(await api(page, 'POST', '/api/v1/auth/register', user, await csrf(p)), 403, 'CSRF_INVALID');
  } finally { await other.close(); }
  await register(page, user); await page.goto('/'); await openLogin(page);
  await page.locator('#auth-email').fill(user.email); await page.locator('#auth-password').fill(user.password);
  let writes = 0;
  await page.route('**/api/v1/auth/login', route => { writes++; return route.continue({ headers: { ...route.request().headers(), 'x-csrf-token': 'invalid-test-token' } }); });
  const denied = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/login');
  await page.getByRole('button', { name: 'Log in', exact: true }).click(); check((await denied).status() === 403, 'CSRF_UI_STATUS');
  await page.getByRole('button', { name: 'Refresh security verification' }).waitFor();
  check(writes === 1, 'NO_AUTOMATIC_REPLAY');
  await page.unroute('**/api/v1/auth/login');
  const refresh = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/csrf');
  await page.getByRole('button', { name: 'Refresh security verification' }).click(); check((await refresh).status() === 200, 'EXPLICIT_CSRF_REFRESH');
  await page.locator('#auth-password').fill(user.password);
  const success = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/login');
  await page.getByRole('button', { name: 'Log in', exact: true }).click(); check((await success).status() === 200, 'EXPLICIT_RETRY_LOGIN');
});
test('E2E-11 actual expired JDBC session restores quiet signed-out UI on reload', async ({ page }) => {
  const user = testUser(); await origin(page); await register(page, user); await page.goto('/'); await login(page, user);
  await expireOwnedSession(user.email);
  await expectProblem(await api(page, 'GET', '/api/v1/auth/me'), 401, 'UNAUTHENTICATED');
  const me = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/me');
  await page.reload(); check((await me).status() === 401, 'EXPIRED_RESTORE');
  await page.getByRole('button', { name: 'Account menu' }).waitFor();
  check(await page.getByRole('dialog').count() === 0, 'QUIET_EXPIRED_STARTUP');
});
test('E2E-12 genuine role-filter denial preserves valid CUSTOMER session', async ({ page }) => {
  const user = testUser(); await origin(page); await register(page, user); await page.goto('/'); await login(page, user);
  // No admin business endpoint is implemented: this probes the existing security boundary only.
  await expectProblem(await api(page, 'GET', '/api/v1/admin/__integration_boundary'), 403, 'ACCESS_DENIED');
  check((await api(page, 'GET', '/api/v1/auth/me')).status === 200, 'DENIAL_PRESERVES_SESSION');
});
test('E2E-13 browser transports secure HttpOnly Lax root cookie', async ({ page, context }) => {
  const user = testUser(); await origin(page); await register(page, user); await page.goto('/'); await login(page, user);
  const c = await cookie(context); check(c.secure && c.httpOnly && c.sameSite === 'Lax' && c.path === '/', 'COOKIE_ATTRIBUTES');
  check(new URL(page.url()).origin === 'https://localhost:8443', 'SAME_HTTPS_ORIGIN');
  check((await api(page, 'GET', '/api/v1/auth/me')).status === 200, 'COOKIE_TRANSPORT');
});
test('E2E-14 rotated session and stale CSRF cannot be reused', async ({ page, context, browser }) => {
  const user = testUser(); await origin(page); await register(page, user); await page.goto('/');
  const oldToken = await csrf(page), oldCookie = await cookie(context); await login(page, user);
  check((await cookie(context)).value !== oldCookie.value, 'SESSION_ROTATION');
  await expectProblem(await api(page, 'POST', '/api/v1/auth/logout', undefined, oldToken), 403, 'CSRF_INVALID');
  const replay = await browser.newContext({ ignoreHTTPSErrors: false });
  try { await replay.addCookies([oldCookie]); const p = await replay.newPage(); await origin(p);
    check((await api(p, 'GET', '/api/v1/auth/me')).status === 401, 'OLD_SESSION_REJECTED');
  } finally { await replay.close(); }
});
