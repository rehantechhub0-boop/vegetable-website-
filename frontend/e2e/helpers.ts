/**
 * E2E test helpers and shared constants for the vegetable ordering site.
 * All tests use the isolated test.db backend on port 5001.
 */
import { type Page, expect } from '@playwright/test';

// ── Known test-db data (seed IDs, never change without updating test.db) ───
export const VEGETABLES = {
  aloo: {
    id: 'd3ae9806-f0e9-4225-b2e0-4446f4a60d81',
    name: 'Aloo (Farm Fresh Potatoes)',
    slug: 'aloo-potatoes',
    pricePerKg: 120,
  },
  tamatar: {
    id: '6da11aac-5825-4562-9048-ba496c7ac54f',
    name: 'Tamatar (Fresh Red Tomatoes)',
    slug: 'tamatar-red-tomatoes',
    pricePerKg: 180,
  },
  bhindi: {
    id: 'c3283597-4651-4956-a7a6-a9e23ecd2b28',
    name: 'Bhindi (Tender Lady Finger / Okra)',
    slug: 'bhindi-lady-finger',
    pricePerKg: 240,
  },
} as const;

export const ZONES = {
  testOpen: {
    id: '36cd5a71-1bdb-4837-a805-12c215ca12d2',
    areaName: 'Test Open Delivery Zone',
    deliveryFee: 50,
    minOrderAmount: 0,
  },
  cityCenter: {
    id: '130c6497-4a7a-4036-a2c5-b82dbcb87472',
    areaName: 'Muzaffargarh City Center',
    deliveryFee: 80,
    minOrderAmount: 300,
  },
} as const;

// ── Guest customer fixture (unique per test run to avoid conflicts) ─────────
export function guestCustomer(suffix: string) {
  return {
    name: `E2E Guest ${suffix}`,
    phone: '03001234567',
    address: '123 Test Street, Muzaffargarh',
  };
}

// ── Navigate with SPA-aware pushState ──────────────────────────────────────
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// ── Wait for the page to finish loading vegetables ─────────────────────────
export async function waitForVegetables(page: Page) {
  await expect(page.locator('.product-card, [class*="product-card"]').first()).toBeVisible({ timeout: 15000 });
}

// ── Add a vegetable to cart via the Vegetables page ───────────────────────
export async function addVegToCart(page: Page, vegName: string, weightLabel = '1kg') {
  await navigateTo(page, '/vegetables');
  await waitForVegetables(page);

  // Find the specific card
  const card = page.locator('.product-card, [class*="product-card"]').filter({ hasText: vegName }).first();
  await expect(card).toBeVisible({ timeout: 10000 });

  // Click the weight button
  const weightBtn = card.locator('button').filter({ hasText: weightLabel }).first();
  if (await weightBtn.count() > 0) {
    await weightBtn.click();
  }

  // Click Add to Cart
  const addBtn = card.locator('button').filter({ hasText: /add to cart/i }).first();
  await addBtn.click();

  // Wait for toast or cart badge to update
  await page.waitForTimeout(600);
}

// ── Fill and submit the checkout form ──────────────────────────────────────
export async function fillCheckout(
  page: Page,
  customer: { name: string; phone: string; address: string },
  zoneName = 'Test Open Delivery Zone'
) {
  await navigateTo(page, '/checkout');
  await expect(page.locator('h1').filter({ hasText: /checkout/i })).toBeVisible({ timeout: 10000 });

  // Fill Name
  const nameInput = page.locator('#checkout-name, input[placeholder*="name"], input[id*="name"]').first();
  await nameInput.clear();
  await nameInput.fill(customer.name);

  // Fill Phone
  const phoneInput = page.locator('#checkout-phone, input[placeholder*="phone"], input[id*="phone"]').first();
  await phoneInput.clear();
  await phoneInput.fill(customer.phone);

  // Select Zone
  const zoneSelect = page.locator('select[id*="zone"], select[name*="zone"]').first();
  if (await zoneSelect.count() > 0) {
    await zoneSelect.selectOption({ label: zoneName });
  } else {
    // Try radio buttons or button-based zone selector
    const zoneOption = page.locator('button, label, [role="radio"]').filter({ hasText: zoneName }).first();
    if (await zoneOption.count() > 0) await zoneOption.click();
  }

  // Fill Address
  const addressInput = page.locator(
    '#checkout-address, textarea[placeholder*="address"], input[placeholder*="address"], textarea[id*="address"]'
  ).first();
  await addressInput.clear();
  await addressInput.fill(customer.address);
}

// ── Submit the checkout form ───────────────────────────────────────────────
export async function submitCheckout(page: Page) {
  const submitBtn = page.locator('#place-order-btn, button[type="submit"]').filter({ hasText: /place order|confirm/i }).first();
  await submitBtn.click();
}

// ── Wait for order success page ───────────────────────────────────────────
export async function waitForOrderSuccess(page: Page) {
  await expect(page).toHaveURL(/\/order-success/, { timeout: 15000 });
  await expect(page.locator('h1, [class*="success"]').filter({ hasText: /order|confirmed|success/i }).first())
    .toBeVisible({ timeout: 10000 });
}
