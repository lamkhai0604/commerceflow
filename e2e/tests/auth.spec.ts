import { test } from '../support/fixtures';
import { api, check, cookie, csrf, login, register, origin } from '../support/api';
import { testUser } from '../support/testUsers';

test('E2E-01 anonymous startup is quietly signed out', async ({ page }) => {
  const me = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/me');
  await page.goto('/'); check((await me).status() === 401, 'ANONYMOUS_ME_STATUS');
  await page.getByRole('button', { name: 'Account menu' }).waitFor();
  check(await page.getByRole('dialog').count() === 0 && await page.getByRole('alert').count() === 0, 'QUIET_STARTUP');
});
test('E2E-02 genuine CSRF bootstrap', async ({ page }) => { await origin(page); await csrf(page); });
test('E2E-03 registration opens login without automatic authentication', async ({ page }) => {
  const user = testUser(); await page.goto('/');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Register', exact: true }).click();
  await page.locator('#auth-full-name').fill(user.fullName); await page.locator('#auth-email').fill(user.email);
  await page.locator('#auth-password').fill(user.password); await page.locator('#auth-confirm-password').fill(user.password);
  const registration = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/register');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  check((await registration).status() === 201, 'REGISTER_STATUS');
  await page.getByRole('dialog', { name: 'Log in to CommerceFlow' }).waitFor();
  check(await page.locator('#auth-email').inputValue() === user.email, 'PREFILLED_LOGIN');
  check((await api(page, 'GET', '/api/v1/auth/me')).status === 401, 'NO_AUTO_LOGIN');
});
test('E2E-04 real login establishes session and authenticated UI', async ({ page }) => {
  const user = testUser(); await origin(page); await register(page, user); await page.goto('/'); await login(page, user);
  check((await api(page, 'GET', '/api/v1/auth/me')).status === 200, 'AUTHENTICATED_ME');
  check((await page.getByRole('button', { name: 'Account menu' }).textContent())?.includes(user.fullName), 'AUTHENTICATED_UI');
});
test('E2E-05 reload restores browser-managed session', async ({ page }) => {
  const user = testUser(); await origin(page); await register(page, user); await page.goto('/'); await login(page, user);
  const me = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/me');
  await page.reload(); check((await me).status() === 200, 'RESTORED_ME_STATUS');
  await page.getByRole('button', { name: 'Account menu' }).waitFor();
  check((await page.getByRole('button', { name: 'Account menu' }).textContent())?.includes(user.fullName), 'RESTORED_UI');
  check(await page.evaluate(() => !localStorage.getItem('access_token') && sessionStorage.length === 0), 'NO_AUTH_STORAGE');
});
test('E2E-06 logout invalidates server session and replay', async ({ page, context, browser }) => {
  const user = testUser(); await origin(page); await register(page, user); await page.goto('/'); await login(page, user);
  const old = await cookie(context);
  await page.getByRole('button', { name: 'Account menu' }).click();
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/logout');
  await page.getByRole('menuitem', { name: 'Log out', exact: true }).click();
  check((await response).status() === 204, 'LOGOUT_STATUS');
  check((await api(page, 'GET', '/api/v1/auth/me')).status === 401, 'LOGOUT_ME');
  const replay = await browser.newContext({ ignoreHTTPSErrors: false });
  try { await replay.addCookies([old]); const p = await replay.newPage(); await origin(p);
    check((await api(p, 'GET', '/api/v1/auth/me')).status === 401, 'LOGOUT_REPLAY_REJECTED');
  } finally { await replay.close(); }
});
