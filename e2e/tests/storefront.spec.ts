import { test } from '../support/fixtures';
import { check } from '../support/api';

// Storefront flow on the demonstration catalog (SF-06 to SF-08). No account or API write is involved.
test('E2E-16 browse, add to cart, check out and see the demo order confirmation', async ({ page }) => {
  await page.goto('/products?category=decor');
  await page.getByRole('heading', { level: 1, name: 'Decor' }).waitFor();
  await page.getByRole('link', { name: 'Stoneware Vase, Cream' }).click();
  await page.getByRole('heading', { level: 1, name: 'Stoneware Vase, Cream' }).waitFor();
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await page.getByRole('button', { name: 'Add to cart · $136.00' }).click();
  await page.getByRole('status').filter({ hasText: 'Stoneware Vase, Cream · Qty 2' }).waitFor();
  check(await page.getByRole('button', { name: 'Cart, 2 items' }).isVisible(), 'CART_COUNT');

  await page.getByRole('button', { name: 'Cart, 2 items' }).click();
  const drawer = page.getByRole('dialog', { name: /Your cart/ });
  await drawer.getByText('Your order ships free.').waitFor();
  await drawer.getByRole('link', { name: 'Check out · $136.00' }).click();

  await page.getByRole('heading', { level: 1, name: 'Checkout' }).waitFor();
  await page.getByRole('button', { name: 'Place demo order · $136.00' }).click();
  await page.getByText('Email address is required.').waitFor();
  check(await page.evaluate(() => document.activeElement?.id) === 'checkout-email', 'FOCUS_FIRST_INVALID');

  await page.getByLabel(/^Email address/).fill('e2e-storefront@example.com');
  await page.getByLabel(/^Full name/).fill('Storefront Tester');
  await page.getByLabel(/^Street address/).fill('1 Test Way');
  await page.getByLabel(/^City/).fill('Portland');
  await page.getByLabel(/^State/).selectOption('OR');
  await page.getByLabel(/^ZIP code/).fill('97201');
  await page.getByRole('button', { name: 'Place demo order · $136.00' }).click();

  await page.getByRole('heading', { name: 'Thank you, Storefront Tester.' }).waitFor();
  check(/Your demo order CF-\d{6} is confirmed\./.test(await page.getByRole('status').filter({ hasText: 'Your demo order' }).innerText()), 'ORDER_CONFIRMED');
  check(await page.getByRole('button', { name: 'Cart, 0 items' }).isVisible(), 'CART_EMPTIED');
});
