/**
 * idempotency-stale.spec.ts
 * E2E tests for:
 *   - Idempotency: placing an order twice with the same key returns same order
 *   - Stale cart: price-change review panel appears and confirmation re-orders
 *
 * These tests call the backend API directly (not through UI) for precise control.
 * All requests go to http://localhost:5001 (test.db).
 */
import { test, expect, request } from '@playwright/test';

const API_BASE = 'http://localhost:5001';

// Known test.db IDs
const ALOO_ID = 'd3ae9806-f0e9-4225-b2e0-4446f4a60d81';
const TEST_ZONE_ID = '36cd5a71-1bdb-4837-a805-12c215ca12d2';

function makeKey(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makePayload(idempotencyKey: string, overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey,
    customer: {
      name: `E2E Idem Test ${Date.now()}`,
      phone: '03001234567',
    },
    delivery: {
      zoneId: TEST_ZONE_ID,
      address: '123 Idempotency Test Street, Muzaffargarh',
      notes: null,
    },
    paymentMethod: 'COD',
    items: [
      {
        vegetableId: ALOO_ID,
        weightInKg: 1,
        weightDisplay: '1kg',
        quantity: 1,
        expectedPricePerKg: 120,
      },
    ],
    ...overrides,
  };
}

/* ─── Test 1: Single order creation succeeds ─────────────────────────────── */
test('POST /orders creates order with valid payload', async () => {
  const ctx = await request.newContext({ baseURL: API_BASE });
  const key = makeKey();

  const res = await ctx.post('/api/v1/orders', { data: makePayload(key) });
  expect(res.status()).toBe(201);

  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.order).toBeDefined();
  expect(body.order.orderNumber).toMatch(/^ORD-/);
  expect(body.order.paymentMethod).toBe('COD');

  await ctx.dispose();
});

/* ─── Test 2: Idempotency replay returns same order ─────────────────────── */
test('duplicate order with same idempotency key returns the same order', async () => {
  const ctx = await request.newContext({ baseURL: API_BASE });
  const key = makeKey();
  const payload = makePayload(key);

  // First request
  const res1 = await ctx.post('/api/v1/orders', { data: payload });
  expect(res1.status()).toBe(201);
  const body1 = await res1.json();
  const orderId1 = body1.order.id;
  const orderNum1 = body1.order.orderNumber;

  // Second request with SAME key
  const res2 = await ctx.post('/api/v1/orders', { data: payload });
  const body2 = await res2.json();

  // Should succeed (200 or 201) and return SAME order
  expect([200, 201]).toContain(res2.status());
  expect(body2.success).toBe(true);
  expect(body2.order.id).toBe(orderId1);
  expect(body2.order.orderNumber).toBe(orderNum1);

  await ctx.dispose();
});

/* ─── Test 3: Different key creates different order ──────────────────────── */
test('different idempotency keys create separate orders', async () => {
  const ctx = await request.newContext({ baseURL: API_BASE });

  const key1 = makeKey();
  const key2 = makeKey();

  const res1 = await ctx.post('/api/v1/orders', { data: makePayload(key1) });
  const res2 = await ctx.post('/api/v1/orders', { data: makePayload(key2) });

  expect(res1.status()).toBe(201);
  expect(res2.status()).toBe(201);

  const body1 = await res1.json();
  const body2 = await res2.json();

  expect(body1.order.id).not.toBe(body2.order.id);
  expect(body1.order.orderNumber).not.toBe(body2.order.orderNumber);

  await ctx.dispose();
});

/* ─── Test 4: Missing idempotency key is rejected ────────────────────────── */
test('order without idempotency key is rejected with 400', async () => {
  const ctx = await request.newContext({ baseURL: API_BASE });

  const payload = makePayload('');
  delete (payload as Record<string, unknown>).idempotencyKey;

  const res = await ctx.post('/api/v1/orders', { data: payload });
  expect(res.status()).toBe(400);

  const body = await res.json();
  expect(body.success).toBe(false);

  await ctx.dispose();
});

/* ─── Test 5: Empty idempotency key is rejected ──────────────────────────── */
test('order with empty idempotency key is rejected', async () => {
  const ctx = await request.newContext({ baseURL: API_BASE });

  const res = await ctx.post('/api/v1/orders', { data: makePayload('') });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.success).toBe(false);

  await ctx.dispose();
});

/* ─── Test 6: Stale price detection returns PRICE_CHANGED ────────────────── */
test('submitting wrong price returns PRICE_CHANGED 409', async () => {
  const ctx = await request.newContext({ baseURL: API_BASE });
  const key = makeKey();

  // Aloo is 120/kg — send wrong price
  const payload = makePayload(key, {
    items: [
      {
        vegetableId: ALOO_ID,
        weightInKg: 1,
        weightDisplay: '1kg',
        quantity: 1,
        expectedPricePerKg: 9999, // Wrong price
      },
    ],
  });

  const res = await ctx.post('/api/v1/orders', { data: payload });
  expect(res.status()).toBe(409);

  const body = await res.json();
  expect(body.success).toBe(false);
  expect(body.code).toBe('PRICE_CHANGED');
  expect(Array.isArray(body.priceChanges)).toBe(true);
  expect(body.priceChanges.length).toBeGreaterThan(0);

  const change = body.priceChanges[0];
  expect(change.submittedPricePerKg).toBe(9999);
  expect(change.currentPricePerKg).toBe(120);
  expect(change.vegetableId).toBe(ALOO_ID);

  await ctx.dispose();
});

/* ─── Test 7: Price-change UI review panel (browser) ────────────────────── */
test('checkout UI shows price-change review panel on stale prices', async ({ page }) => {
  // Intercept the /api/v1/orders POST and mock a PRICE_CHANGED response
  await page.route('**/api/v1/orders', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'PRICE_CHANGED',
          error: 'Prices have changed since you added items to your cart',
          priceChanges: [
            {
              vegetableId: ALOO_ID,
              vegetableName: 'Aloo (Farm Fresh Potatoes)',
              submittedPricePerKg: 9999,
              currentPricePerKg: 120,
            },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Add item to cart
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const wBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await wBtn.count() > 0) await wBtn.click();
  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(600);

  // Go to checkout and fill form
  await page.goto('/checkout');
  await expect(page.locator('h1').filter({ hasText: /checkout/i })).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#delivery-zone')).toBeEnabled({ timeout: 10000 });

  await page.locator('#customer-name').fill('E2E Price Test User');
  await page.locator('#customer-phone').fill('03001234567');
  const zoneOpt1 = page.locator('#delivery-zone option').filter({ hasText: /Test Open Delivery Zone/i }).first();
  if (await zoneOpt1.count() > 0) {
    const val = await zoneOpt1.getAttribute('value');
    if (val) await page.locator('#delivery-zone').selectOption(val);
  } else {
    await page.locator('#delivery-zone').selectOption({ index: 1 });
  }
  await page.locator('#delivery-address').fill('123 Test St, Muzaffargarh');

  // Submit — mocked response will trigger price change panel
  await page.locator('#place-order-btn').click();

  // Price-change review panel should appear
  await expect(
    page.locator('.checkout-price-review-banner, [class*="price-review"]').filter({ hasText: /Prices have changed/i }).first()
  ).toBeVisible({ timeout: 10000 });

  // Should show old vs new price
  await expect(page.locator('text=/Aloo/').first()).toBeVisible();
});

/* ─── Test 8: Confirming price change proceeds to new order attempt ──────── */
test('confirming price change review triggers fresh order submission', async ({ page }) => {
  let requestCount = 0;

  // First call returns PRICE_CHANGED, second call returns success
  await page.route('**/api/v1/orders', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      requestCount++;
      if (requestCount === 1) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'PRICE_CHANGED',
            error: 'Prices have changed',
            priceChanges: [
              {
                vegetableId: ALOO_ID,
                vegetableName: 'Aloo (Farm Fresh Potatoes)',
                submittedPricePerKg: 9999,
                currentPricePerKg: 120,
              },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            order: {
              id: 9999,
              orderNumber: 'ORD-9999',
              uuid: 'test-uuid-e2e',
              orderStatus: 'NEW',
              paymentStatus: 'PENDING',
              paymentMethod: 'COD',
              subtotal: 120,
              deliveryFee: 50,
              grandTotal: 170,
              customerName: 'E2E Price Test User',
              customerPhone: '03001234567',
              deliveryZone: 'Test Open Delivery Zone',
              deliveryAddress: '123 Test St, Muzaffargarh',
              deliveryNotes: null,
              createdAt: new Date().toISOString(),
              items: [],
            },
          }),
        });
      }
    } else {
      await route.continue();
    }
  });

  // Set up cart and checkout
  await page.goto('/vegetables');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 });

  const alooCard = page.locator('.product-card').filter({ hasText: 'Aloo' }).first();
  const wBtn = alooCard.locator('button').filter({ hasText: /^1kg$/i }).first();
  if (await wBtn.count() > 0) await wBtn.click();
  await alooCard.locator('button').filter({ hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(600);

  await page.goto('/checkout');
  await expect(page.locator('#delivery-zone')).toBeEnabled({ timeout: 10000 });

  await page.locator('#customer-name').fill('E2E Price Test User');
  await page.locator('#customer-phone').fill('03001234567');
  const zoneOpt2 = page.locator('#delivery-zone option').filter({ hasText: /Test Open Delivery Zone/i }).first();
  if (await zoneOpt2.count() > 0) {
    const val = await zoneOpt2.getAttribute('value');
    if (val) await page.locator('#delivery-zone').selectOption(val);
  } else {
    await page.locator('#delivery-zone').selectOption({ index: 1 });
  }
  await page.locator('#delivery-address').fill('123 Test St, Muzaffargarh');

  // First submission — triggers price change panel
  await page.locator('#place-order-btn').click();
  await expect(
    page.locator('.checkout-price-review-banner, [class*="price-review"]').first()
  ).toBeVisible({ timeout: 10000 });

  // Confirm the price change
  const confirmBtn = page.locator('#confirm-price-change-btn, button:has-text("Confirm New Prices")').first();
  await expect(confirmBtn).toBeVisible({ timeout: 8000 });
  await confirmBtn.click();

  // Second submission — should succeed and navigate to order success
  await expect(page).toHaveURL(/\/order-success/, { timeout: 20000 });
  expect(requestCount).toBe(2);
});

/* ─── Test 9: Order without items is rejected ────────────────────────────── */
test('order with empty items array is rejected', async () => {
  const ctx = await request.newContext({ baseURL: API_BASE });
  const key = makeKey();

  const res = await ctx.post('/api/v1/orders', {
    data: {
      idempotencyKey: key,
      customer: { name: 'Test User', phone: '03001234567' },
      delivery: {
        zoneId: TEST_ZONE_ID,
        address: '123 Test Street',
        notes: null,
      },
      paymentMethod: 'COD',
      items: [],
    },
  });

  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.success).toBe(false);

  await ctx.dispose();
});

/* ─── Test 10: Order with invalid zone is rejected ───────────────────────── */
test('order with non-existent zone is rejected', async () => {
  const ctx = await request.newContext({ baseURL: API_BASE });
  const key = makeKey();

  const res = await ctx.post('/api/v1/orders', {
    data: makePayload(key, {
      delivery: {
        zoneId: '00000000-0000-0000-0000-000000000000',
        address: '123 Test Street',
        notes: null,
      },
    }),
  });

  expect([400, 404, 422]).toContain(res.status());
  const body = await res.json();
  expect(body.success).toBe(false);

  await ctx.dispose();
});
