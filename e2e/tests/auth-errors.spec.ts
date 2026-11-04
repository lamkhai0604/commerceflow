import { test } from '../support/fixtures';
import { api, check, csrf, expectProblem, openLogin, origin, register } from '../support/api';
import { testUser } from '../support/testUsers';

test('E2E-07 wrong credentials return safe generic UI', async ({ page }) => {
  const user = testUser(); await origin(page); await register(page, user); await page.goto('/'); await openLogin(page);
  await page.locator('#auth-email').fill(user.email); await page.locator('#auth-password').fill('wrong-synthetic-password');
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/login');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  const denied = await response;
  check(denied.status() === 401 && (await denied.json()).code === 'INVALID_CREDENTIALS', 'WRONG_CREDENTIALS_STATUS');
  await page.getByRole('alert').filter({ hasText: 'Invalid email or password.' }).waitFor();
});
test('E2E-08 duplicate registration is EMAIL_CONFLICT', async ({ page }) => {
  const user = testUser(); await origin(page); await register(page, user);
  await expectProblem(await api(page, 'POST', '/api/v1/auth/register', user, await csrf(page)), 409, 'EMAIL_CONFLICT');
});
test('E2E-09 invalid registration reaches real backend validation', async ({ page }) => {
  await origin(page);
  const response = await api(page, 'POST', '/api/v1/auth/register', { email: 'invalid', fullName: '', password: 'short' }, await csrf(page));
  await expectProblem(response, 400, 'VALIDATION_ERROR');
  check(response.data.errors?.fullName && response.data.errors?.password, 'VALIDATION_FIELDS');
});
