/**
 * Automated PostgreSQL Runtime Verification Suite
 * Designed to execute against an isolated, disposable PostgreSQL database.
 *
 * SAFETY GUARDS:
 * 1. Requires valid postgresql:// connection string.
 * 2. Strictly rejects any SQLite connection string or dev.db/test.db path.
 * 3. Never mutates local files.
 *
 * EXECUTION:
 *   DATABASE_URL="postgresql://user:pass@host:5432/disposable_db?sslmode=require" tsx src/tests/pg-runtime-verification.ts
 */

import { PrismaClient as PGPrismaClient } from '../generated/pg-client/index.js';
import fs from 'fs';
import path from 'path';

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

async function runPgVerification() {
  console.log('\n=============================================================');
  console.log('=== DISPOSABLE POSTGRESQL RUNTIME COMPATIBILITY SUITE ===');
  console.log('=============================================================\n');

  const targetUrl = process.env.DATABASE_URL || '';

  // ─────────────────────────────────────────────────────────────────────────
  // SAFETY CHECK
  // ─────────────────────────────────────────────────────────────────────────
  if (!targetUrl.startsWith('postgresql://') && !targetUrl.startsWith('postgres://')) {
    console.error('[SAFETY ABORT] Refusing execution: DATABASE_URL must start with "postgresql://" or "postgres://".');
    console.error(`Received: "${targetUrl}"`);
    console.error('To run this verification, provide an authorized disposable PostgreSQL database URL:');
    console.error('  npx cross-env DATABASE_URL="postgresql://..." tsx src/tests/pg-runtime-verification.ts\n');
    process.exit(1);
  }

  if (targetUrl.includes('dev.db') || targetUrl.includes('test.db') || targetUrl.includes('file:')) {
    console.error('[SAFETY ABORT] Fatal: target URL points to SQLite dev/test database! Aborting.');
    process.exit(1);
  }

  try {
    const parsed = new URL(targetUrl);
    console.log(`Targeting PostgreSQL instance: host=${parsed.host}, db=${parsed.pathname.replace(/^\//, '')}, user=${parsed.username || 'default'}`);
  } catch {
    console.log(`Targeting PostgreSQL instance: ${targetUrl.replace(/:[^:@]+@/, ':****@')}`);
  }

  const prisma = new PGPrismaClient({
    datasources: { db: { url: targetUrl } },
  });

  try {
    // 0. PostgreSQL Version & Connection Check
    console.log('\n--- 0. POSTGRESQL ENGINE VERSION CHECK ---');
    const versionRes: any[] = await prisma.$queryRawUnsafe('SELECT version();');
    const pgVersionStr = String(versionRes[0]?.version || '');
    console.log(`PostgreSQL Engine: ${pgVersionStr.split('\n')[0]}`);
    assert(pgVersionStr.toLowerCase().includes('postgresql'), 'Connected to verified PostgreSQL database engine');
    // ─────────────────────────────────────────────────────────────────────────
    // 1. CONNECTION & SCHEMA INTEGRITY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. SCHEMA INTEGRITY & TABLE VERIFICATION ---');
    const tableCheck: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const existingTables = tableCheck.map((t: any) => t.table_name);
    console.log(`Discovered ${existingTables.length} tables in PostgreSQL public schema.`);

    const requiredTables = [
      'User',
      'Address',
      'Vegetable',
      'VegetableImage',
      'DeliveryZone',
      'Order',
      'OrderItem',
      'OrderStatusHistory',
      'Setting',
    ];

    for (const table of requiredTables) {
      assert(existingTables.includes(table), `Table exists in PostgreSQL: "${table}"`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. DATA IMPORT & ROW-COUNT COMPARISON
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. ROW-COUNT COMPARISON WITH FIXTURE PAYLOAD ---');
    const fixturePath = process.env.IMPORT_FIXTURE_PATH || 'prisma/staging_synthetic_fixtures.json';
    const exportPath = path.resolve(process.cwd(), fixturePath);
    if (!fs.existsSync(exportPath)) {
      console.error(`[SKIP] Fixture file not found at ${exportPath}. Skipping payload comparison.`);
    } else {
      const payload = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
      const counts = payload.recordCounts || {
        settings: payload.data?.settings?.length || 0,
        users: payload.data?.users?.length || 0,
        deliveryZones: payload.data?.deliveryZones?.length || 0,
        vegetables: payload.data?.vegetables?.length || 0,
        vegetableImages: payload.data?.vegetableImages?.length || 0,
        orders: payload.data?.orders?.length || 0,
        orderItems: payload.data?.orderItems?.length || 0,
        statusHistory: payload.data?.statusHistory?.length || 0,
      };

      const [
        pgSettings,
        pgUsers,
        pgZones,
        pgVegetables,
        pgImages,
        pgOrders,
        pgItems,
        pgHistory,
      ] = await Promise.all([
        prisma.setting.count(),
        prisma.user.count(),
        prisma.deliveryZone.count(),
        prisma.vegetable.count(),
        prisma.vegetableImage.count(),
        prisma.order.count(),
        prisma.orderItem.count(),
        prisma.orderStatusHistory.count(),
      ]);

      assert(pgSettings >= counts.settings, `Settings row count match: ${pgSettings} >= ${counts.settings}`);
      assert(pgUsers >= counts.users, `Users row count match: ${pgUsers} >= ${counts.users}`);
      assert(pgZones >= counts.deliveryZones, `Delivery zones match: ${pgZones} >= ${counts.deliveryZones}`);
      assert(pgVegetables >= counts.vegetables, `Vegetables row count match: ${pgVegetables} >= ${counts.vegetables}`);
      assert(pgImages >= counts.vegetableImages, `Images row count match: ${pgImages} >= ${counts.vegetableImages}`);
      assert(pgOrders >= counts.orders, `Orders row count match: ${pgOrders} >= ${counts.orders}`);
      assert(pgItems >= counts.orderItems, `Order items match: ${pgItems} >= ${counts.orderItems}`);
      assert(pgHistory >= counts.statusHistory, `Status history match: ${pgHistory} >= ${counts.statusHistory}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. FOREIGN KEY & CASCADE INTEGRITY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. FOREIGN KEY INTEGRITY ---');
    const orphanedItems: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count 
      FROM "OrderItem" oi 
      LEFT JOIN "Order" o ON oi."orderId" = o.id 
      WHERE o.id IS NULL;
    `);
    const orphanedCount = parseInt(orphanedItems[0]?.count || '0', 10);
    assert(orphanedCount === 0, `No orphaned OrderItems found (count: ${orphanedCount})`);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. SEQUENCE CORRECTNESS (AUTO-INCREMENT VERIFICATION)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. POSTGRESQL SEQUENCE SYNCHRONIZATION ---');
    const maxOrder = await prisma.order.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    const currentMaxId = maxOrder ? maxOrder.id : 0;
    console.log(`Current maximum Order.id in PostgreSQL: ${currentMaxId}`);

    // Create a new order with auto-generated id
    const testZone = await prisma.deliveryZone.findFirst({ where: { isActive: true } });
    assert(!!testZone, 'Active DeliveryZone exists for sequence test');

    if (testZone) {
      const newOrder = await prisma.order.create({
        data: {
          customerName: 'PG Sequence Test Customer',
          customerPhone: '03009999999',
          deliveryAddress: 'Test Address for PG Sequence',
          deliveryZoneId: testZone.id,
          subtotal: 500,
          deliveryFee: testZone.deliveryFee,
          grandTotal: 500 + testZone.deliveryFee,
          paymentMethod: 'COD',
          paymentStatus: 'PENDING',
          orderStatus: 'NEW',
          idempotencyKey: `pg-seq-test-${Date.now()}`,
        },
      });

      assert(
        newOrder.id > currentMaxId,
        `Sequence generated new Order.id without collision: ${newOrder.id} > ${currentMaxId}`
      );

      // Clean up sequence test order
      await prisma.order.delete({ where: { id: newOrder.id } });
      assert(true, 'Cleaned up temporary sequence test order');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. VEGETABLE CATALOG BROWSING & CASE-INSENSITIVE SEARCH
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. VEGETABLE CATALOG & SEARCH BEHAVIOR ---');
    const firstVeg = await prisma.vegetable.findFirst({
      include: { images: true },
    });
    assert(!!firstVeg, 'Vegetable catalog query succeeds with relations');
    assert(Array.isArray(firstVeg?.images), 'Vegetable images array successfully returned');

    // Case-insensitive query test in PostgreSQL
    if (firstVeg) {
      const searchTerm = firstVeg.name.slice(0, 4).toLowerCase();
      const searchRes = await prisma.vegetable.findMany({
        where: {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          } as any,
        },
      });
      assert(
        searchRes.length > 0,
        `PostgreSQL mode: 'insensitive' query works (found ${searchRes.length} items for "${searchTerm}")`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. IDEMPOTENCY UNIQUE CONSTRAINT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. IDEMPOTENCY UNIQUE CONSTRAINT ENFORCEMENT ---');
    const testKey = `pg-idemp-test-${Date.now()}`;
    const firstIdempOrder = await prisma.order.create({
      data: {
        customerName: 'Idemp PG Test',
        customerPhone: '03001112233',
        deliveryAddress: 'Idemp Test Address',
        deliveryZoneId: testZone?.id || null,
        subtotal: 300,
        deliveryFee: 50,
        grandTotal: 350,
        idempotencyKey: testKey,
      },
    });
    assert(!!firstIdempOrder.id, 'First order with idempotencyKey created');

    // Attempt second order with same key -> should violate unique constraint
    let caughtDuplicate = false;
    try {
      await prisma.order.create({
        data: {
          customerName: 'Duplicate Idemp',
          customerPhone: '03001112233',
          deliveryAddress: 'Duplicate Address',
          deliveryZoneId: testZone?.id || null,
          subtotal: 300,
          deliveryFee: 50,
          grandTotal: 350,
          idempotencyKey: testKey,
        },
      });
    } catch (dupErr: any) {
      caughtDuplicate = true;
      assert(
        dupErr.code === 'P2002' || dupErr.message.includes('Unique constraint'),
        'PostgreSQL strictly enforces unique constraint on idempotencyKey (P2002)'
      );
    }
    assert(caughtDuplicate === true, 'Duplicate idempotencyKey rejected by PostgreSQL');

    // Clean up
    await prisma.order.delete({ where: { id: firstIdempOrder.id } });

    // ─────────────────────────────────────────────────────────────────────────
    // 7. TRANSACTION ROLLBACK VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. TRANSACTION ATOMICITY & ROLLBACK VERIFICATION ---');
    const rollbackSlug = `pg-rollback-test-${Date.now()}`;
    let rollbackTriggered = false;

    try {
      await prisma.$transaction(async (tx: any) => {
        // Step A: Insert a record
        await tx.vegetable.create({
          data: {
            name: 'Rollback Test Vegetable',
            slug: rollbackSlug,
            description: 'Should not exist after rollback',
            pricePerKg: 100,
          },
        });

        // Step B: Intentionally throw an error to trigger rollback
        throw new Error('INTENTIONAL_ROLLBACK_TRIGGER');
      });
    } catch (rbErr: any) {
      if (rbErr.message === 'INTENTIONAL_ROLLBACK_TRIGGER') {
        rollbackTriggered = true;
      }
    }

    assert(rollbackTriggered, 'Transaction threw intentional exception');

    // Verify record was rolled back and does not exist
    const rolledBackRecord = await prisma.vegetable.findUnique({
      where: { slug: rollbackSlug },
    });
    assert(rolledBackRecord === null, 'Pre-rollback insert was rolled back completely (atomic isolation verified)');

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n=============================================================');
    console.log(`POSTGRESQL RUNTIME SUITE: ${passed} passed, ${failed} failed`);
    console.log('=============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } finally {
    await prisma.$disconnect();
  }
}

runPgVerification().catch((err) => {
  console.error('[UNHANDLED PG TEST ERROR]:', err);
  process.exit(1);
});
