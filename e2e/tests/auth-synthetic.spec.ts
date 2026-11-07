import { test } from '../support/fixtures';
import { check, openLogin, origin, register } from '../support/api';
import { testUser } from '../support/testUsers';

test('E2E-15 controlled synthetic non-JSON failure has safe generic UI', async ({ page }) => {
  const user = testUser(); await origin(page); await register(page, user); await page.goto('/'); await openLogin(page);
  await page.locator('#auth-email').fill(user.email); await page.locator('#auth-password').fill(user.password);
  let writes = 0;
  await page.route('**/api/v1/auth/login', route => { writes++; return route.fulfill({ status: 500, contentType: 'text/html', body: '<html>SYNTHETIC_PRIVATE_DIAGNOSTIC</html>' }); });
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  const alert = page.getByRole('alert').filter({ hasText: 'We could not confirm the result.' }); await alert.waitFor();
  check(!(await alert.textContent())?.includes('SYNTHETIC_PRIVATE_DIAGNOSTIC'), 'SAFE_GENERIC_ERROR');
  check(writes === 1, 'NO_SYNTHETIC_REPLAY');
});
