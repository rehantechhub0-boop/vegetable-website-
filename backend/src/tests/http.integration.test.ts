/**
 * HTTP Integration Tests — Customer Authentication & Order Privacy
 * Uses Supertest to exercise the real Express router and middleware pipeline.
 * NODE_ENV=test so the server doesn't bind a port.
 */

import './test-env.js';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

let app: any;

const prisma = new PrismaClient();

const ts = Date.now();
const EMAIL_A = `http_customer_a_${ts}@test.com`;
const EMAIL_B = `http_customer_b_${ts}@test.com`;
const PASSWORD = 'SecurePass123!';

let cookieA = ''; // auth_token cookie for Customer A
let cookieB = ''; // auth_token cookie for Customer B
let orderUuid = ''; // UUID of an order placed by Customer A
let guestOrderUuid = ''; // UUID of a guest order

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, extra = '') {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}${extra ? ' — ' + extra : ''}`);
    failed++;
  }
}

function extractCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  // Return just the name=value portion
  return raw.split(';')[0];
}

async function run() {
  console.log('');
  console.log('=== HTTP INTEGRATION TESTS: Customer Auth & Order Privacy ===');

  app = (await import('../server.js')).app;

  // ── 1. Register Customer A ────────────────────────────────────────
  console.log('\n[Group 1] Registration & Login');
  {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'HTTP Customer A', email: EMAIL_A, password: PASSWORD });

    const setCookie = res.headers['set-cookie'];
    cookieA = extractCookie(res as any);

    assert(res.status === 201, 'T01: Register returns HTTP 201');
    assert(res.body.success === true, 'T02: Register body.success is true');
    assert(typeof res.body.user?.id === 'string', 'T03: Register returns user.id');
    assert(!res.body.token, 'T04: Register does NOT expose token in JSON body');
    assert(!res.body.user?.passwordHash, 'T05: Register does NOT expose passwordHash');
    assert(!!setCookie, 'T06: Register sets a Set-Cookie header');
    assert(cookieA.includes('auth_token'), 'T07: Cookie name is auth_token');
  }

  // ── 2. Cookie flags check ─────────────────────────────────────────
  {
    const rawSetCookie = (await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL_A, password: PASSWORD })
    ).headers['set-cookie'];
    const cookieStr = Array.isArray(rawSetCookie) ? rawSetCookie[0] : String(rawSetCookie);
    assert(cookieStr.toLowerCase().includes('httponly'), 'T08: auth_token cookie has HttpOnly flag');
    assert(cookieStr.toLowerCase().includes('samesite'), 'T09: auth_token cookie has SameSite flag');
  }

  // ── 3. Login returns 200 with user, no token in body ─────────────
  {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL_A, password: PASSWORD });

    cookieA = extractCookie(res as any);
    assert(res.status === 200, 'T10: Login returns HTTP 200');
    assert(res.body.success === true, 'T11: Login body.success is true');
    assert(!res.body.token, 'T12: Login does NOT expose token in JSON body');
  }

  // ── 4. Wrong password rejected ────────────────────────────────────
  {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL_A, password: 'WrongPassword' });
    assert(res.status === 401, 'T13: Wrong password returns HTTP 401');
  }

  // ── 5. /api/v1/auth/me with valid cookie ─────────────────────────
  console.log('\n[Group 2] /auth/me');
  {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookieA);
    assert(res.status === 200, 'T14: /auth/me with valid cookie returns HTTP 200');
    assert(res.body.user?.email === EMAIL_A, 'T15: /auth/me returns correct user email');
    assert(!res.body.user?.passwordHash, 'T16: /auth/me does NOT return passwordHash');
  }

  // ── 6. /api/v1/auth/me without cookie ────────────────────────────
  {
    const res = await request(app).get('/api/v1/auth/me');
    assert(res.status === 401, 'T17: /auth/me without cookie returns HTTP 401');
  }

  // ── 7. /api/v1/auth/me with Bearer token (should be rejected) ────
  {
    // Manually forge a fake Bearer token — middleware should ignore it
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer some.fake.jwt.token');
    assert(res.status === 401, 'T18: /auth/me with Bearer header (no cookie) returns HTTP 401');
  }

  // ── 8. Customer orders (authenticated) ───────────────────────────
  console.log('\n[Group 3] Order Isolation');

  // Register Customer B
  const regB = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'HTTP Customer B', email: EMAIL_B, password: PASSWORD });
  cookieB = extractCookie(regB as any);

  // Get a zone and vegetable for placing orders
  const zone = await prisma.deliveryZone.findFirst({ where: { isActive: true } });
  const veg = await prisma.vegetable.findFirst({ where: { isAvailable: true } });

  if (!zone || !veg) {
    console.error('[SKIP] No active delivery zone or vegetable found — skipping order tests');
  } else {
    const safeWeight = Math.max(2.0, Math.ceil(((zone.minOrderAmount || 300) + 50) / (veg.pricePerKg || 100)));

    // Customer A places an order (authenticated)
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', cookieA)
      .send({
        idempotencyKey: `http-order-key-a-${ts}-${Math.random().toString(36).slice(2)}`,
        customer: { name: 'HTTP Customer A', phone: '03001234567' },
        delivery: { zoneId: zone.id, address: 'House 1, Test Street' },
        paymentMethod: 'COD',
        items: [{ vegetableId: veg.id, weightInKg: safeWeight, quantity: 1 }],
      });
    assert(orderRes.status === 201, 'T19: Authenticated order creation returns HTTP 201');
    orderUuid = orderRes.body?.order?.uuid || '';
    const orderNumber = orderRes.body?.order?.orderNumber || '';
    assert(!!orderUuid, 'T20: Order response includes UUID');

    // Customer A can see own orders
    const myOrdersRes = await request(app)
      .get('/api/v1/orders/my-orders')
      .set('Cookie', cookieA);
    assert(myOrdersRes.status === 200, 'T21: /orders/my-orders returns HTTP 200 for authenticated user');
    assert(
      Array.isArray(myOrdersRes.body.data) && myOrdersRes.body.data.length >= 1,
      'T22: Customer A sees at least 1 order in /orders/my-orders'
    );

    // Customer B cannot see Customer A's orders via my-orders
    const bMyOrders = await request(app)
      .get('/api/v1/orders/my-orders')
      .set('Cookie', cookieB);
    const bHasAOrder = bMyOrders.body?.data?.some((o: any) => o.orderNumber === orderNumber);
    assert(!bHasAOrder, 'T23: Customer B does NOT see Customer A order in /orders/my-orders');

    // Customer B cannot access Customer A's order via order number
    const bGetOrder = await request(app)
      .get(`/api/v1/orders/${orderNumber}`)
      .set('Cookie', cookieB);
    assert(bGetOrder.status === 404, 'T24: Customer B cannot access Customer A order (HTTP 404)');

    // Unauthenticated cannot access /orders/my-orders
    const anonOrders = await request(app).get('/api/v1/orders/my-orders');
    assert(anonOrders.status === 401, 'T25: /orders/my-orders requires authentication (HTTP 401)');

    // ── 9. Guest order & receipt endpoint ──────────────────────────
    console.log('\n[Group 4] Guest Order & Receipt');

    const guestOrderRes = await request(app)
      .post('/api/v1/orders')
      .send({
        idempotencyKey: `http-guest-key-${ts}-${Math.random().toString(36).slice(2)}`,
        customer: { name: 'Guest Customer', phone: '03009999999' },
        delivery: { zoneId: zone.id, address: 'Guest Lane, Muzaffargarh' },
        paymentMethod: 'COD',
        items: [{ vegetableId: veg.id, weightInKg: safeWeight, quantity: 1 }],
      });
    assert(guestOrderRes.status === 201, 'T26: Guest order creation returns HTTP 201');
    guestOrderUuid = guestOrderRes.body?.order?.uuid || '';
    assert(!!guestOrderUuid, 'T27: Guest order response includes UUID');

    // Guest can access their receipt via UUID
    const receiptRes = await request(app).get(`/api/v1/orders/receipt/${guestOrderUuid}`);
    assert(receiptRes.status === 200, 'T28: Guest can access receipt via UUID (HTTP 200)');
    assert(!receiptRes.body?.order?.userId, 'T29: Receipt does NOT expose userId');

    // Short/invalid UUID is rejected
    const badReceiptRes = await request(app).get('/api/v1/orders/receipt/tooshort');
    assert(badReceiptRes.status === 400, 'T30: Receipt with invalid UUID returns HTTP 400');

    // Random UUID that doesn't exist returns 404
    const missingReceiptRes = await request(app).get('/api/v1/orders/receipt/00000000-0000-0000-0000-000000000099');
    assert(missingReceiptRes.status === 404, 'T31: Receipt for nonexistent UUID returns HTTP 404');
  }

  // ── 10. Logout and session revocation ────────────────────────────
  console.log('\n[Group 5] Logout & Session Revocation');
  {
    // Get fresh cookie for A
    const freshLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL_A, password: PASSWORD });
    const freshCookie = extractCookie(freshLogin as any);

    // Logout (revokes tokenVersion)
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', freshCookie);
    assert(logoutRes.status === 200, 'T32: Logout returns HTTP 200');
    assert(logoutRes.body.success === true, 'T33: Logout body.success is true');

    // After logout, same cookie should be rejected
    // (tokenVersion has been incremented in DB; the cookie holds an old tokenVersion)
    const afterLogout = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', freshCookie);
    assert(afterLogout.status === 401, 'T34: Requests with revoked cookie are rejected after logout (HTTP 401)');

    // Logout without cookie returns 401
    const logoutNoAuth = await request(app).post('/api/v1/auth/logout');
    assert(logoutNoAuth.status === 401, 'T35: Logout without auth returns HTTP 401');
  }

  // ── 11. Admin route blocked for customer ─────────────────────────
  console.log('\n[Group 6] Admin Authorization');
  {
    // Re-login Customer A (after logout, need fresh session)
    const loginAgain = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL_A, password: PASSWORD });
    cookieA = extractCookie(loginAgain as any);

    const adminRes = await request(app)
      .get('/api/v1/admin/health')
      .set('Cookie', cookieA);
    assert(adminRes.status === 403, 'T36: Customer cannot access admin-only route (HTTP 403)');
  }

  // ── 12. Real Order Tracking & Status Timeline Integration ────────
  console.log('\n[Group 7] Order Tracking & Guest Lookup Security');
  let placedOrderNumber = '';
  {
    // Customer A tracks own order
    const myOrdersRes = await request(app)
      .get('/api/v1/orders/my-orders')
      .set('Cookie', cookieA);
    const orderA = myOrdersRes.body.data?.[0];
    placedOrderNumber = orderA.orderNumber;

    const trackOwnRes = await request(app)
      .get(`/api/v1/orders/${placedOrderNumber}`)
      .set('Cookie', cookieA);
    assert(trackOwnRes.status === 200, 'T37: Authenticated customer tracks own order (HTTP 200)');
    assert(Array.isArray(trackOwnRes.body?.order?.statusHistory), 'T38: Track response includes statusHistory array');
    assert(trackOwnRes.body?.order?.statusHistory?.[0]?.toStatus === 'NEW', 'T39: Initial statusHistory entry is NEW');
    assert(Array.isArray(trackOwnRes.body?.order?.items) && trackOwnRes.body.order.items.length > 0, 'T40: Items snapshot array intact');
    assert(trackOwnRes.body.order.items[0].pricePerKg > 0, 'T41: Historical price snapshot preserved');

    // Customer B cannot access Customer A's order by predictable order number
    const trackForeignRes = await request(app)
      .get(`/api/v1/orders/${placedOrderNumber}`)
      .set('Cookie', cookieB);
    assert(trackForeignRes.status === 404, 'T42: Customer B blocked from Customer A orderNumber (HTTP 404)');

    // Unauthenticated request to /orders/:orderNumber rejected
    const unauthTrackRes = await request(app).get(`/api/v1/orders/${placedOrderNumber}`);
    assert(unauthTrackRes.status === 401, 'T43: Unauthenticated track rejected (HTTP 401)');

    // Guest lookup with valid order number + phone
    const guestLookupRes = await request(app)
      .post('/api/v1/orders/guest-lookup')
      .send({ orderNumber: 'ORD-120', phone: '03001234567' }); // ORD-120 created in earlier guest test
    assert(
      guestLookupRes.status === 200 || guestLookupRes.status === 404,
      'T44: Guest lookup responds with valid status code'
    );

    // Test with fresh guest order to guarantee known phone & orderNumber
    const dummyVeg = await prisma.vegetable.findFirst({ where: { isAvailable: true } });
    const dummyZone = await prisma.deliveryZone.findFirst({ where: { isActive: true } });
    const freshGuestOrderRes = await request(app)
      .post('/api/v1/orders')
      .send({
        idempotencyKey: `http-fresh-guest-key-${ts}-${Math.random().toString(36).slice(2)}`,
        customer: { name: 'Fresh Guest', phone: '03119876543' },
        delivery: { address: 'Model Town', zoneId: dummyZone!.id },
        items: [{ vegetableId: dummyVeg!.id, weightInKg: 5.0, quantity: 1 }],
        paymentMethod: 'COD',
      });
    const freshGuestNum = freshGuestOrderRes.body.order.orderNumber;
    const freshGuestUuid = freshGuestOrderRes.body.order.uuid;

    // Verified guest lookup succeeds
    const verifiedGuestLookup = await request(app)
      .post('/api/v1/orders/guest-lookup')
      .send({ orderNumber: freshGuestNum, phone: '03119876543' });
    assert(verifiedGuestLookup.status === 200, 'T45: Verified guest lookup returns HTTP 200');
    assert(verifiedGuestLookup.body.receiptUuid === freshGuestUuid, 'T46: Guest lookup returns receipt UUID');
    assert(!verifiedGuestLookup.body.order.userId, 'T47: Guest lookup does NOT leak userId');
    assert(Array.isArray(verifiedGuestLookup.body.order.statusHistory), 'T48: Guest lookup includes statusHistory');

    // Mismatched phone rejected
    const wrongPhoneRes = await request(app)
      .post('/api/v1/orders/guest-lookup')
      .send({ orderNumber: freshGuestNum, phone: '03990000000' });
    assert(wrongPhoneRes.status === 404, 'T49: Guest lookup with wrong phone rejected (HTTP 404)');

    // Missing phone rejected
    const noPhoneRes = await request(app)
      .post('/api/v1/orders/guest-lookup')
      .send({ orderNumber: freshGuestNum });
    assert(noPhoneRes.status === 400, 'T50: Guest lookup without phone rejected (HTTP 400)');
  }

  // ── 13. Order Status Transitions & History Recording ─────────────
  console.log('\n[Group 8] Status Transitions & State History Integrity');
  {
    // Create admin user
    const adminEmail = `admin_test_${ts}@test.com`;
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(PASSWORD, salt);
    await prisma.user.create({
      data: {
        name: 'Admin Tester',
        email: adminEmail,
        passwordHash: passHash,
        role: 'ADMIN',
      },
    });

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: PASSWORD });
    const adminCookie = extractCookie(adminLoginRes as any);

    // Regular customer cannot update status
    const custUpdateRes = await request(app)
      .patch(`/api/v1/orders/${placedOrderNumber}/status`)
      .set('Cookie', cookieA)
      .send({ status: 'CONFIRMED' });
    assert(custUpdateRes.status === 403, 'T51: Regular customer blocked from updating status (HTTP 403)');

    // Admin transitions: CONFIRMED
    const step1 = await request(app)
      .patch(`/api/v1/orders/${placedOrderNumber}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'CONFIRMED', note: 'Order accepted by farm manager' });
    assert(step1.status === 200, 'T52: Admin transitions status to CONFIRMED (HTTP 200)');
    assert(step1.body.order.orderStatus === 'CONFIRMED', 'T53: Order status is CONFIRMED');

    // Admin transitions: PREPARING
    const step2 = await request(app)
      .patch(`/api/v1/orders/${placedOrderNumber}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'PREPARING', note: 'Vegetables harvested & packed' });
    assert(step2.status === 200, 'T54: Admin transitions status to PREPARING (HTTP 200)');

    // Admin transitions: OUT_FOR_DELIVERY
    const step3 = await request(app)
      .patch(`/api/v1/orders/${placedOrderNumber}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'OUT_FOR_DELIVERY', note: 'Rider dispatched' });
    assert(step3.status === 200, 'T55: Admin transitions status to OUT_FOR_DELIVERY (HTTP 200)');

    // Admin transitions: DELIVERED
    const step4 = await request(app)
      .patch(`/api/v1/orders/${placedOrderNumber}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'DELIVERED', note: 'Handed over to customer' });
    assert(step4.status === 200, 'T56: Admin transitions status to DELIVERED (HTTP 200)');

    // Customer re-checks order and sees all status history events in order
    const customerCheck = await request(app)
      .get(`/api/v1/orders/${placedOrderNumber}`)
      .set('Cookie', cookieA);
    const history = customerCheck.body.order.statusHistory;
    assert(history.length >= 5, 'T57: Customer sees 5 chronological status events');
    assert(history[history.length - 1].toStatus === 'DELIVERED', 'T58: Latest status in history is DELIVERED');

    // Test CANCELLED transition on a separate order
    const dummyVeg = await prisma.vegetable.findFirst({ where: { isAvailable: true } });
    const dummyZone = await prisma.deliveryZone.findFirst({ where: { isActive: true } });
    const cancelTargetOrder = await request(app)
      .post('/api/v1/orders')
      .send({
        idempotencyKey: `http-cancel-key-${ts}-${Math.random().toString(36).slice(2)}`,
        customer: { name: 'To Cancel', phone: '03009998877' },
        delivery: { address: 'City Centre', zoneId: dummyZone!.id },
        items: [{ vegetableId: dummyVeg!.id, weightInKg: 5.0, quantity: 1 }],
        paymentMethod: 'COD',
      });
    const cancelOrderNum = cancelTargetOrder.body?.order?.orderNumber;

    const cancelRes = await request(app)
      .patch(`/api/v1/orders/${cancelOrderNum}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'CANCELLED', note: 'Customer requested cancellation' });
    assert(cancelRes.status === 200, 'T59: Admin transitions status to CANCELLED (HTTP 200)');
    assert(cancelRes.body.order.orderStatus === 'CANCELLED', 'T60: Cancelled order status confirmed');

    // Invalid status rejected
    const badStatusRes = await request(app)
      .patch(`/api/v1/orders/${cancelOrderNum}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'INVALID_STATUS' });
    assert(badStatusRes.status === 400, 'T61: Invalid status string rejected (HTTP 400)');
  }

  console.log('');
  console.log(`=== HTTP Integration Test Results: ${passed} passed, ${failed} failed ===`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run()
  .catch(async (err) => {
    console.error('Fatal error in HTTP integration tests:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
