import { test } from '../support/fixtures';
import { check, origin, register } from '../support/api';
import { testUser } from '../support/testUsers';

const ORDER_NUMBER = /CF-[A-Z0-9]{8}/;

// Step titles are fixed strings: the reporter names the failing step, so a CI failure says where it stopped.

// Storefront and checkout on the demonstration catalog (SF-06 to SF-08, CR-S4-01) against the real HTTPS stack.
test('E2E-16 guest: browse, add to cart, choose guest checkout, place the order and track it', async ({ page }) => {
  await test.step('guest adds a product to the cart', async () => {
    await page.goto('/products?category=decor');
    await page.getByRole('heading', { level: 1, name: 'Decor' }).waitFor();
    await page.getByRole('link', { name: 'Stoneware Vase, Cream' }).click();
    await page.getByRole('heading', { level: 1, name: 'Stoneware Vase, Cream' }).waitFor();
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    const add = page.getByRole('button', { name: 'Add to cart · $136.00' });
    // Tailwind 4 does not give buttons a pointer cursor by itself; the stylesheet has to.
    check(await add.evaluate(element => getComputedStyle(element).cursor) === 'pointer', 'POINTER_CURSOR');
    await add.click();
    await page.getByRole('status').filter({ hasText: 'Stoneware Vase, Cream · Qty 2' }).waitFor();
    check(await page.getByRole('button', { name: 'Cart, 2 items' }).isVisible(), 'CART_COUNT');
  });

  await test.step('guest chooses guest checkout in the dialog', async () => {
    await page.getByRole('button', { name: 'Cart, 2 items' }).click();
    const drawer = page.getByRole('dialog', { name: /Your cart/ });
    await drawer.getByText('Your order ships free.').waitFor();
    await drawer.getByRole('link', { name: 'Check out · $136.00' }).click();
    const choice = page.getByRole('dialog', { name: 'How would you like to check out?' });
    await choice.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('heading', { level: 1, name: 'Checkout' }).waitFor();
  });

  await test.step('checkout form reports missing fields', async () => {
    await page.getByRole('button', { name: 'Place order · $136.00' }).click();
    await page.getByText('Email address is required.').waitFor();
    check(await page.evaluate(() => document.activeElement?.id) === 'checkout-email', 'FOCUS_FIRST_INVALID');
    await page.getByLabel(/^Email address/).fill('e2e-storefront@example.com');
    await page.getByLabel(/^Full name/).fill('Storefront Tester');
    await page.getByLabel(/^Street address/).fill('1 Test Way');
    await page.getByLabel(/^City/).fill('Portland');
    await page.getByLabel(/^State/).selectOption('OR');
    await page.getByLabel(/^ZIP code/).fill('97201');
  });

  await test.step('declined payment creates no order', async () => {
    await page.getByRole('radio', { name: /Payment declined/ }).check();
    const declined = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/checkout/guest');
    await page.getByRole('button', { name: 'Place order · $136.00' }).click();
    check((await declined).status() === 402, 'DECLINE_STATUS');
    await page.getByText(/The demo payment was declined/).waitFor();
  });

  let orderNumber = '';
  await test.step('approved payment shows the confirmation', async () => {
    await page.getByRole('radio', { name: /Payment approved/ }).check();
    const placed = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/checkout/guest');
    await page.getByRole('button', { name: 'Place order · $136.00' }).click();
    check((await placed).status() === 201, 'ORDER_STATUS');
    await page.getByRole('heading', { name: 'Thank you, Storefront Tester.' }).waitFor();
    const confirmation = await page.getByRole('status').filter({ hasText: 'is confirmed' }).innerText();
    const found = confirmation.match(ORDER_NUMBER)?.[0];
    check(found, 'ORDER_CONFIRMED');
    orderNumber = found;
    check(await page.getByRole('button', { name: 'Cart, 0 items' }).isVisible(), 'CART_EMPTIED');
  });

  await test.step('guest tracks the order by number and email', async () => {
    await page.getByRole('link', { name: 'track this order' }).click();
    await page.getByLabel(/^Order number/).fill(orderNumber);
    await page.getByLabel(/^Email address/).fill('E2E-Storefront@Example.com');
    await page.getByRole('button', { name: 'Find order' }).click();
    await page.getByRole('heading', { name: `Order ${orderNumber}` }).waitFor();
    check(await page.getByText('Portland, OR 97201').isVisible(), 'TRACKED_ORDER');
  });
});

test('E2E-17 member: a guest cart is merged at log-in, checked out from the account and listed in order history', async ({ page }) => {
  const user = testUser();
  await test.step('account is created and the guest fills a cart', async () => {
    await origin(page); await register(page, user);
    await page.goto('/products/stoneware-mug');
    await page.getByRole('heading', { level: 1, name: 'Stoneware Mug' }).waitFor();
    await page.getByRole('button', { name: 'Add to cart · $18.00' }).click();
    await page.getByRole('button', { name: 'Cart, 1 item' }).click();
  });

  await test.step('checkout choice leads to log-in and the cart merge', async () => {
    await page.getByRole('dialog', { name: /Your cart/ }).getByRole('link', { name: /Check out/ }).click();
    await page.getByRole('dialog', { name: 'How would you like to check out?' }).getByRole('button', { name: 'Log in' }).click();
    await page.locator('#auth-email').fill(user.email);
    await page.locator('#auth-password').fill(user.password);
    const merged = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/cart/merge');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    check((await merged).status() === 200, 'MERGE_STATUS');
    await page.getByText('Your cart was saved to your account').waitFor();
    await page.getByText(`Member checkout as ${user.email}.`, { exact: false }).waitFor();
    check(await page.getByLabel(/^Email address/).count() === 0, 'MEMBER_EMAIL_FROM_ACCOUNT');
  });

  let orderNumber = '';
  await test.step('member places the order', async () => {
    await page.getByLabel(/^Street address/).fill('2 Member Road');
    await page.getByLabel(/^City/).fill('Austin');
    await page.getByLabel(/^State/).selectOption('TX');
    await page.getByLabel(/^ZIP code/).fill('73301');
    const placed = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/orders' && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Place order · $27.00' }).click();
    check((await placed).status() === 201, 'MEMBER_ORDER_STATUS');
    const found = (await page.getByRole('status').filter({ hasText: 'is confirmed' }).innerText()).match(ORDER_NUMBER)?.[0];
    check(found, 'MEMBER_ORDER_CONFIRMED');
    orderNumber = found;
  });

  await test.step('order appears in history and detail', async () => {
    await page.getByRole('link', { name: 'View order history' }).click();
    await page.getByRole('heading', { level: 1, name: 'Order history' }).waitFor();
    await page.getByRole('link', { name: new RegExp(orderNumber) }).click();
    await page.getByRole('heading', { level: 1, name: `Order ${orderNumber}` }).waitFor();
    check(await page.getByText('Austin, TX 73301').isVisible(), 'ORDER_DETAIL');
    check(await page.getByRole('button', { name: 'Cart, 0 items' }).isVisible(), 'SERVER_CART_EMPTIED');
  });
});
