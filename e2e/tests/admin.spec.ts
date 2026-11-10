import { test } from '../support/fixtures';
import { api, check, csrf, grantAdmin, login, origin, register } from '../support/api';
import type { Page } from '@playwright/test';
import { testUser } from '../support/testUsers';

// A product no other scenario buys, so stock assertions never depend on another test's data.
const PRODUCT = '1740636e-8c74-5c5a-aeb4-4be836d68e3b';
const PRODUCT_NAME = 'Dome Floor Lamp, Graphite';
const ORDER_NUMBER = /CF-[A-Z0-9]{8}/;

// Step titles are fixed strings: the reporter names the failing step, so a CI failure says where it stopped.

async function adminLogin(page: Page) {
  const user = testUser();
  await origin(page); await register(page, user); await grantAdmin(user.email);
  await page.goto('/'); await login(page, user);
  return user;
}

// Administration against the real HTTPS stack (Sprint 5): the role is granted in the database, like in production.
test('E2E-18 administrator ships and delivers an order, cancels another with stock restored, and edits stock', async ({ page }) => {
  await adminLogin(page);
  const token = await csrf(page);
  const ordersMade: string[] = [];

  async function buy(quantity: number) {
    const added = await api(page, 'POST', '/api/v1/cart/items', { productId: PRODUCT, quantity }, token);
    check(added.status === 200, 'FIXTURE_CART');
    const placed = await api(page, 'POST', '/api/v1/orders', {
      shippingAddress: { recipientName: 'Admin Tester', addressLine1: '1 Test Way', city: 'Portland', state: 'OR', postalCode: '97201' },
      deliveryMethod: 'STANDARD', paymentScenario: 'APPROVE',
    }, token, { 'Idempotency-Key': `e2e-admin-${Date.now()}-${quantity}` });
    check(placed.status === 201 && ORDER_NUMBER.test(placed.data?.orderNumber), 'FIXTURE_ORDER');
    ordersMade.push(placed.data.orderNumber);
    return placed.data.orderNumber as string;
  }
  async function stock() {
    const list = await api(page, 'GET', '/api/v1/admin/products?q=dome%20floor%20lamp');
    check(list.status === 200 && list.data?.length === 1, 'ADMIN_PRODUCTS');
    return list.data[0].stockQuantity as number;
  }

  let shipNumber = '', cancelNumber = '', afterPurchases = 0;
  await test.step('administrator places two orders for the console', async () => {
    shipNumber = await buy(1);
    cancelNumber = await buy(2);
    afterPurchases = await stock();
  });

  await test.step('administration opens from the account menu', async () => {
    await page.reload();
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Administration' }).click();
    await page.getByRole('heading', { level: 1, name: 'Administration' }).waitFor();
  });

  await test.step('order is shipped and delivered', async () => {
    await page.getByLabel('Order number or email').fill(shipNumber);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('link', { name: new RegExp(shipNumber) }).click();
    await page.getByRole('heading', { name: `Order ${shipNumber}` }).waitFor();
    await page.getByRole('button', { name: 'Mark as shipped' }).click();
    await page.getByRole('button', { name: 'Mark as delivered' }).click();
    await page.getByText(/This order is complete/).waitFor();
    check(await page.getByText('Marked as delivered', { exact: true }).isVisible(), 'HISTORY_DELIVERED');
  });

  await test.step('order is cancelled with a reason and stock returns once', async () => {
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
  });

  await test.step('customer sees the cancelled status in order history', async () => {
    await page.goto('/account/orders');
    await page.getByRole('link', { name: new RegExp(`${cancelNumber}.*Cancelled`) }).waitFor();
  });

  await test.step('stock is edited in the console', async () => {
    await page.goto('/admin/products');
    await page.locator(`#stock-${PRODUCT}`).fill('30');
    await page.getByRole('form', { name: `Stock for ${PRODUCT_NAME}` }).getByRole('button', { name: 'Save stock' }).click();
    await page.getByText('Stock saved').waitFor();
    check(await stock() === 30, 'STOCK_EDITED');
  });

  await test.step('administration is closed after log-out', async () => {
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    await page.getByRole('button', { name: 'Account menu' }).filter({ hasText: 'Log in' }).waitFor();
    await page.goto('/admin');
    await page.getByRole('heading', { level: 1, name: 'Log in to open administration' }).waitFor();
    check((await api(page, 'GET', '/api/v1/admin/orders')).status === 401, 'ADMIN_API_CLOSED');
  });
  check(ordersMade.length === 2, 'FIXTURE_COUNT');
});

test('E2E-19 administrator creates a product that appears in the store, and a duplicate address is refused', async ({ page }) => {
  await adminLogin(page);
  const slug = `e2e-runner-${Date.now()}`;

  await test.step('account page shows the administrator', async () => {
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Your account' }).click();
    await page.getByRole('heading', { level: 1, name: 'Your account' }).waitFor();
    check(await page.getByText('Administrator', { exact: true }).isVisible(), 'ADMIN_BADGE');
  });

  await test.step('new product form validates and fills the address from the name', async () => {
    await page.goto('/admin/products');
    await page.getByRole('button', { name: 'New product' }).click();
    const dialog = page.getByRole('dialog', { name: 'New product' });
    await dialog.getByRole('button', { name: 'Create product' }).click();
    await dialog.getByText('Name is required.').waitFor();
    await dialog.getByLabel(/^Name/).fill('Linen Table Runner');
    check(await dialog.getByLabel(/^Address/).inputValue() === 'linen-table-runner', 'SLUG_FROM_NAME');
    await dialog.getByLabel(/^Address/).fill(slug);
    await dialog.getByLabel(/^Category/).selectOption({ label: 'Decor' });
    await dialog.getByLabel(/^Price/).fill('34.5');
    await dialog.getByLabel(/^In stock/).fill('12');
    await dialog.getByLabel('Description').fill('Washed linen, 180 cm.');
    await dialog.getByLabel('Photo').selectOption({ label: 'Same photo as Stoneware Vase, Cream' });
  });

  await test.step('product is created and shown in the console', async () => {
    const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/products' && r.request().method() === 'POST');
    await page.getByRole('dialog', { name: 'New product' }).getByRole('button', { name: 'Create product' }).click();
    check((await created).status() === 201, 'CREATE_STATUS');
    await page.getByText('Product created').waitFor();
    await page.getByText('Linen Table Runner', { exact: true }).waitFor();
  });

  await test.step('product page shows the new product to customers', async () => {
    await page.goto(`/products/${slug}`);
    await page.getByRole('heading', { level: 1, name: 'Linen Table Runner' }).waitFor();
    check(await page.getByText('$34.50').first().isVisible(), 'NEW_PRODUCT_PRICE');
    check(await page.getByRole('button', { name: /Add to cart/ }).isVisible(), 'NEW_PRODUCT_BUYABLE');
  });

  await test.step('duplicate address is refused and nothing is created', async () => {
    await page.goto('/admin/products');
    await page.getByRole('button', { name: 'New product' }).click();
    const dialog = page.getByRole('dialog', { name: 'New product' });
    await dialog.getByLabel(/^Name/).fill('Another Runner');
    await dialog.getByLabel(/^Address/).fill(slug);
    await dialog.getByLabel(/^Category/).selectOption({ label: 'Decor' });
    await dialog.getByLabel(/^Price/).fill('10');
    await dialog.getByRole('button', { name: 'Create product' }).click();
    await dialog.getByText(/Another product already uses this address/).waitFor();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    const list = await api(page, 'GET', '/api/v1/admin/products?q=runner');
    check(list.status === 200 && list.data.length === 1, 'NO_DUPLICATE_CREATED');
  });
});
