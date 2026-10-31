/**
 * Admin Panel HTTP Integration Tests
 * Tests authentication, authorization, CRUD, and security for /api/v1/admin/*
 * NODE_ENV=test so the server doesn't bind a port.
 */

import './test-env.js';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

let app: any;

const prisma = new PrismaClient();

const ts = Date.now();
const ADMIN_EMAIL = `admin_test_${ts}@freshvegetables.pk`;
const CUSTOMER_EMAIL = `customer_test_${ts}@test.com`;
const PASSWORD = 'Admin@Test123!';

let adminCookie = '';
let customerCookie = '';
let adminUserId = '';
let customerUserId = '';
let testVegetableId = '';
let testDeliveryZoneId = '';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, extra = '') {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${label}${extra ? ' -- ' + extra : ''}`);
    failed++;
  }
}

function extractCookie(res: any): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return raw.split(';')[0];
}

async function setup() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const admin = await prisma.user.create({
    data: { name: 'Test Admin', email: ADMIN_EMAIL, passwordHash: hash, role: 'ADMIN' },
  });
  adminUserId = admin.id;

  const custHash = await bcrypt.hash(PASSWORD, 10);
  const cust = await prisma.user.create({
    data: { name: 'Test Customer', email: CUSTOMER_EMAIL, passwordHash: custHash, role: 'CUSTOMER' },
  });
  customerUserId = cust.id;
}

async function cleanup() {
  if (testVegetableId) {
    await prisma.vegetable.delete({ where: { id: testVegetableId } }).catch(() => {});
  }
  if (testDeliveryZoneId) {
    await prisma.deliveryZone.delete({ where: { id: testDeliveryZoneId } }).catch(() => {});
  }
  if (adminUserId) await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
  if (customerUserId) await prisma.user.delete({ where: { id: customerUserId } }).catch(() => {});
}

async function run() {
  console.log('');
  console.log('=== ADMIN PANEL INTEGRATION TESTS ===');

  app = (await import('../server.js')).app;
  await setup();

  // GROUP 1: Authentication & Authorization
  console.log('\n[Group 1] Authentication & Authorization');
  {
    const r1 = await request(app).get('/api/v1/admin/dashboard');
    assert(r1.status === 401, 'T01: Unauthenticated /admin/dashboard returns 401');
    const r2 = await request(app).get('/api/v1/admin/vegetables');
    assert(r2.status === 401, 'T02: Unauthenticated /admin/vegetables returns 401');
    const r3 = await request(app).get('/api/v1/admin/orders');
    assert(r3.status === 401, 'T03: Unauthenticated /admin/orders returns 401');
    const r4 = await request(app).get('/api/v1/admin/customers');
    assert(r4.status === 401, 'T04: Unauthenticated /admin/customers returns 401');
    const r5 = await request(app).get('/api/v1/admin/settings');
    assert(r5.status === 401, 'T05: Unauthenticated /admin/settings returns 401');
  }

  // Login as customer
  {
    const res = await request(app).post('/api/v1/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });
    customerCookie = extractCookie(res);
    assert(res.status === 200, 'T06: Customer login succeeds');
    assert(!!customerCookie, 'T07: Customer login sets auth_token cookie');
  }

  // Customer cannot access admin endpoints
  {
    const r1 = await request(app).get('/api/v1/admin/dashboard').set('Cookie', customerCookie);
    assert(r1.status === 403, 'T08: Customer /admin/dashboard returns 403');
    const r2 = await request(app).post('/api/v1/admin/vegetables').set('Cookie', customerCookie).send({ name: 'x', pricePerKg: 100 });
    assert(r2.status === 403, 'T09: Customer POST /admin/vegetables returns 403');
    const r3 = await request(app).get('/api/v1/admin/customers').set('Cookie', customerCookie);
    assert(r3.status === 403, 'T10: Customer /admin/customers returns 403');
    const r4 = await request(app).put('/api/v1/admin/settings').set('Cookie', customerCookie).send({ settings: {} });
    assert(r4.status === 403, 'T11: Customer PUT /admin/settings returns 403');
  }

  // Login as admin
  {
    const res = await request(app).post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
    adminCookie = extractCookie(res);
    assert(res.status === 200, 'T12: Admin login succeeds');
    assert(!!adminCookie, 'T13: Admin login sets auth_token cookie');
  }

  {
    const res = await request(app).get('/api/v1/admin/health').set('Cookie', adminCookie);
    assert(res.status === 200, 'T14: Admin /admin/health returns 200');
    assert(res.body.status === 'ok', 'T15: Admin health response status is ok');
  }

  // GROUP 2: Dashboard
  console.log('\n[Group 2] Dashboard');
  {
    const res = await request(app).get('/api/v1/admin/dashboard').set('Cookie', adminCookie);
    assert(res.status === 200, 'T16: Admin /admin/dashboard returns 200');
    assert(res.body.success === true, 'T17: Dashboard success is true');
    const d = res.body.data;
    assert(typeof d?.ordersCountTotal === 'number', 'T18: Dashboard has ordersCountTotal');
    assert(typeof d?.ordersNewCount === 'number', 'T19: Dashboard has ordersNewCount');
    assert(typeof d?.ordersTodayCount === 'number', 'T20: Dashboard has ordersTodayCount');
    assert(typeof d?.salesToday === 'number', 'T21: Dashboard has salesToday');
    assert(typeof d?.salesPaidToday === 'number', 'T22: Dashboard has salesPaidToday');
    assert(typeof d?.salesCodToday === 'number', 'T23: Dashboard has salesCodToday');
    assert(Array.isArray(d?.recentOrders), 'T24: Dashboard has recentOrders array');
    assert(typeof d?.customerCount === 'number', 'T25: Dashboard has customerCount');
  }

  // GROUP 3: Vegetable CRUD
  console.log('\n[Group 3] Vegetable CRUD');
  {
    const res = await request(app).get('/api/v1/admin/vegetables').set('Cookie', adminCookie);
    assert(res.status === 200, 'T26: Admin /admin/vegetables returns 200');
    assert(Array.isArray(res.body.vegetables), 'T27: Vegetables list is array');
  }

  // Invalid prices
  {
    const r1 = await request(app).post('/api/v1/admin/vegetables').set('Cookie', adminCookie).send({ name: 'Bad', description: 'x', pricePerKg: -50 });
    assert(r1.status === 400, 'T28: Negative price returns 400');
    const r2 = await request(app).post('/api/v1/admin/vegetables').set('Cookie', adminCookie).send({ name: 'Bad', description: 'x', pricePerKg: 0 });
    assert(r2.status === 400, 'T29: Zero price returns 400');
  }

  // Valid create
  {
    const res = await request(app).post('/api/v1/admin/vegetables').set('Cookie', adminCookie).send({
      name: `Test Admin Veg ${ts}`,
      description: 'A test vegetable for admin panel tests',
      pricePerKg: 150,
      isAvailable: true,
    });
    assert(res.status === 201, 'T30: Valid POST /admin/vegetables returns 201');
    assert(res.body.vegetable?.id !== undefined, 'T31: Created vegetable has id');
    if (res.body.vegetable?.id) testVegetableId = res.body.vegetable.id;
  }

  // Get and update
  if (testVegetableId) {
    const res = await request(app).get(`/api/v1/admin/vegetables/${testVegetableId}`).set('Cookie', adminCookie);
    assert(res.status === 200, 'T32: GET /admin/vegetables/:id returns 200');
    const upd = await request(app).put(`/api/v1/admin/vegetables/${testVegetableId}`).set('Cookie', adminCookie).send({ pricePerKg: 200 });
    assert(upd.status === 200, 'T33: PUT /admin/vegetables/:id returns 200');
    assert(upd.body.vegetable?.pricePerKg === 200, 'T34: Price updated correctly');
    const bad = await request(app).put(`/api/v1/admin/vegetables/${testVegetableId}`).set('Cookie', adminCookie).send({ pricePerKg: -100 });
    assert(bad.status === 400, 'T35: PUT with negative price returns 400');
  }

  // GROUP 4: Offers
  console.log('\n[Group 4] Offers');
  {
    const res = await request(app).get('/api/v1/admin/offers').set('Cookie', adminCookie);
    assert(res.status === 200, 'T36: Admin /admin/offers returns 200');
    assert(Array.isArray(res.body.data), 'T37: Offers is array');
  }

  if (testVegetableId) {
    const set = await request(app).post('/api/v1/admin/offers').set('Cookie', adminCookie).send({ vegetableId: testVegetableId, offerPrice: 120 });
    assert(set.status === 200, 'T38: POST /admin/offers sets offer');
    assert(set.body.vegetable?.isOffer === true, 'T39: isOffer is true after setting offer');
    const neg = await request(app).post('/api/v1/admin/offers').set('Cookie', adminCookie).send({ vegetableId: testVegetableId, offerPrice: -10 });
    assert(neg.status === 400, 'T40: Negative offerPrice returns 400');
    const rem = await request(app).delete(`/api/v1/admin/offers/${testVegetableId}`).set('Cookie', adminCookie);
    assert(rem.status === 200, 'T41: DELETE /admin/offers removes offer');
    assert(rem.body.vegetable?.isOffer === false, 'T42: isOffer cleared after removal');
  }

  // GROUP 5: Delivery Zones
  console.log('\n[Group 5] Delivery Zones');
  {
    const res = await request(app).get('/api/v1/admin/delivery-zones').set('Cookie', adminCookie);
    assert(res.status === 200, 'T43: Admin /admin/delivery-zones returns 200');
    assert(Array.isArray(res.body.data), 'T44: Delivery zones is array');
  }

  {
    const bad = await request(app).post('/api/v1/admin/delivery-zones').set('Cookie', adminCookie).send({ areaName: 'Bad Zone', deliveryFee: -50 });
    assert(bad.status === 400, 'T45: Negative delivery fee returns 400');
  }

  {
    const res = await request(app).post('/api/v1/admin/delivery-zones').set('Cookie', adminCookie).send({
      areaName: `Admin Test Zone ${ts}`,
      deliveryFee: 80,
      minOrderAmount: 200,
      estimatedDeliveryTime: '30-45 mins',
      isActive: true,
    });
    assert(res.status === 201, 'T46: Valid POST /admin/delivery-zones returns 201');
    assert(typeof res.body.zone?.id === 'string', 'T47: Created zone has id');
    if (res.body.zone?.id) testDeliveryZoneId = res.body.zone.id;
  }

  if (testDeliveryZoneId) {
    const upd = await request(app).put(`/api/v1/admin/delivery-zones/${testDeliveryZoneId}`).set('Cookie', adminCookie).send({ deliveryFee: 100, isActive: false });
    assert(upd.status === 200, 'T48: PUT /admin/delivery-zones/:id returns 200');
    assert(upd.body.zone?.deliveryFee === 100, 'T49: Delivery fee updated');
    const del = await request(app).delete(`/api/v1/admin/delivery-zones/${testDeliveryZoneId}`).set('Cookie', adminCookie);
    assert([200, 204].includes(del.status), 'T50: DELETE /admin/delivery-zones returns 200');
    testDeliveryZoneId = '';
  }

  // GROUP 6: Orders
  console.log('\n[Group 6] Orders');
  {
    const res = await request(app).get('/api/v1/admin/orders').set('Cookie', adminCookie);
    assert(res.status === 200, 'T51: Admin /admin/orders returns 200');
    assert(Array.isArray(res.body.orders), 'T52: Orders is array');
  }

  {
    const res = await request(app).get('/api/v1/admin/orders?orderStatus=NEW').set('Cookie', adminCookie);
    assert(res.status === 200, 'T53: Admin can filter orders by status');
  }

  // GROUP 6B: Payment Status Reconciliation & Audit Logging
  console.log('\n[Group 6B] Payment Status Reconciliation & Audit Logging');
  let payTestZoneId = '';
  let onlineOrderId = 0;
  let codOrderId = 0;
  try {
    const payZone = await prisma.deliveryZone.create({
      data: {
        areaName: `PayZone_${ts}`,
        deliveryFee: 40,
        minOrderAmount: 100,
        isActive: true,
      },
    });
    payTestZoneId = payZone.id;

    const onlineOrder = await prisma.order.create({
      data: {
        userId: customerUserId,
        customerName: 'Online Pay Customer',
        customerPhone: '03001234567',
        deliveryAddress: 'House 10, Muzaffargarh',
        deliveryZoneId: payZone.id,
        deliveryFee: 40,
        subtotal: 300,
        grandTotal: 340,
        paymentMethod: 'ADVANCE_ONLINE',
        paymentStatus: 'PENDING',
        orderStatus: 'NEW',
      },
    });
    onlineOrderId = onlineOrder.id;

    const codOrder = await prisma.order.create({
      data: {
        userId: customerUserId,
        customerName: 'COD Pay Customer',
        customerPhone: '03001234567',
        deliveryAddress: 'House 11, Muzaffargarh',
        deliveryZoneId: payZone.id,
        deliveryFee: 40,
        subtotal: 300,
        grandTotal: 340,
        paymentMethod: 'COD',
        paymentStatus: 'COD',
        orderStatus: 'NEW',
      },
    });
    codOrderId = codOrder.id;

    // PR01: Customer cannot change payment status
    const custRes = await request(app)
      .patch(`/api/v1/admin/orders/${onlineOrderId}/payment-status`)
      .set('Cookie', customerCookie)
      .send({ paymentStatus: 'PAID' });
    assert(custRes.status === 403, 'PR01: Customer blocked from updating payment status (HTTP 403)');

    // PR02: Invalid payment status string rejected
    const badStatusRes = await request(app)
      .patch(`/api/v1/admin/orders/${onlineOrderId}/payment-status`)
      .set('Cookie', adminCookie)
      .send({ paymentStatus: 'FAKE_STATUS' });
    assert(badStatusRes.status === 400, 'PR02: Invalid payment status string rejected (HTTP 400)');

    // PR03: Online payment cannot be marked PAID without verified txnRef
    const unverifiedOnline = await request(app)
      .patch(`/api/v1/admin/orders/${onlineOrderId}/payment-status`)
      .set('Cookie', adminCookie)
      .send({ paymentStatus: 'PAID' });
    assert(unverifiedOnline.status === 400, 'PR03: Online order cannot be marked PAID without txnRef (HTTP 400)');

    // PR04: Online payment marked PAID with valid txnRef succeeds
    const verifiedOnline = await request(app)
      .patch(`/api/v1/admin/orders/${onlineOrderId}/payment-status`)
      .set('Cookie', adminCookie)
      .send({ paymentStatus: 'PAID', txnRef: 'JAZZ-12345678' });
    assert(verifiedOnline.status === 200, 'PR04: Online order marked PAID with valid txnRef (HTTP 200)');
    assert(verifiedOnline.body.order?.paymentStatus === 'PAID', 'PR05: paymentStatus updated to PAID');
    assert(verifiedOnline.body.order?.paymentTxnRef === 'JAZZ-12345678', 'PR06: paymentTxnRef saved correctly');

    // PR07: Audit entry created in statusHistory
    const history = verifiedOnline.body.order?.statusHistory || [];
    const auditEntry = history.find((h: any) => h.note && h.note.includes('PAID') && h.note.includes('JAZZ-12345678'));
    assert(!!auditEntry, 'PR07: Payment status change creates audit trail in statusHistory');

    // PR08: Transition from PAID back to PENDING rejected
    const invalidRevert = await request(app)
      .patch(`/api/v1/admin/orders/${onlineOrderId}/payment-status`)
      .set('Cookie', adminCookie)
      .send({ paymentStatus: 'PENDING' });
    assert(invalidRevert.status === 400, 'PR08: Transitioning PAID back to PENDING rejected (HTTP 400)');

    // PR09: Refund online order succeeds
    const refundRes = await request(app)
      .patch(`/api/v1/admin/orders/${onlineOrderId}/payment-status`)
      .set('Cookie', adminCookie)
      .send({ paymentStatus: 'REFUNDED', txnRef: 'REF-87654321' });
    assert(refundRes.status === 200, 'PR09: Transition to REFUNDED succeeds (HTTP 200)');

    // PR10: Transition from REFUNDED back to PAID rejected
    const unrefundRes = await request(app)
      .patch(`/api/v1/admin/orders/${onlineOrderId}/payment-status`)
      .set('Cookie', adminCookie)
      .send({ paymentStatus: 'PAID', txnRef: 'NEW-TXN' });
    assert(unrefundRes.status === 400, 'PR10: Transitioning REFUNDED back to PAID rejected (HTTP 400)');

    // PR11: COD order can be reconciled to PAID by admin
    const codPaidRes = await request(app)
      .patch(`/api/v1/admin/orders/${codOrderId}/payment-status`)
      .set('Cookie', adminCookie)
      .send({ paymentStatus: 'PAID' });
    assert(codPaidRes.status === 200, 'PR11: Admin marks COD order as PAID upon cash collection (HTTP 200)');
  } finally {
    if (onlineOrderId) await prisma.order.delete({ where: { id: onlineOrderId } }).catch(() => {});
    if (codOrderId) await prisma.order.delete({ where: { id: codOrderId } }).catch(() => {});
    if (payTestZoneId) await prisma.deliveryZone.delete({ where: { id: payTestZoneId } }).catch(() => {});
  }

  // GROUP 7: Customers
  console.log('\n[Group 7] Customers');
  {
    const res = await request(app).get('/api/v1/admin/customers').set('Cookie', adminCookie);
    assert(res.status === 200, 'T54: Admin /admin/customers returns 200');
    assert(Array.isArray(res.body.customers), 'T55: Customers is array');
    const anyExposed = (res.body.customers as any[]).some((c: any) => c.passwordHash !== undefined || c.googleId !== undefined);
    assert(!anyExposed, 'T56: Customer list does not expose passwordHash or googleId');
  }

  {
    const res = await request(app).get(`/api/v1/admin/customers/${customerUserId}`).set('Cookie', adminCookie);
    assert(res.status === 200, 'T57: Admin /admin/customers/:id returns 200');
    assert(res.body.customer?.id === customerUserId, 'T58: Correct customer returned');
    assert(!res.body.customer?.passwordHash, 'T59: Customer detail hides passwordHash');
    assert(!res.body.customer?.googleId, 'T60: Customer detail hides googleId');
  }

  // GROUP 8: Settings
  console.log('\n[Group 8] Settings');
  {
    const res = await request(app).get('/api/v1/admin/settings').set('Cookie', adminCookie);
    assert(res.status === 200, 'T61: Admin /admin/settings returns 200');
    assert(typeof res.body.data === 'object', 'T62: Settings returns data object');
  }

  {
    const res = await request(app).put('/api/v1/admin/settings').set('Cookie', adminCookie).send({ settings: { brand_name: 'Fresh Vegetables Muzaffargarh' } });
    assert(res.status === 200, 'T63: Admin PUT /admin/settings returns 200');
  }

  {
    const res = await request(app).put('/api/v1/admin/settings').set('Cookie', customerCookie).send({ settings: { brand_name: 'Hacked' } });
    assert(res.status === 403, 'T64: Customer PUT /admin/settings still returns 403');
  }

  // GROUP 9: Admin Profile
  console.log('\n[Group 9] Admin Profile');
  {
    const res = await request(app).get('/api/v1/admin/me').set('Cookie', adminCookie);
    assert(res.status === 200, 'T65: Admin /admin/me returns 200');
    assert(res.body.user?.role === 'ADMIN', 'T66: /admin/me returns role=ADMIN');
    assert(!res.body.user?.passwordHash, 'T67: /admin/me hides passwordHash');
  }

  {
    const res = await request(app).put('/api/v1/admin/password').set('Cookie', adminCookie).send({ currentPassword: 'wrongpassword', newPassword: 'NewPass@456' });
    assert(res.status === 400, 'T68: Wrong current password returns 400');
  }

  {
    const res = await request(app).put('/api/v1/admin/password').set('Cookie', adminCookie).send({ currentPassword: PASSWORD, newPassword: '123' });
    assert(res.status === 400, 'T69: Weak new password returns 400');
  }

  // GROUP 10: Cleanup + Edge Cases
  console.log('\n[Group 10] Edge Cases');
  if (testVegetableId) {
    const res = await request(app).delete(`/api/v1/admin/vegetables/${testVegetableId}`).set('Cookie', adminCookie);
    assert([200, 204].includes(res.status), 'T70: DELETE /admin/vegetables/:id returns 200');
    testVegetableId = '';
  }

  {
    const res = await request(app).get('/api/v1/admin/vegetables/non-existent-id-xyz').set('Cookie', adminCookie);
    assert(res.status === 404, 'T71: GET /admin/vegetables/bad-id returns 404');
  }

  await cleanup();

  const total = passed + failed;
  console.log('');
  console.log(`=== ADMIN TEST RESULTS: ${passed}/${total} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[ADMIN TESTS ERROR]:', err);
  process.exit(1);
});

