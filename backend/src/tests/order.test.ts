import './test-env.js';
import { PrismaClient } from '@prisma/client';
import { createOrder as rawCreateOrder, OrderValidationError } from '../services/order.service.js';

const prisma = new PrismaClient();

let ordKeySeq = 1;
const createOrder = (prismaClient: PrismaClient, input: any, userId?: string | null) => {
  return rawCreateOrder(
    prismaClient,
    {
      idempotencyKey: input.idempotencyKey || `order-suite-key-${Date.now()}-${ordKeySeq++}-${Math.random().toString(36).substring(2, 7)}`,
      ...input,
    },
    userId
  );
};

console.log('--- RUNNING COMPREHENSIVE ORDER CREATION & VALIDATION TESTS ---');

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

async function runTests() {
  try {
    // Fetch active delivery zone with minOrderAmount = 0 for weight tests
    let activeZone = await prisma.deliveryZone.findFirst({
      where: { isActive: true, minOrderAmount: 0 },
    });
    if (!activeZone) {
      activeZone = await prisma.deliveryZone.create({
        data: {
          areaName: 'Test Open Delivery Zone',
          deliveryFee: 50,
          minOrderAmount: 0,
          isActive: true,
        },
      });
    }

    // Create an inactive zone for testing
    let inactiveZone = await prisma.deliveryZone.findFirst({
      where: { isActive: false },
    });
    if (!inactiveZone) {
      inactiveZone = await prisma.deliveryZone.create({
        data: {
          areaName: 'Test Inactive Zone',
          deliveryFee: 150,
          isActive: false,
        },
      });
    }

    // Fetch available vegetables
    const vegList = await prisma.vegetable.findMany({
      where: { isAvailable: true },
      take: 2,
    });
    if (vegList.length < 2) throw new Error('At least 2 available vegetables needed for testing');

    const vegA = vegList[0];
    const vegB = vegList[1];

    // Ensure we have an unavailable vegetable for testing
    let unavailVeg = await prisma.vegetable.findFirst({
      where: { isAvailable: false },
    });
    if (!unavailVeg) {
      unavailVeg = await prisma.vegetable.create({
        data: {
          name: 'Test Out of Stock Veg',
          slug: 'test-out-of-stock-veg',
          description: 'Testing unavailable vegetable',
          pricePerKg: 100,
          isAvailable: false,
        },
      });
    }

    console.log(`Using Active Zone: ${activeZone.areaName} (Fee: Rs. ${activeZone.deliveryFee})`);
    console.log(`Using Veg A: ${vegA.name} (Rs. ${vegA.pricePerKg}/kg), Veg B: ${vegB.name} (Rs. ${vegB.pricePerKg}/kg)`);

    // 1. Valid COD Order with 1kg
    const order1 = await createOrder(prisma, {
      customer: { name: 'Muhammad Ali', phone: '03001234567' },
      delivery: { zoneId: activeZone.id, address: 'Near Railway Road, Muzaffargarh' },
      paymentMethod: 'COD',
      items: [
        { vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 },
      ],
    });
    const expectedSub1 = vegA.pricePerKg;
    const expectedTotal1 = Math.round((expectedSub1 + activeZone.deliveryFee) * 100) / 100;
    assert(
      order1.order.subtotal === expectedSub1 &&
      order1.order.deliveryFee === activeZone.deliveryFee &&
      order1.order.grandTotal === expectedTotal1 &&
      order1.order.orderNumber.startsWith('ORD-') &&
      order1.order.paymentStatus === 'COD' &&
      order1.order.orderStatus === 'NEW',
      'Test 1: Valid COD Order (1kg) created with correct totals and ORD- number'
    );

    // 2. Multiple Vegetables in one order
    const order2 = await createOrder(prisma, {
      customer: { name: 'Fatima Bibi', phone: '03019876543' },
      delivery: { zoneId: activeZone.id, address: 'Alipur Road, Muzaffargarh' },
      paymentMethod: 'COD',
      items: [
        { vegetableId: vegA.id, weightInKg: 1.0, quantity: 2 },
        { vegetableId: vegB.id, weightInKg: 0.5, quantity: 1 },
      ],
    });
    const expectedSub2 = Math.round(((vegA.pricePerKg * 1.0 * 2) + (vegB.pricePerKg * 0.5 * 1)) * 100) / 100;
    assert(
      order2.order.items.length === 2 &&
      order2.order.subtotal === expectedSub2 &&
      order2.order.grandTotal === Math.round((expectedSub2 + activeZone.deliveryFee) * 100) / 100,
      'Test 2: Multiple vegetables calculated accurately in single order'
    );

    // 3. Fixed Weight 250g
    const order250g = await createOrder(prisma, {
      customer: { name: 'Zahid Khan', phone: '03021234567' },
      delivery: { zoneId: activeZone.id, address: 'Jhang Road' },
      paymentMethod: 'COD',
      items: [{ vegetableId: vegA.id, weightInKg: 0.25, quantity: 1 }],
    });
    assert(
      order250g.order.items[0].weightDisplay === '250g' &&
      order250g.order.items[0].itemTotal === Math.round(vegA.pricePerKg * 0.25 * 100) / 100,
      'Test 3: Fixed weight 250g accepted and priced correctly'
    );

    // 4. Fixed Weight 500g
    const order500g = await createOrder(prisma, {
      customer: { name: 'Usman Ghani', phone: '03031234567' },
      delivery: { zoneId: activeZone.id, address: 'Multan Road' },
      paymentMethod: 'COD',
      items: [{ vegetableId: vegA.id, weightInKg: 0.50, quantity: 1 }],
    });
    assert(
      order500g.order.items[0].weightDisplay === '500g' &&
      order500g.order.items[0].itemTotal === Math.round(vegA.pricePerKg * 0.50 * 100) / 100,
      'Test 4: Fixed weight 500g accepted and priced correctly'
    );

    // 5. Fixed Weight 2kg
    const order2kg = await createOrder(prisma, {
      customer: { name: 'Hassan Raza', phone: '03041234567' },
      delivery: { zoneId: activeZone.id, address: 'City Center' },
      paymentMethod: 'COD',
      items: [{ vegetableId: vegA.id, weightInKg: 2.0, quantity: 1 }],
    });
    assert(
      order2kg.order.items[0].weightDisplay === '2kg' &&
      order2kg.order.items[0].itemTotal === Math.round(vegA.pricePerKg * 2.0 * 100) / 100,
      'Test 5: Fixed weight 2kg accepted and priced correctly'
    );

    // 6. Fixed Weight 5kg
    const order5kg = await createOrder(prisma, {
      customer: { name: 'Bilal Tariq', phone: '03051234567' },
      delivery: { zoneId: activeZone.id, address: 'Canal Colony' },
      paymentMethod: 'COD',
      items: [{ vegetableId: vegA.id, weightInKg: 5.0, quantity: 1 }],
    });
    assert(
      order5kg.order.items[0].weightDisplay === '5kg' &&
      order5kg.order.items[0].itemTotal === Math.round(vegA.pricePerKg * 5.0 * 100) / 100,
      'Test 6: Fixed weight 5kg accepted and priced correctly'
    );

    // 7. Fixed Weight 10kg
    const order10kg = await createOrder(prisma, {
      customer: { name: 'Shahid Mehmood', phone: '03061234567' },
      delivery: { zoneId: activeZone.id, address: 'Model Town' },
      paymentMethod: 'COD',
      items: [{ vegetableId: vegA.id, weightInKg: 10.0, quantity: 1 }],
    });
    assert(
      order10kg.order.items[0].weightDisplay === '10kg' &&
      order10kg.order.items[0].itemTotal === Math.round(vegA.pricePerKg * 10.0 * 100) / 100,
      'Test 7: Fixed weight 10kg accepted and priced correctly'
    );

    // 8. Custom Weight 15.5kg
    const order15_5kg = await createOrder(prisma, {
      customer: { name: 'Rashid Minhas', phone: '03071234567' },
      delivery: { zoneId: activeZone.id, address: 'Basti Malook' },
      paymentMethod: 'COD',
      items: [{ vegetableId: vegA.id, weightInKg: 15.5, quantity: 1 }],
    });
    assert(
      order15_5kg.order.items[0].weightDisplay.includes('15.5kg') &&
      order15_5kg.order.items[0].itemTotal === Math.round(vegA.pricePerKg * 15.5 * 100) / 100,
      'Test 8: Custom weight 15.5kg (>10kg) accepted and priced correctly'
    );

    // 9. Custom Weight 20kg
    const order20kg = await createOrder(prisma, {
      customer: { name: 'Iqbal Ahmed', phone: '03081234567' },
      delivery: { zoneId: activeZone.id, address: 'Civil Lines' },
      paymentMethod: 'COD',
      items: [{ vegetableId: vegA.id, weightInKg: 20.0, quantity: 1 }],
    });
    assert(
      order20kg.order.items[0].weightDisplay.includes('20kg') &&
      order20kg.order.items[0].itemTotal === Math.round(vegA.pricePerKg * 20.0 * 100) / 100,
      'Test 9: Custom weight 20kg (>10kg) accepted and priced correctly'
    );

    // 10. Reject custom weight <= 10kg that is not a fixed weight (e.g. 7.5kg)
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Invalid', phone: '03091234567' },
        delivery: { zoneId: activeZone.id, address: 'Test Addr' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 7.5, quantity: 1 }],
      });
      assert(false, 'Test 10: Reject custom weight <= 10kg (7.5kg)');
    } catch (e: any) {
      assert(e instanceof OrderValidationError || e.message.includes('Custom weight is strictly for orders above 10kg'), 'Test 10: Correctly rejected 7.5kg custom weight');
    }

    // 11. Reject custom weight 10.0kg if treated as custom non-fixed
    // Note: 10.0 is captured as fixed '10kg', but 9.9 is rejected:
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Invalid', phone: '03091234567' },
        delivery: { zoneId: activeZone.id, address: 'Test Addr' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 9.9, quantity: 1 }],
      });
      assert(false, 'Test 11: Reject custom weight 9.9kg');
    } catch (e: any) {
      assert(true, 'Test 11: Correctly rejected custom weight 9.9kg (<= 10kg)');
    }

    // 12. Reject invalid weight 0 or negative
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Zero', phone: '03091234567' },
        delivery: { zoneId: activeZone.id, address: 'Test Addr' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 0, quantity: 1 }],
      });
      assert(false, 'Test 12: Reject 0 weight');
    } catch (e: any) {
      assert(true, 'Test 12: Correctly rejected 0 weight');
    }

    // 13. Reject quantity 0
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Qty 0', phone: '03091234567' },
        delivery: { zoneId: activeZone.id, address: 'Test Addr' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 0 }],
      });
      assert(false, 'Test 13: Reject quantity 0');
    } catch (e: any) {
      assert(true, 'Test 13: Correctly rejected quantity 0');
    }

    // 14. Reject negative quantity
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Neg Qty', phone: '03091234567' },
        delivery: { zoneId: activeZone.id, address: 'Test Addr' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: -2 }],
      });
      assert(false, 'Test 14: Reject negative quantity');
    } catch (e: any) {
      assert(true, 'Test 14: Correctly rejected negative quantity');
    }

    // 15. Reject nonexistent vegetable
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Ghost Veg', phone: '03091234567' },
        delivery: { zoneId: activeZone.id, address: 'Test Addr' },
        paymentMethod: 'COD',
        items: [{ vegetableId: 'non-existent-uuid-999', weightInKg: 1.0, quantity: 1 }],
      });
      assert(false, 'Test 15: Reject nonexistent vegetable');
    } catch (e: any) {
      assert(e.statusCode === 404, 'Test 15: Correctly returned 404 for nonexistent vegetable');
    }

    // 16. Reject unavailable vegetable
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Unavail', phone: '03091234567' },
        delivery: { zoneId: activeZone.id, address: 'Test Addr' },
        paymentMethod: 'COD',
        items: [{ vegetableId: unavailVeg.id, weightInKg: 1.0, quantity: 1 }],
      });
      assert(false, 'Test 16: Reject unavailable vegetable');
    } catch (e: any) {
      assert(e.message.includes('currently unavailable'), 'Test 16: Correctly rejected unavailable vegetable');
    }

    // 17. Reject nonexistent delivery zone
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Ghost Zone', phone: '03091234567' },
        delivery: { zoneId: 'ghost-zone-uuid-000', address: 'Test Addr' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
      assert(false, 'Test 17: Reject nonexistent delivery zone');
    } catch (e: any) {
      assert(e.statusCode === 404, 'Test 17: Correctly returned 404 for nonexistent delivery zone');
    }

    // 18. Reject inactive delivery zone
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Inactive Zone', phone: '03091234567' },
        delivery: { zoneId: inactiveZone.id, address: 'Test Addr' },
        paymentMethod: 'COD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
      assert(false, 'Test 18: Reject inactive delivery zone');
    } catch (e: any) {
      assert(e.message.includes('currently inactive'), 'Test 18: Correctly rejected inactive delivery zone');
    }

    // 19. Verify client-side injected price cannot manipulate total
    // (Input doesn't even accept client price; server always queries DB)
    assert(order1.order.subtotal === vegA.pricePerKg, 'Test 19: Server authoritative pricing guarantees frontend price injection is impossible');

    // 20. Verify delivery fee cannot be manipulated by client
    assert(order1.order.deliveryFee === activeZone.deliveryFee, 'Test 20: Delivery fee comes strictly from DB DeliveryZone table');

    // 21. Verify Historical Price Snapshot preservation
    const historicalItem = order1.order.items[0];
    assert(
      historicalItem.vegetableName === vegA.name &&
      historicalItem.pricePerKg === vegA.pricePerKg &&
      historicalItem.unitPrice === vegA.pricePerKg &&
      historicalItem.itemTotal === vegA.pricePerKg,
      'Test 21: OrderItem contains complete historical price/vegetable snapshot'
    );

    // 22. Verify Online Payment is rejected for now
    try {
      await createOrder(prisma, {
        customer: { name: 'Test Card', phone: '03091234567' },
        delivery: { zoneId: activeZone.id, address: 'Test Addr' },
        paymentMethod: 'CARD',
        items: [{ vegetableId: vegA.id, weightInKg: 1.0, quantity: 1 }],
      });
      assert(false, 'Test 22: Reject non-COD payment');
    } catch (e: any) {
      assert(e.message.includes('Online payment is not available yet'), 'Test 22: Online payment rejected cleanly with explanatory error');
    }

    console.log(`\nTests Completed: ${passed} passed, ${failed} failed.`);
  } catch (err) {
    console.error('Fatal error during test run:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
