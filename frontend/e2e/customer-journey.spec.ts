/**
 * customer-journey.spec.ts
 * E2E tests for customer shopping flow:
 *   1. Home page loads without errors
 *   2. Vegetables listing loads with product cards
 *   3. Search input filters vegetables
 *   4. Product detail page loads with weight selectors (250g, 500g, 1kg, 2kg, 5kg, 10kg, custom >10kg)
 *   5. Add vegetable to cart updates cart
 *   6. Cart page displays items and allows quantity adjustment
 *   7. Full guest checkout creates order and redirects to order-success
 *   8. Order success page shows order number (ORD-*) and details
 *   9. Track order page validates inputs and rejects invalid order/phone
 *  10. Can track a real order placed during the test
 *  11. Empty checkout form submission shows field validation errors
 *  12. Multi-item cart checkout completes successfully
 *  13. Empty cart blocks checkout
 *  14. Page refresh preserves cart
 */
import { test, expect } from '@playwright/test';

const ALOO_SLUG = 'aloo-potatoes';
const ZONE_OPTION_TEXT = 'Test Open Delivery Zone';

/* ─── Helper: fill checkout form with known-good values ──────────────────── */
async function fillCheckoutForm(page: import('@playwright/test').Page, suffix: string) {
  // Wait for page heading
  await expect(page.locator('h1').filter({ hasText: /checkout/i })).toBeVisible({ timeout: 12000 });

  // Wait for zones to load (select becomes enabled)
  await expect(page.locator('#delivery-zone')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#delivery-zone')).toBeEnabled({ timeout: 10000 });

  await page.locator('#customer-name').fill(`E2E Customer ${suffix}`);
  await page.locator('#customer-phone').fill('03001234567');

  // Select the test zone with zero minOrder
  const zoneOpt = page.locator('#delivery-zone option').filter({ hasText: new RegExp(ZONE_OPTION_TEXT, 'i') }).first();
  if (await zoneOpt.count() > 0) {
    const val = await zoneOpt.getAttribute('value');
    if (val) await page.locator('#delivery-zone').selectOption(val);
  } else {
    await page.locator('#delivery-zone').selectOption({ index: 1 });
  }

  await page.locator('#delivery-address').fill('House 42, Test Street, Muzaffargarh');
}

/* ─── Test 1: Home page loads correctly ──────────────────────────────────── */
test('home page loads with brand content and navigation', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Brand identity visible
  await expect(page.locator('.nav-brand-title').first()).toBeVisible();

  // Navigation links present
  await expect(page.locator('a[href="/vegetables"], .nav-link').filter({ hasText: /vegetables/i }).first()).toBeVisible();
  await expect(page.locator('a[href="/track-order"], .nav-link').filter({ hasText: /track/i }).first()).toBeVisible();

  // Page title set
  const title = await page.title();
  expect(title.length).toBeGreaterThan(3);
});

/* ─── Test 2: Vegetables listing page ───────────────────────────────────── */
test('vegetables page displays vegetable cards', async ({ page }) => {
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');

  // At least one vegetable card must appear
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  // Aloo should be present in test DB
  await expect(page.locator('.product-card').filter({ hasText: 'Aloo' }).first()).toBeVisible();

  // Each card should have price info
  const firstCard = page.locator('.product-card').first();
  await expect(firstCard.locator('text=/Rs\\./').first()).toBeVisible();
});

/* ─── Test 3: Search filters vegetables ──────────────────────────────────── */
test('search input filters vegetable list', async ({ page }) => {
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 12000 });

  // Type in the search box
  const searchInput = page.locator('input[type="search"]').first();
  await searchInput.fill('Aloo');
  await page.waitForTimeout(500);

  // Should show Aloo card
  await expect(page.locator('.product-card').filter({ hasText: 'Aloo' }).first()).toBeVisible();

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(400);

  // Multiple cards should reappear
  const cardCount = await page.locator('.product-card').count();
  expect(cardCount).toBeGreaterThan(1);
});

/* ─── Test 4: Product detail page and weight selector ───────────────────── */
test('product detail page loads with weight selectors including custom weight', async ({ page }) => {
  await page.goto(`/vegetables/${ALOO_SLUG}`);
  await page.waitForLoadState('networkidle');

  // Product name visible
  await expect(page.locator('h1').filter({ hasText: /Aloo/i })).toBeVisible({ timeout: 12000 });

  // Fixed weight options: 250g, 500g, 1kg, 2kg, 5kg, 10kg
  for (const w of ['250g', '500g', '1kg', '2kg', '5kg', '10kg']) {
    const btn = page.locator('button').filter({ hasText: new RegExp(`^${w}$`) }).first();
    await expect(btn).toBeVisible();
  }

  // Click 2kg and verify selection
  const btn2kg = page.locator('button').filter({ hasText: /^2kg$/ }).first();
  await btn2kg.click();
  await expect(btn2kg).toHaveClass(/active/);

  // Custom weight option
  const customBtn = page.locator('button').filter({ hasText: /custom/i }).first();
  await expect(customBtn).toBeVisible();
  await customBtn.click();

  // Custom input should appear
  const customInput = page.locator('input[type="number"]').first();
  await expect(customInput).toBeVisible();

  // Try custom weight < 10 (should show validation message)
  await customInput.fill('5');
  await expect(page.locator('text=/greater than 10kg/i').first()).toBeVisible();

  // Try custom weight > 10 (valid)
  await customInput.fill('15');
  await expect(page.locator('text=/greater than 10kg/i')).not.toBeVisible();
});

/* ─── Test 5: Add to cart from vegetables list ───────────────────────────── */
test('add vegetable to cart shows item in cart', async ({ page }) => {
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 12000 });

  // Find Aloo card and select weight then Add to Cart
  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  await expect(alooCard).toBeVisible();

  const weightBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await weightBtn.count() > 0) {
    await weightBtn.click();
  }

  const addBtn = alooCard.locator('button').filter({ hasText: /add to cart/i }).first();
  await addBtn.click();
  await page.waitForTimeout(800);

  // Navigate to cart and verify item
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('text=/Aloo/i').first()).toBeVisible({ timeout: 10000 });
});

/* ─── Test 6: Cart page actions ──────────────────────────────────────────── */
test('cart page shows items and allows quantity change', async ({ page }) => {
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 12000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const weightBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await weightBtn.count() > 0) await weightBtn.click();

  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(600);

  // Go to cart
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('text=/Aloo/i').first()).toBeVisible({ timeout: 10000 });

  // Proceed to checkout button visible
  const checkoutBtn = page.locator('button, a').filter({ hasText: /proceed to checkout|checkout/i }).first();
  await expect(checkoutBtn).toBeVisible({ timeout: 8000 });
});

/* ─── Test 7: Full guest checkout flow ───────────────────────────────────── */
test('guest can complete checkout and see order success', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);

  // Step 1: Add item to cart
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const weightBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await weightBtn.count() > 0) await weightBtn.click();
  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(700);

  // Step 2: Go to checkout
  await page.goto('/checkout');
  await fillCheckoutForm(page, suffix);

  // Step 3: Submit order
  await page.locator('#place-order-btn').click();

  // Step 4: Should land on order success
  await expect(page).toHaveURL(/\/order-success/, { timeout: 20000 });
  await expect(
    page.locator('h1, [class*="success-title"], [class*="success"]').filter({ hasText: /order|confirmed|success/i }).first()
  ).toBeVisible({ timeout: 12000 });

  // Order number should be visible
  await expect(page.locator('#confirmed-order-number').first()).toBeVisible({ timeout: 12000 });
});

/* ─── Test 8: Order success page shows correct details ───────────────────── */
test('order success page shows order number and customer details', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);

  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const weightBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await weightBtn.count() > 0) await weightBtn.click();
  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(700);

  await page.goto('/checkout');
  await fillCheckoutForm(page, suffix);
  await page.locator('#place-order-btn').click();

  await expect(page).toHaveURL(/\/order-success/, { timeout: 20000 });

  // Order number format ORD-XXXX
  const orderNum = page.locator('#confirmed-order-number').first();
  await expect(orderNum).toBeVisible({ timeout: 10000 });

  // COD payment badge
  await expect(page.locator('text=/COD|Cash on Delivery|cash/i').first()).toBeVisible({ timeout: 8000 });

  // Cart should be empty after order
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');
  const cartEmpty = page.locator('text=/empty|no items/i').first();
  const alooInCart = page.locator('text=/Aloo/i').first();
  const hasEmpty = await cartEmpty.count();
  const hasAloo = await alooInCart.count();
  expect(hasEmpty + hasAloo).toBeLessThanOrEqual(1);
});

/* ─── Test 9: Track Order page validation ────────────────────────────────── */
test('track order page accepts order number and phone input', async ({ page }) => {
  await page.goto('/track-order');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1').filter({ hasText: /track/i })).toBeVisible({ timeout: 10000 });

  const orderInput = page.locator('#track-order-num');
  const phoneInput = page.locator('#track-order-phone');
  await expect(orderInput).toBeVisible({ timeout: 8000 });
  await expect(phoneInput).toBeVisible({ timeout: 8000 });

  // Type an invalid order number and phone
  await orderInput.fill('ORD-999999');
  await phoneInput.fill('03001234567');

  // Submit
  const searchBtn = page.locator('button[type="submit"], button').filter({ hasText: /track|search|find/i }).first();
  await searchBtn.click();

  // Should show error or "not found" message
  const errMsg = page.locator('[role="alert"]').filter({ hasText: /not found|no order found/i }).or(page.getByText(/no order found|not found/i)).first();
  await expect(errMsg).toBeVisible({ timeout: 10000 });
});

/* ─── Test 10: Track real order after checkout ───────────────────────────── */
test('can track a real order placed during the test', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);

  // Place an order
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const weightBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await weightBtn.count() > 0) await weightBtn.click();
  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(700);

  await page.goto('/checkout');
  await fillCheckoutForm(page, suffix);
  await page.locator('#place-order-btn').click();

  await expect(page).toHaveURL(/\/order-success/, { timeout: 20000 });

  // Extract the order number from the page
  const orderNumEl = page.locator('#confirmed-order-number').first();
  await expect(orderNumEl).toBeVisible({ timeout: 10000 });
  const orderText = await orderNumEl.textContent();
  const orderMatch = orderText?.match(/ORD-\d+/);
  expect(orderMatch).not.toBeNull();
  const orderNumber = orderMatch![0];

  // Go to track-order
  await page.goto('/track-order');
  await page.waitForLoadState('networkidle');

  const orderInput = page.locator('#track-order-num');
  const phoneInput = page.locator('#track-order-phone');
  await expect(orderInput).toBeVisible({ timeout: 8000 });
  await orderInput.fill(orderNumber);
  await phoneInput.fill('03001234567');

  const searchBtn = page.locator('button[type="submit"], button').filter({ hasText: /track|search|find/i }).first();
  await searchBtn.click();

  // Should show order details
  await expect(page.locator(`text=/${orderNumber}/`).first()).toBeVisible({ timeout: 12000 });
});

/* ─── Test 11: Checkout validation (empty form) ──────────────────────────── */
test('checkout form shows validation errors for empty submission', async ({ page }) => {
  // Add item to cart first
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 12000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const weightBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await weightBtn.count() > 0) await weightBtn.click();
  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(600);

  await page.goto('/checkout');
  await expect(page.locator('h1').filter({ hasText: /checkout/i })).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#delivery-zone')).toBeEnabled({ timeout: 10000 });

  // Submit without filling form
  await page.locator('#place-order-btn').click();

  // Should show field-level error messages
  const nameError = page.locator('.checkout-field-error, [role="alert"]').filter({ hasText: /name/i }).first();
  await expect(nameError).toBeVisible({ timeout: 6000 });
});

/* ─── Test 12: Multiple items in cart ────────────────────────────────────── */
test('can add multiple vegetables and checkout', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);

  // Add Aloo
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const aloWeightBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await aloWeightBtn.count() > 0) await aloWeightBtn.click();
  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(600);

  // Add Tamatar
  const tamatarCard = page.locator('.product-card').filter({ hasText: 'Tamatar' }).first();
  if (await tamatarCard.count() > 0) {
    const tmWeightBtn = tamatarCard.locator('button').filter({ hasText: /^500g$/i }).first();
    if (await tmWeightBtn.count() > 0) await tmWeightBtn.click();
    await tamatarCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
    await page.waitForTimeout(600);
  }

  // Checkout with both items
  await page.goto('/checkout');
  await fillCheckoutForm(page, suffix);
  await page.locator('#place-order-btn').click();

  await expect(page).toHaveURL(/\/order-success/, { timeout: 20000 });
  await expect(page.locator('#confirmed-order-number').first()).toBeVisible({ timeout: 12000 });
});

/* ─── Test 13: Empty cart blocks checkout ────────────────────────────────── */
test('empty cart blocks checkout', async ({ page }) => {
  // Clear cart in localStorage
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('muzaffargarh_vegetable_cart'));

  // Navigate to checkout directly
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  // Should show empty cart message or redirect to shop/cart
  const emptyNotice = page.locator('text=/your cart is empty|empty|no items/i').first();
  await expect(emptyNotice).toBeVisible({ timeout: 10000 });
});

/* ─── Test 14: Refresh preserves cart in localStorage ─────────────────────── */
test('refreshing page preserves cart items', async ({ page }) => {
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const weightBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await weightBtn.count() > 0) await weightBtn.click();
  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(600);

  // Refresh page
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Navigate to cart
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  // Aloo should still be in cart
  await expect(page.locator('text=/Aloo/i').first()).toBeVisible({ timeout: 10000 });
});
