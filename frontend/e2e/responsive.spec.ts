/**
 * responsive.spec.ts
 * Responsive layout E2E tests across Desktop, Tablet, and Mobile viewports.
 * Tests that core UI elements are visible and functional at each breakpoint.
 *
 * Playwright projects (desktop-chrome, tablet, mobile) will run these in parallel.
 */
import { test, expect } from '@playwright/test';

/* ─── Test 1: Home page is usable on all viewport sizes ─────────────────── */
test('home page renders correctly', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Brand visible
  await expect(page.locator('.nav-brand-title').first()).toBeVisible({ timeout: 10000 });

  // Page has content
  const bodyText = await page.locator('body').textContent();
  expect(bodyText?.length).toBeGreaterThan(50);
});

/* ─── Test 2: Navigation is accessible ──────────────────────────────────── */
test('navigation is accessible and links work', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const viewport = page.viewportSize();
  const isMobile = viewport ? viewport.width < 768 : false;

  if (isMobile) {
    // On mobile, hamburger should be visible
    const menuBtn = page.locator('.mobile-toggle-btn, button[aria-label*="menu"], button[aria-label*="Menu"]').first();
    await expect(menuBtn).toBeVisible({ timeout: 8000 });

    // Click to open mobile nav
    await menuBtn.click();
    await page.waitForTimeout(400);

    // Mobile nav should open with links
    await expect(
      page.locator('.mobile-nav-link, .mobile-nav-list a').filter({ hasText: /vegetables/i }).first()
    ).toBeVisible({ timeout: 6000 });
  } else {
    // Desktop nav links should be visible
    await expect(
      page.locator('.nav-link, nav a').filter({ hasText: /vegetables/i }).first()
    ).toBeVisible({ timeout: 8000 });
  }
});

/* ─── Test 3: Vegetables page grid adapts to viewport ────────────────────── */
test('vegetables page shows grid of cards', async ({ page }) => {
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');

  // Cards must appear on all viewports
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  // Count cards
  const cardCount = await page.locator('.product-card').count();
  expect(cardCount).toBeGreaterThan(0);
});

/* ─── Test 4: Cart icon shows in header ─────────────────────────────────── */
test('cart button is visible in header', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Cart button — look for it by aria-label or text "Cart"
  const cartBtn = page.locator('button[aria-label*="Cart"], button').filter({ hasText: /^Cart$/ }).first();
  await expect(cartBtn).toBeVisible({ timeout: 8000 });
});

/* ─── Test 5: Cart page responsive layout ───────────────────────────────── */
test('cart page renders on all viewports', async ({ page }) => {
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  // Either empty cart message or cart items
  const body = await page.locator('body').textContent();
  expect(body?.length).toBeGreaterThan(50);

  // Page heading
  const heading = page.locator('h1, h2').filter({ hasText: /cart|your order|shopping/i }).first();
  await expect(heading).toBeVisible({ timeout: 10000 });
});

/* ─── Test 6: Checkout form is usable on all viewports ──────────────────── */
test('checkout page form is accessible', async ({ page }) => {
  // First add an item so cart is not empty
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const wBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await wBtn.count() > 0) await wBtn.click();
  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(600);

  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  // Form inputs visible
  await expect(page.locator('#customer-name')).toBeVisible({ timeout: 12000 });
  await expect(page.locator('#customer-phone')).toBeVisible();
  await expect(page.locator('#delivery-address')).toBeVisible();

  // Submit button visible
  await expect(page.locator('#place-order-btn')).toBeVisible({ timeout: 8000 });
});

/* ─── Test 7: Login page is responsive ──────────────────────────────────── */
test('login page is usable on all viewports', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#login-email')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#login-password')).toBeVisible();

  // Inputs should be clickable and typeable
  await page.locator('#login-email').click();
  await page.locator('#login-email').fill('test@test.com');

  const filledValue = await page.locator('#login-email').inputValue();
  expect(filledValue).toBe('test@test.com');
});

/* ─── Test 8: Track Order page is responsive ────────────────────────────── */
test('track order page is usable on all viewports', async ({ page }) => {
  await page.goto('/track-order');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1').filter({ hasText: /track/i })).toBeVisible({ timeout: 10000 });

  // Input for order number
  const input = page.locator('input').first();
  await expect(input).toBeVisible({ timeout: 8000 });
  await input.fill('MZG-123456');
  const val = await input.inputValue();
  expect(val).toContain('MZG-123456');
});

/* ─── Test 9: No horizontal scrollbar on mobile ─────────────────────────── */
test('no horizontal overflow on homepage', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const winWidth = await page.evaluate(() => window.innerWidth);

  // Allow 5px tolerance for scrollbars
  expect(docWidth).toBeLessThanOrEqual(winWidth + 5);
});

/* ─── Test 10: Key page titles are descriptive ───────────────────────────── */
test('pages have descriptive titles', async ({ page }) => {
  const pages = ['/', '/vegetables', '/login', '/track-order'];

  for (const path of pages) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    expect(title.length, `Expected ${path} to have a non-empty title`).toBeGreaterThan(3);
  }
});
