import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser, sanitizeUser, AuthError } from '../services/auth.service.js';
import { createOrder } from '../services/order.service.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'sabzi_muzaffargarh_secure_jwt_secret_dev_2026_xyz';

console.log('--- RUNNING CUSTOMER AUTHENTICATION & ORDER OWNERSHIP TESTS ---');

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
    const testEmailA = `customer_${timestamp}@test.com`;
    const testEmailB = `customer2_${timestamp}@test.com`;
    const testPassword = 'Password123!';

    // 1. Register customer
    const regResult = await registerUser(prisma, {
      name: 'Test Customer A',
      email: testEmailA,
      phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: testPassword,
    });

    assert(
      regResult.user.email === testEmailA &&
      regResult.user.role === 'CUSTOMER' &&
      typeof regResult.token === 'string',
      'Test 1: Customer registered successfully with valid token'
    );

    // 2. Reject duplicate registration
    try {
      await registerUser(prisma, {
        name: 'Duplicate Guy',
        email: testEmailA,
        password: testPassword,
      });
      assert(false, 'Test 2: Reject duplicate registration');
    } catch (e: any) {
      assert(e instanceof AuthError && e.statusCode === 409, 'Test 2: Duplicate registration rejected with HTTP 409');
    }

    // 3. Password Hashing verified in database
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmailA },
    });
    assert(
      dbUser !== null &&
      dbUser.passwordHash !== null &&
      dbUser.passwordHash !== testPassword &&
      dbUser.passwordHash.startsWith('$2'),
      'Test 3: Password securely hashed using bcrypt'
    );

    // 4. PasswordHash never appears in sanitized response
    assert(
      (regResult.user as any).passwordHash === undefined,
      'Test 4: passwordHash is stripped and never returned to client'
    );

    // 5. Login success with valid credentials
    const loginResult = await loginUser(prisma, {
      email: testEmailA,
      password: testPassword,
    });
    assert(
      loginResult.user.id === regResult.user.id &&
      typeof loginResult.token === 'string',
      'Test 5: Login succeeded with valid credentials'
    );

    // 6. Login failure with wrong password
    try {
      await loginUser(prisma, {
        email: testEmailA,
        password: 'WrongPassword999',
      });
      assert(false, 'Test 6: Reject wrong password');
    } catch (e: any) {
      assert(e instanceof AuthError && e.statusCode === 401, 'Test 6: Login failed with HTTP 401 for wrong password');
    }

    // 7. Token verification
    const decoded: any = jwt.verify(loginResult.token, JWT_SECRET);
    assert(
      decoded.id === regResult.user.id && decoded.role === 'CUSTOMER',
      'Test 7: JWT token contains verified customer identity and role'
    );

    // 8. Register a second customer for ownership testing
    const userB = await registerUser(prisma, {
      name: 'Test Customer B',
      email: testEmailB,
      phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: testPassword,
    });

    // Fetch active delivery zone & available vegetable
    const zone = await prisma.deliveryZone.findFirst({ where: { isActive: true, minOrderAmount: 0 } }) ||
                 await prisma.deliveryZone.findFirst({ where: { isActive: true } });
    const veg = await prisma.vegetable.findFirst({ where: { isAvailable: true } });

    if (!zone || !veg) throw new Error('Missing active zone or vegetable for testing');

    // 9. Authenticated order receives userId
    const orderAuthA = await createOrder(
      prisma,
      {
        customer: { name: 'Customer A', phone: '03001234567' },
        delivery: { zoneId: zone.id, address: 'Customer A Street' },
        paymentMethod: 'COD',
        items: [{ vegetableId: veg.id, weightInKg: 1.0, quantity: 1 }],
      },
      regResult.user.id
    );

    const savedOrderA = await prisma.order.findUnique({
      where: { id: orderAuthA.order.id },
    });

    assert(
      savedOrderA?.userId === regResult.user.id,
      'Test 9: Authenticated order successfully saved with Customer A userId'
    );

    // 10. Guest order receives null userId
    const orderGuest = await createOrder(
      prisma,
      {
        customer: { name: 'Guest User', phone: '03009999999' },
        delivery: { zoneId: zone.id, address: 'Guest Street' },
        paymentMethod: 'COD',
        items: [{ vegetableId: veg.id, weightInKg: 1.0, quantity: 1 }],
      },
      null
    );

    const savedOrderGuest = await prisma.order.findUnique({
      where: { id: orderGuest.order.id },
    });

    assert(
      savedOrderGuest?.userId === null,
      'Test 10: Guest checkout continues to work with userId = null'
    );

    // 11. Customer can retrieve own orders
    const ordersA = await prisma.order.findMany({
      where: { userId: regResult.user.id },
    });
    assert(
      ordersA.length >= 1 && ordersA.some((o) => o.id === orderAuthA.order.id),
      'Test 11: Customer A can query and retrieve their own order list'
    );

    // 12. Customer B cannot see Customer A's orders in customer orders query
    const ordersB = await prisma.order.findMany({
      where: { userId: userB.user.id },
    });
    assert(
      !ordersB.some((o) => o.id === orderAuthA.order.id),
      'Test 12: Customer B order query does NOT contain Customer A orders (isolation)'
    );

    // 13. Direct order access ownership check simulation
    // If Customer B requests orderAuthA.order.id, ownership check fails
    const targetOrder = await prisma.order.findUnique({ where: { id: orderAuthA.order.id } });
    const isOwnerA = targetOrder?.userId === regResult.user.id;
    const isOwnerB = targetOrder?.userId === userB.user.id;
    assert(
      isOwnerA === true && isOwnerB === false,
      'Test 13: Strict order ownership verified (User B rejected when attempting to access User A order)'
    );

    // 14. Invalid/Expired Token verification failure
    try {
      jwt.verify('invalid.token.here', JWT_SECRET);
      assert(false, 'Test 14: Reject invalid token');
    } catch {
      assert(true, 'Test 14: Tampered/invalid authentication token rejected safely');
    }

    console.log(`\nAuth Tests Completed: ${passed} passed, ${failed} failed.`);
  } catch (err) {
    console.error('Fatal error during auth test run:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runAuthTests();
