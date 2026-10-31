import './test-env.js';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import request from 'supertest';
import {
  createOrder,
  OrderValidationError,
  IdempotencyConflictError,
  StalePriceError,
} from '../services/order.service.js';

let app: any;
const prisma = new PrismaClient();

console.log('=== RUNNING PHASE 3.1 IDEMPOTENCY & STALE-PRICE VERIFICATION AUDIT ===\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function randKey(): string {
  return 'audit-key-' + crypto.randomBytes(12).toString('hex');
}

async function runTests() {
  try {
    app = (await import('../server.js')).app;

    // ── Fixture Setup in isolated test.db ──────────────────────────────
    let activeZone = await prisma.deliveryZone.findFirst({
      where: { isActive: true, minOrderAmount: 0 },
    });
    if (!activeZone) {
      activeZone = await prisma.deliveryZone.create({
        data: {
          areaName: 'Audit Active Zone',
          deliveryFee: 40,
          minOrderAmount: 0,
          isActive: true,
        },
      });
    }

    let inactiveZone = await prisma.deliveryZone.findFirst({
      where: { isActive: false },
    });
    if (!inactiveZone) {
      inactiveZone = await prisma.deliveryZone.create({
        data: {
          areaName: 'Audit Inactive Zone',
          deliveryFee: 60,
          isActive: false,
        },
      });
    }

    // Vegetable A (standard price)
    const vegA = await prisma.vegetable.upsert({
      where: { slug: 'audit-veg-a-standard' },
      update: { isAvailable: true, pricePerKg: 100, isOffer: false, offerPrice: null },
      create: {
        name: 'Audit Standard Veg A',
        slug: 'audit-veg-a-standard',
        description: 'Standard priced test vegetable',
        pricePerKg: 100,
        isAvailable: true,
        isOffer: false,
      },
    });

    // Vegetable B (active offer: normal 200, offerPrice 150)
    const vegOffer = await prisma.vegetable.upsert({
      where: { slug: 'audit-veg-offer' },
      update: { isAvailable: true, pricePerKg: 200, isOffer: true, offerPrice: 150 },
      create: {
        name: 'Audit Offer Veg B',
        slug: 'audit-veg-offer',
        description: 'Active offer vegetable',
        pricePerKg: 200,
        offerPrice: 150,
        isOffer: true,
        isAvailable: true,
      },
    });

    // Vegetable C (unavailable)
    const vegUnavail = await prisma.vegetable.upsert({
      where: { slug: 'audit-veg-unavail' },
      update: { isAvailable: false },
      create: {
        name: 'Audit Unavailable Veg C',
        slug: 'audit-veg-unavail',
        description: 'Out of stock vegetable',
        pricePerKg: 120,
        isAvailable: false,
      },
    });

    // Test Users
    let userAlice = await prisma.user.findFirst({ where: { phone: '03001110001' } });
    if (!userAlice) {
      userAlice = await prisma.user.create({
        data: {
          name: 'Audit Alice',
          phone: '03001110001',
          email: `audit_alice_${Date.now()}@test.com`,
          passwordHash: 'dummyhash123',
          role: 'CUSTOMER',
        },
      });
    }

    let userBob = await prisma.user.findFirst({ where: { phone: '03002220002' } });
    if (!userBob) {
      userBob = await prisma.user.create({
        data: {
          name: 'Audit Bob',
          phone: '03002220002',
          email: `audit_bob_${Date.now()}@test.com`,
          passwordHash: 'dummyhash456',
          role: 'CUSTOMER',
        },
      });
    }

    console.log('--- SECTION A: Direct Service-Level Validation & False-Positive Elimination ---');

    // 1. Missing idempotency key rejected
    let missingKeyCaught = false;
    let missingKeyMsg = '';
    try {
      await createOrder(prisma, {
        customer: { name: 'No Key', phone: '03001111111' },
        delivery: { zoneId: activeZone.id, address: 'Test Lane 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      } as any);
    } catch (e: any) {
      if (e instanceof OrderValidationError && e.statusCode === 400) {
        missingKeyCaught = true;
        missingKeyMsg = e.message;
      }
    }
    assert(missingKeyCaught && missingKeyMsg.includes('idempotency key'), 'T01: Missing idempotency key rejected with 400 OrderValidationError');

    // 2. Empty / whitespace idempotency key rejected
    let emptyKeyCaught = false;
    try {
      await createOrder(prisma, {
        idempotencyKey: '    ',
        customer: { name: 'Blank Key', phone: '03001111111' },
        delivery: { zoneId: activeZone.id, address: 'Test Lane 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
    } catch (e: any) {
      if (e instanceof OrderValidationError && e.statusCode === 400) emptyKeyCaught = true;
    }
    assert(emptyKeyCaught, 'T02: Whitespace idempotency key rejected with 400 OrderValidationError');

    // 3. Short (< 8 chars) idempotency key rejected
    let shortKeyCaught = false;
    try {
      await createOrder(prisma, {
        idempotencyKey: 'short',
        customer: { name: 'Short Key', phone: '03001111111' },
        delivery: { zoneId: activeZone.id, address: 'Test Lane 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
    } catch (e: any) {
      if (e instanceof OrderValidationError && e.statusCode === 400) shortKeyCaught = true;
    }
    assert(shortKeyCaught, 'T03: Short (< 8 chars) idempotency key rejected with 400 OrderValidationError');

    // 4. Unavailable vegetable (must provide valid key so failure is strictly due to availability)
    let unavailCaught = false;
    let unavailMsg = '';
    try {
      await createOrder(prisma, {
        idempotencyKey: randKey(),
        customer: { name: 'Unavail Test', phone: '03001111111' },
        delivery: { zoneId: activeZone.id, address: 'Test Lane 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegUnavail.id, weightInKg: 1.0, quantity: 1 }],
      });
    } catch (e: any) {
      if (e instanceof OrderValidationError && e.statusCode === 400) {
        unavailCaught = true;
        unavailMsg = e.message;
      }
    }
    assert(unavailCaught && unavailMsg.includes('currently unavailable'), 'T04: Unavailable vegetable rejected with exact 400 message');

    // 5. Nonexistent vegetable (must provide valid key so failure is strictly 404 not found)
    let nonExistVegCaught = false;
    let nonExistVegMsg = '';
    try {
      await createOrder(prisma, {
        idempotencyKey: randKey(),
        customer: { name: 'Missing Veg', phone: '03001111111' },
        delivery: { zoneId: activeZone.id, address: 'Test Lane 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: 'nonexistent-uuid-12345', weightInKg: 1.0, quantity: 1 }],
      });
    } catch (e: any) {
      if (e instanceof OrderValidationError && e.statusCode === 404) {
        nonExistVegCaught = true;
        nonExistVegMsg = e.message;
      }
    }
    assert(nonExistVegCaught && nonExistVegMsg.includes('not found'), 'T05: Nonexistent vegetable returns exact 404 OrderValidationError');

    // 6. Inactive delivery zone (must provide valid key)
    let inactiveZoneCaught = false;
    let inactiveZoneMsg = '';
    try {
      await createOrder(prisma, {
        idempotencyKey: randKey(),
        customer: { name: 'Inactive Zone', phone: '03001111111' },
        delivery: { zoneId: inactiveZone.id, address: 'Test Lane 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
    } catch (e: any) {
      if (e instanceof OrderValidationError && e.statusCode === 400) {
        inactiveZoneCaught = true;
        inactiveZoneMsg = e.message;
      }
    }
    assert(inactiveZoneCaught && inactiveZoneMsg.includes('inactive'), 'T06: Inactive delivery zone rejected with exact 400 message');

    // 7. Nonexistent delivery zone (must provide valid key)
    let missingZoneCaught = false;
    try {
      await createOrder(prisma, {
        idempotencyKey: randKey(),
        customer: { name: 'Missing Zone', phone: '03001111111' },
        delivery: { zoneId: 'missing-zone-999', address: 'Test Lane 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
    } catch (e: any) {
      if (e instanceof OrderValidationError && e.statusCode === 404) missingZoneCaught = true;
    }
    assert(missingZoneCaught, 'T07: Nonexistent delivery zone returns 404 OrderValidationError');

    // 8. Custom weight <= 10kg (7.5kg) rejected with valid key
    let customWeightCaught = false;
    let customWeightMsg = '';
    try {
      await createOrder(prisma, {
        idempotencyKey: randKey(),
        customer: { name: 'Weight Test', phone: '03001111111' },
        delivery: { zoneId: activeZone.id, address: 'Test Lane 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 7.5, quantity: 1 }],
      });
    } catch (e: any) {
      if (e instanceof OrderValidationError && e.statusCode === 400) {
        customWeightCaught = true;
        customWeightMsg = e.message;
      }
    }
    assert(customWeightCaught && customWeightMsg.includes('above 10kg'), 'T08: Custom weight <= 10kg rejected with exact 400 message');

    // 9. Zero weight rejected with valid key
    let zeroWeightCaught = false;
    try {
      await createOrder(prisma, {
        idempotencyKey: randKey(),
        customer: { name: 'Zero Weight', phone: '03001111111' },
        delivery: { zoneId: activeZone.id, address: 'Test Lane 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 0, quantity: 1 }],
      });
    } catch (e: any) {
      if (e instanceof OrderValidationError && e.statusCode === 400) zeroWeightCaught = true;
    }
    assert(zeroWeightCaught, 'T09: Zero weight rejected with 400 OrderValidationError');

    console.log('\n--- SECTION B: Idempotency Replay, Concurrency, and Privacy Scoping ---');

    // 10. Valid key + same payload: first call creates, second call replays
    const keyReplay = randKey();
    const payloadReplay = {
      idempotencyKey: keyReplay,
      customer: { name: 'Replay Tester', phone: '03001234567' },
      delivery: { zoneId: activeZone.id, address: 'Railway Road 12' },
      paymentMethod: 'COD' as const,
      items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1, expectedPricePerKg: 100 }],
    };

    const firstCall = await createOrder(prisma, payloadReplay);
    assert(firstCall.replayed === false || firstCall.replayed === undefined, 'T10.1: Initial call creates order');
    assert(firstCall.order.orderNumber.startsWith('ORD-'), 'T10.2: Order receives ORD- formatted orderNumber');

    const secondCall = await createOrder(prisma, payloadReplay);
    assert(secondCall.replayed === true, 'T10.3: Retry call is flagged as replayed');
    assert(secondCall.order.id === firstCall.order.id, 'T10.4: Replayed order has identical ID');
    assert(secondCall.order.uuid === firstCall.order.uuid, 'T10.5: Replayed order has identical UUID');

    // 11. Retrying does not duplicate OrderItems
    const orderItemsCount = await prisma.orderItem.count({ where: { orderId: firstCall.order.id } });
    assert(orderItemsCount === 1, 'T11: Retry does not insert duplicate OrderItems in DB');

    // 12. Same key + changed payload throws IdempotencyConflictError (409)
    let payloadConflictCaught = false;
    let payloadConflictMsg = '';
    try {
      await createOrder(prisma, {
        ...payloadReplay,
        delivery: { zoneId: activeZone.id, address: 'MODIFIED ADDRESS DIFFERENT FROM FIRST' },
      });
    } catch (e: any) {
      if (e instanceof IdempotencyConflictError && e.statusCode === 409) {
        payloadConflictCaught = true;
        payloadConflictMsg = e.message;
      }
    }
    assert(payloadConflictCaught && payloadConflictMsg.includes('different order details'), 'T12: Reusing key with changed payload throws IdempotencyConflictError 409');

    // 13. Concurrent requests with same key: exactly 1 order in DB
    const keyConcurrent = randKey();
    const payloadConcurrent = {
      idempotencyKey: keyConcurrent,
      customer: { name: 'Concurrency Tester', phone: '03007654321' },
      delivery: { zoneId: activeZone.id, address: 'Thermal Road 5' },
      paymentMethod: 'COD' as const,
      items: [{ vegetableId: vegA.id, weightInKg: 2.0, quantity: 1, expectedPricePerKg: 100 }],
    };

    const [concA, concB] = await Promise.all([
      createOrder(prisma, payloadConcurrent),
      createOrder(prisma, payloadConcurrent),
    ]);
    const concurrentOrdersInDb = await prisma.order.count({ where: { idempotencyKey: keyConcurrent } });
    assert(concurrentOrdersInDb === 1, 'T13.1: Database uniqueness constraint ensures exactly 1 order in DB');
    assert(concA.order.id === concB.order.id, 'T13.2: Both concurrent requests return the same order ID');
    assert(concA.replayed === true || concB.replayed === true, 'T13.3: Concurrent race loser is replayed');

    // 14. Authenticated scoping: User Bob cannot replay User Alice's key
    const keyAlice = randKey();
    const payloadAlice = {
      idempotencyKey: keyAlice,
      customer: { name: 'Alice', phone: userAlice.phone || '03001110001' },
      delivery: { zoneId: activeZone.id, address: 'Alice Villa' },
      paymentMethod: 'COD' as const,
      items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1, expectedPricePerKg: 100 }],
    };
    await createOrder(prisma, payloadAlice, userAlice.id);

    let authScopingCaught = false;
    try {
      await createOrder(prisma, payloadAlice, userBob.id);
    } catch (e: any) {
      if (e instanceof IdempotencyConflictError && e.statusCode === 409) authScopingCaught = true;
    }
    assert(authScopingCaught, 'T14: User Bob cannot replay User Alice key (HTTP 409)');

    // 15. Cross-boundary scoping: Guest cannot replay an authenticated user's order
    let guestReplayAuthCaught = false;
    try {
      await createOrder(prisma, payloadAlice, null); // Guest attempt
    } catch (e: any) {
      if (e instanceof IdempotencyConflictError && e.statusCode === 409) guestReplayAuthCaught = true;
    }
    assert(guestReplayAuthCaught, 'T15: Guest cannot replay an authenticated order key (HTTP 409)');

    // 16. Cross-boundary scoping: Authenticated user cannot replay a guest's order
    const keyGuest = randKey();
    const payloadGuest = {
      idempotencyKey: keyGuest,
      customer: { name: 'Pure Guest', phone: '03129998888' },
      delivery: { zoneId: activeZone.id, address: 'Guest Quarters' },
      paymentMethod: 'COD' as const,
      items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1, expectedPricePerKg: 100 }],
    };
    await createOrder(prisma, payloadGuest, null);

    let authReplayGuestCaught = false;
    try {
      await createOrder(prisma, payloadGuest, userAlice.id);
    } catch (e: any) {
      if (e instanceof IdempotencyConflictError && e.statusCode === 409) authReplayGuestCaught = true;
    }
    assert(authReplayGuestCaught, 'T16: Authenticated user cannot replay a guest order key (HTTP 409)');

    // 17. Guest phone scoping: Guest with different phone cannot replay guest order
    let guestPhoneMismatchCaught = false;
    try {
      await createOrder(prisma, {
        ...payloadGuest,
        customer: { name: 'Different Guest', phone: '03120001111' },
      }, null);
    } catch (e: any) {
      if (e instanceof IdempotencyConflictError && e.statusCode === 409) guestPhoneMismatchCaught = true;
    }
    assert(guestPhoneMismatchCaught, 'T17: Guest replay with different phone rejected with 409');

    console.log('\n--- SECTION C: Price & Active Offer Compatibility ---');

    // 18. Active offer compatibility: when veg has offerPrice 150, sending expectedPricePerKg: 150 succeeds
    const keyOffer = randKey();
    const offerOrder = await createOrder(prisma, {
      idempotencyKey: keyOffer,
      customer: { name: 'Offer Buyer', phone: '03004443322' },
      delivery: { zoneId: activeZone.id, address: 'Bazar Area' },
      paymentMethod: 'COD',
      items: [{
        vegetableId: vegOffer.id,
        weightInKg: 2.0,
        quantity: 1,
        expectedPricePerKg: 150, // Matches authoritative offerPrice
      }],
    });
    // 2kg * 150 = 300
    assert(offerOrder.order.subtotal === 300, 'T18.1: Active offer price (Rs.150) applied without false stale-price error');
    assert(offerOrder.order.items[0].pricePerKg === 150, 'T18.2: OrderItem snapshot records authoritative offer price');

    // 19. Stale price rejection: customer submits old regular price (200) instead of active offer (150)
    let staleOfferCaught = false;
    let staleDetail: any = null;
    try {
      await createOrder(prisma, {
        idempotencyKey: randKey(),
        customer: { name: 'Stale Buyer', phone: '03004443322' },
        delivery: { zoneId: activeZone.id, address: 'Bazar Area' },
        paymentMethod: 'COD',
        items: [{
          vegetableId: vegOffer.id,
          weightInKg: 1.0,
          quantity: 1,
          expectedPricePerKg: 200, // Stale! Server price is 150
        }],
      });
    } catch (e: any) {
      if (e instanceof StalePriceError && e.statusCode === 409) {
        staleOfferCaught = true;
        staleDetail = e.priceChanges;
      }
    }
    assert(staleOfferCaught, 'T19.1: Stale price rejection throws StalePriceError 409');
    assert(
      Array.isArray(staleDetail) &&
      staleDetail[0].submittedPricePerKg === 200 &&
      staleDetail[0].currentPricePerKg === 150,
      'T19.2: StalePriceError exposes submitted (200) and authoritative (150) prices'
    );

    // 20. Multiple stale prices in single checkout
    let multiStaleCaught = false;
    let multiStaleList: any[] = [];
    try {
      await createOrder(prisma, {
        idempotencyKey: randKey(),
        customer: { name: 'Multi Stale', phone: '03004443322' },
        delivery: { zoneId: activeZone.id, address: 'Bazar Area' },
        paymentMethod: 'COD',
        items: [
          { vegetableId: vegA.id, weightInKg: 1.0, quantity: 1, expectedPricePerKg: 80 },    // current: 100
          { vegetableId: vegOffer.id, weightInKg: 1.0, quantity: 1, expectedPricePerKg: 200 }, // current: 150
        ],
      });
    } catch (e: any) {
      if (e instanceof StalePriceError) {
        multiStaleCaught = true;
        multiStaleList = e.priceChanges;
      }
    }
    assert(multiStaleCaught && multiStaleList.length === 2, 'T20: All stale items surfaced together in StalePriceError');

    // 21. Price & Fee Tampering Immunity
    const tamperOrder = await createOrder(prisma, {
      idempotencyKey: randKey(),
      customer: { name: 'Tamper Tester', phone: '03005554433' },
      delivery: { zoneId: activeZone.id, address: 'Canal View' },
      paymentMethod: 'COD',
      items: [{
        vegetableId: vegA.id,
        weightInKg: 1.0,
        quantity: 1,
        expectedPricePerKg: 100, // Valid
      }],
      // Extra untrusted fields attempted by attacker
      ...({ subtotal: 10, deliveryFee: 0, grandTotal: 10 } as any),
    });
    assert(tamperOrder.order.subtotal === 100, 'T21.1: Subtotal strictly calculated from DB price');
    assert(tamperOrder.order.deliveryFee === activeZone.deliveryFee, 'T21.2: Delivery fee strictly loaded from DB zone');
    assert(tamperOrder.order.grandTotal === 100 + activeZone.deliveryFee, 'T21.3: Grand total strictly calculated server-side');

    console.log('\n--- SECTION D: Real Express API-Level Tests (Supertest) ---');

    // 22. POST /api/v1/orders without idempotencyKey returns HTTP 400
    const apiMissingKey = await request(app)
      .post('/api/v1/orders')
      .send({
        customer: { name: 'API Tester', phone: '03009990001' },
        delivery: { zoneId: activeZone.id, address: 'API Street 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
    assert(apiMissingKey.status === 400, 'T22.1: API POST /orders without idempotencyKey returns HTTP 400');
    assert(
      JSON.stringify(apiMissingKey.body.details).includes('idempotencyKey'),
      'T22.2: API validation error specifies idempotencyKey field'
    );

    // 23. POST /api/v1/orders with short key returns HTTP 400
    const apiShortKey = await request(app)
      .post('/api/v1/orders')
      .send({
        idempotencyKey: 'tiny',
        customer: { name: 'API Tester', phone: '03009990001' },
        delivery: { zoneId: activeZone.id, address: 'API Street 1' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
    assert(apiShortKey.status === 400, 'T23: API POST /orders with short idempotencyKey returns HTTP 400');

    // 24. POST /api/v1/orders successful first checkout (HTTP 201)
    const apiKeyFirst = randKey();
    const apiFirstRes = await request(app)
      .post('/api/v1/orders')
      .send({
        idempotencyKey: apiKeyFirst,
        customer: { name: 'API Client', phone: '03009990002' },
        delivery: { zoneId: activeZone.id, address: 'API Street 2' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1, expectedPricePerKg: 100 }],
      });
    assert(apiFirstRes.status === 201, 'T24.1: API successful first checkout returns HTTP 201');
    assert(apiFirstRes.body.replayed === false, 'T24.2: API first checkout has replayed: false');
    assert(apiFirstRes.body.order?.orderNumber.startsWith('ORD-'), 'T24.3: API order response includes valid orderNumber');

    // 25. POST /api/v1/orders retry returns HTTP 200 with replayed: true
    const apiRetryRes = await request(app)
      .post('/api/v1/orders')
      .send({
        idempotencyKey: apiKeyFirst,
        customer: { name: 'API Client', phone: '03009990002' },
        delivery: { zoneId: activeZone.id, address: 'API Street 2' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1, expectedPricePerKg: 100 }],
      });
    assert(apiRetryRes.status === 200, 'T25.1: API retry returns HTTP 200');
    assert(apiRetryRes.body.replayed === true, 'T25.2: API retry has replayed: true');
    assert(apiRetryRes.body.order?.id === apiFirstRes.body.order?.id, 'T25.3: API retry returns identical order');

    // 26. POST /api/v1/orders retry with changed payload returns HTTP 409 IDEMPOTENCY_CONFLICT
    const apiConflictRes = await request(app)
      .post('/api/v1/orders')
      .send({
        idempotencyKey: apiKeyFirst,
        customer: { name: 'API Client', phone: '03009990002' },
        delivery: { zoneId: activeZone.id, address: 'DIFFERENT ADDRESS FOR CONFLICT' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1, expectedPricePerKg: 100 }],
      });
    assert(apiConflictRes.status === 409, 'T26.1: API payload change returns HTTP 409');
    assert(apiConflictRes.body.code === 'IDEMPOTENCY_CONFLICT', 'T26.2: API conflict returns code: IDEMPOTENCY_CONFLICT');

    // 27. POST /api/v1/orders stale price rejection returns HTTP 409 PRICE_CHANGED
    const apiStaleRes = await request(app)
      .post('/api/v1/orders')
      .send({
        idempotencyKey: randKey(),
        customer: { name: 'API Stale Client', phone: '03009990003' },
        delivery: { zoneId: activeZone.id, address: 'API Street 3' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1, expectedPricePerKg: 50 }], // Outdated!
      });
    assert(apiStaleRes.status === 409, 'T27.1: API stale price returns HTTP 409');
    assert(apiStaleRes.body.code === 'PRICE_CHANGED', 'T27.2: API stale price returns code: PRICE_CHANGED');
    assert(Array.isArray(apiStaleRes.body.priceChanges), 'T27.3: API response includes priceChanges array');

    // 28. POST /api/v1/orders non-COD rejection returns HTTP 400
    const apiNonCodRes = await request(app)
      .post('/api/v1/orders')
      .send({
        idempotencyKey: randKey(),
        customer: { name: 'Card User', phone: '03009990004' },
        delivery: { zoneId: activeZone.id, address: 'Card St' },
        paymentMethod: 'CARD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
    assert(apiNonCodRes.status === 400, 'T28: API non-COD payment method rejected with HTTP 400');

    // 29. Guest receipt lookup via UUID does not leak sensitive account data
    const guestOrderUuid = apiFirstRes.body.order?.uuid;
    const guestReceiptRes = await request(app).get(`/api/v1/orders/receipt/${guestOrderUuid}`);
    assert(guestReceiptRes.status === 200, 'T29.1: Guest receipt fetched via UUID returns HTTP 200');
    assert(!guestReceiptRes.body.order?.userId, 'T29.2: Guest receipt does NOT expose userId');

    console.log(`\n================================================================`);
    console.log(`Phase 3.1 Verification Audit Completed: ${passed} passed, ${failed} failed.`);
    console.log(`================================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
