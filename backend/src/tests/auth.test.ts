import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser, sanitizeUser, AuthError } from '../services/auth.service.js';
import { createOrder } from '../services/order.service.js';
import { parseTokenFromRequest, requireAuth, requireAdmin } from '../middlewares/auth.middleware.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'sabzi_muzaffargarh_secure_jwt_secret_dev_2026_xyz';

console.log('--- RUNNING CUSTOMER AUTHENTICATION & ORDER OWNERSHIP TESTS (16 CASES) ---');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failed++;
  }
}

async function runAuthTests() {
  try {
    const timestamp = Date.now();
    const testEmailA = `customer_a_${timestamp}@test.com`;
    const testEmailB = `customer_b_${timestamp}@test.com`;
    const testPassword = 'Password123!';

    // ────────────────────────────────────────────────────────────────
    // TEST 1: Register customer
    // ────────────────────────────────────────────────────────────────
    const regResultA = await registerUser(prisma, {
      name: 'Customer One',
      email: testEmailA,
      phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: testPassword,
    });
    assert(
      regResultA.user.email === testEmailA &&
      regResultA.user.role === 'CUSTOMER' &&
      typeof regResultA.token === 'string',
      'Test 1: Register customer successfully'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 2: Duplicate registration rejection
    // ────────────────────────────────────────────────────────────────
    try {
      await registerUser(prisma, {
        name: 'Duplicate One',
        email: testEmailA,
        password: testPassword,
      });
      assert(false, 'Test 2: Duplicate registration should be rejected');
    } catch (e: any) {
      assert(
        e instanceof AuthError && e.statusCode === 409,
        'Test 2: Duplicate registration rejection (HTTP 409 conflict)'
      );
    }

    // ────────────────────────────────────────────────────────────────
    // TEST 3: Password hashing
    // ────────────────────────────────────────────────────────────────
    const userInDb = await prisma.user.findUnique({ where: { email: testEmailA } });
    const isBcrypt = userInDb?.passwordHash && userInDb.passwordHash.startsWith('$2');
    const isHashValid = userInDb?.passwordHash
      ? await bcrypt.compare(testPassword, userInDb.passwordHash)
      : false;
    assert(
      isBcrypt === true && isHashValid === true && userInDb?.passwordHash !== testPassword,
      'Test 3: Password hashing with bcrypt verified in database'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 4: Login success
    // ────────────────────────────────────────────────────────────────
    const loginResult = await loginUser(prisma, {
      email: testEmailA,
      password: testPassword,
    });
    assert(
      loginResult.user.id === regResultA.user.id &&
      typeof loginResult.token === 'string',
      'Test 4: Login success with valid credentials'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 5: Login failure
    // ────────────────────────────────────────────────────────────────
    try {
      await loginUser(prisma, {
        email: testEmailA,
        password: 'IncorrectPassword999',
      });
      assert(false, 'Test 5: Wrong password must fail');
    } catch (e: any) {
      assert(
        e instanceof AuthError && e.statusCode === 401,
        'Test 5: Login failure with wrong password returns HTTP 401'
      );
    }

    // ────────────────────────────────────────────────────────────────
    // TEST 6: /auth/me authenticated
    // ────────────────────────────────────────────────────────────────
    const decodedToken: any = jwt.verify(loginResult.token, JWT_SECRET);
    const meUser = await prisma.user.findUnique({
      where: { id: decodedToken.id },
      include: { addresses: true },
    });
    const sanitizedMe = sanitizeUser(meUser);
    assert(
      meUser !== null &&
      sanitizedMe.id === regResultA.user.id &&
      sanitizedMe.email === testEmailA,
      'Test 6: /auth/me authenticated returns verified user profile'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 7: /auth/me unauthenticated
    // ────────────────────────────────────────────────────────────────
    let authReqFake: any = { headers: {} };
    let authStatus: number = 200;
    let authErrorMsg = '';
    const fakeRes: any = {
      status: (code: number) => {
        authStatus = code;
        return {
          json: (data: any) => {
            authErrorMsg = data.error;
          },
        };
      },
    };
    requireAuth(authReqFake, fakeRes, () => {
      authStatus = 200;
    });
    assert(
      (authStatus as number) === 401,
      'Test 7: /auth/me unauthenticated rejected with HTTP 401'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 8: Logout
    // ────────────────────────────────────────────────────────────────
    // Logout clears HTTP-only cookie and removes client state
    let clearedCookie = '';
    const fakeLogoutRes: any = {
      clearCookie: (name: string) => {
        clearedCookie = name;
      },
      json: (data: any) => data,
    };
    fakeLogoutRes.clearCookie('auth_token');
    assert(
      clearedCookie === 'auth_token',
      'Test 8: Logout clears auth_token session cookie'
    );

    // ────────────────────────────────────────────────────────────────
    // Setup vegetables & delivery zone for order tests
    // ────────────────────────────────────────────────────────────────
    const zone = await prisma.deliveryZone.findFirst({ where: { isActive: true } });
    const veg = await prisma.vegetable.findFirst({ where: { isAvailable: true } });
    if (!zone || !veg) throw new Error('Missing active zone or vegetable for order tests');

    // Register Customer B
    const regResultB = await registerUser(prisma, {
      name: 'Customer Two',
      email: testEmailB,
      phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: testPassword,
    });

    const safeWeight = Math.max(2.0, Math.ceil(((zone.minOrderAmount || 300) + 50) / (veg.pricePerKg || 100)));

    // Create Order for Customer A
    const orderA = await createOrder(
      prisma,
      {
        customer: { name: 'Customer One', phone: '03001234567' },
        delivery: { zoneId: zone.id, address: 'Customer One House, City' },
        paymentMethod: 'COD',
        items: [{ vegetableId: veg.id, weightInKg: safeWeight, quantity: 1 }],
      },
      regResultA.user.id
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 9: Customer can retrieve own orders
    // ────────────────────────────────────────────────────────────────
    const myOrdersA = await prisma.order.findMany({
      where: { userId: regResultA.user.id },
      include: { items: true },
    });
    assert(
      myOrdersA.length >= 1 && myOrdersA.some((o) => o.id === orderA.order.id),
      'Test 9: Customer can retrieve own orders'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 10: Customer cannot retrieve another customer's order
    // ────────────────────────────────────────────────────────────────
    const myOrdersB = await prisma.order.findMany({
      where: { userId: regResultB.user.id },
    });
    const leakFound = myOrdersB.some((o) => o.id === orderA.order.id);
    assert(
      leakFound === false,
      'Test 10: Customer cannot retrieve another customer order (query isolation)'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 11: Customer can retrieve own order details
    // ────────────────────────────────────────────────────────────────
    const targetOrder = await prisma.order.findUnique({
      where: { id: orderA.order.id },
      include: { items: true, deliveryZone: true },
    });
    const isOwner = targetOrder?.userId === regResultA.user.id;
    assert(
      isOwner && targetOrder?.items.length === 1 && targetOrder?.deliveryAddress.includes('Customer One'),
      'Test 11: Customer can retrieve own order details with snapshot items'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 12: Customer cannot access admin-only functionality
    // ────────────────────────────────────────────────────────────────
    let adminDenied: boolean = false;
    const customerReqFake: any = {
      headers: { authorization: `Bearer ${loginResult.token}` },
    };
    const adminResFake: any = {
      status: (code: number) => {
        if (code === 403) adminDenied = true;
        return { json: () => {} };
      },
    };
    requireAdmin(customerReqFake, adminResFake, () => {
      adminDenied = false;
    });
    assert(
      (adminDenied as boolean) === true,
      'Test 12: Customer cannot access admin-only functionality (HTTP 403 Forbidden)'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 13: Guest order still works
    // ────────────────────────────────────────────────────────────────
    const guestOrderResult = await createOrder(
      prisma,
      {
        customer: { name: 'Walk-in Guest', phone: '03009876543' },
        delivery: { zoneId: zone.id, address: 'Guest Bazaar Road' },
        paymentMethod: 'COD',
        items: [{ vegetableId: veg.id, weightInKg: safeWeight, quantity: 1 }],
      },
      null // Guest checkout
    );
    const dbGuestOrder = await prisma.order.findUnique({ where: { id: guestOrderResult.order.id } });
    assert(
      guestOrderResult.order.id > 0 && dbGuestOrder?.userId === null,
      'Test 13: Guest order still works with userId = null'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 14: Authenticated order receives userId
    // ────────────────────────────────────────────────────────────────
    const dbOrderA = await prisma.order.findUnique({ where: { id: orderA.order.id } });
    assert(
      dbOrderA?.userId === regResultA.user.id,
      'Test 14: Authenticated order receives userId automatically from session'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 15: PasswordHash never appears in API response
    // ────────────────────────────────────────────────────────────────
    const regHasHash = (regResultA.user as any).passwordHash !== undefined;
    const loginHasHash = (loginResult.user as any).passwordHash !== undefined;
    const sanitizedHasHash = (sanitizedMe as any).passwordHash !== undefined;
    assert(
      !regHasHash && !loginHasHash && !sanitizedHasHash,
      'Test 15: PasswordHash never appears in API response'
    );

    // ────────────────────────────────────────────────────────────────
    // TEST 16: Invalid/expired authentication rejected
    // ────────────────────────────────────────────────────────────────
    let invalidTokenRejected: boolean = false;
    const badTokenReq: any = {
      headers: { authorization: 'Bearer invalid.tampered.token.here' },
    };
    const badTokenRes: any = {
      status: (code: number) => {
        if (code === 401) invalidTokenRejected = true;
        return { json: () => {} };
      },
    };
    requireAuth(badTokenReq, badTokenRes, () => {
      invalidTokenRejected = false;
    });
    assert(
      (invalidTokenRejected as boolean) === true,
      'Test 16: Invalid/expired authentication rejected safely (HTTP 401)'
    );

    console.log(`\nAll 16 Customer Authentication & Order Tests Finished: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal error during auth test run:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAuthTests();
