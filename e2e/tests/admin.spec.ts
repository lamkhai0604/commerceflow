import { test } from '../support/fixtures';
import { api, check, csrf, grantAdmin, login, origin, register } from '../support/api';
import { testUser } from '../support/testUsers';

// A product no other scenario buys, so stock assertions never depend on another test's data.
const PRODUCT = '1740636e-8c74-5c5a-aeb4-4be836d68e3b';
const PRODUCT_NAME = 'Dome Floor Lamp, Graphite';
const ORDER_NUMBER = /CF-[A-Z0-9]{8}/;

// Administration against the real HTTPS stack (Sprint 5): the role is granted in the database, like in production.
test('E2E-18 administrator ships and delivers an order, cancels another with stock restored, and edits stock', async ({ page }) => {
  const user = testUser();
  await origin(page); await register(page, user); await grantAdmin(user.email);
  await page.goto('/'); await login(page, user);
  const token = await csrf(page);

  async function buy(quantity: number) {
    const added = await api(page, 'POST', '/api/v1/cart/items', { productId: PRODUCT, quantity }, token);
    check(added.status === 200, 'FIXTURE_CART');
    const placed = await api(page, 'POST', '/api/v1/orders', {
      shippingAddress: { recipientName: 'Admin Tester', addressLine1: '1 Test Way', city: 'Portland', state: 'OR', postalCode: '97201' },
      deliveryMethod: 'STANDARD', paymentScenario: 'APPROVE',
    }, token, { 'Idempotency-Key': `e2e-admin-${Date.now()}-${quantity}` });
    check(placed.status === 201 && ORDER_NUMBER.test(placed.data?.orderNumber), 'FIXTURE_ORDER');
    return placed.data.orderNumber as string;
  }
  async function stock() {
    const list = await api(page, 'GET', '/api/v1/admin/products?q=dome%20floor%20lamp');
    check(list.status === 200 && list.data?.length === 1, 'ADMIN_PRODUCTS');
    return list.data[0].stockQuantity as number;
  }

  const shipNumber = await buy(1);
  const cancelNumber = await buy(2);
  const afterPurchases = await stock();

  await page.reload();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Administration' }).click();
  await page.getByRole('heading', { level: 1, name: 'Administration' }).waitFor();

  await page.getByLabel('Order number or email').fill(shipNumber);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: new RegExp(shipNumber) }).click();
  await page.getByRole('heading', { name: `Order ${shipNumber}` }).waitFor();
  await page.getByRole('button', { name: 'Mark as shipped' }).click();
  await page.getByRole('button', { name: 'Mark as delivered' }).click();
  await page.getByText(/This order is complete/).waitFor();
  check(await page.getByText('Marked as delivered', { exact: true }).isVisible(), 'HISTORY_DELIVERED');

  await page.getByRole('link', { name: 'All orders' }).click();
  await page.getByLabel('Order number or email').fill(cancelNumber);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: new RegExp(cancelNumber) }).click();
  await page.getByRole('button', { name: 'Cancel order' }).click();
  const dialog = page.getByRole('dialog', { name: `Cancel order ${cancelNumber}?` });
  await dialog.getByLabel('Reason (optional)').fill('E2E cancellation');
  await dialog.getByRole('button', { name: 'Cancel order' }).click();
  await page.getByText(/This order is cancelled/).waitFor();
  check(await page.getByText('Reason: E2E cancellation').isVisible(), 'HISTORY_REASON');
  check(await stock() === afterPurchases + 2, 'STOCK_RESTORED_ONCE');

  // The customer sees the new status in their own history.
  await page.goto('/account/orders');
  await page.getByRole('link', { name: new RegExp(`${cancelNumber}.*Cancelled`) }).waitFor();

  // Stock editing.
  await page.goto('/admin/products');
  await page.locator(`#stock-${PRODUCT}`).fill('30');
  await page.getByRole('form', { name: `Stock for ${PRODUCT_NAME}` }).getByRole('button', { name: 'Save stock' }).click();
  await page.getByText('Stock saved').waitFor();
  check(await stock() === 30, 'STOCK_EDITED');

  // Logged out, administration is closed.
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.getByRole('button', { name: 'Account menu' }).filter({ hasText: 'Log in' }).waitFor();
  await page.goto('/admin');
  await page.getByRole('heading', { level: 1, name: 'Log in to open administration' }).waitFor();
  check((await api(page, 'GET', '/api/v1/admin/orders')).status === 401, 'ADMIN_API_CLOSED');
});
