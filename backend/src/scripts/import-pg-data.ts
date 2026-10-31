/**
 * PostgreSQL Data Importer
 * Safely imports exported JSON records into a target PostgreSQL database (staging or production).
 *
 * SAFETY GUARDS:
 * 1. Strictly refuses to execute against SQLite databases (dev.db or test.db).
 * 2. Requires explicit confirmation and valid PostgreSQL DATABASE_URL.
 * 3. Preserves all foreign key relationships and resets PostgreSQL autoincrement sequences.
 */

import { PrismaClient as PGPrismaClient } from '../generated/pg-client/index.js';
import fs from 'fs';
import path from 'path';

async function importPostgresData() {
  console.log('=== TARGETED POSTGRESQL DATA IMPORTER ===\n');

  const targetDbUrl = process.env.DATABASE_URL || '';

  // SAFETY GUARD 1: Verify protocol
  if (!targetDbUrl.startsWith('postgresql://') && !targetDbUrl.startsWith('postgres://')) {
    console.error('[SAFETY ABORT] Refusing to run importer! DATABASE_URL must start with "postgresql://" or "postgres://".');
    console.error(`Received: "${targetDbUrl}"`);
    process.exit(1);
  }

  // SAFETY GUARD 2: Explicitly reject SQLite paths
  if (targetDbUrl.includes('dev.db') || targetDbUrl.includes('test.db') || targetDbUrl.includes('file:')) {
    console.error('[SAFETY ABORT] Fatal error: target database URL references SQLite files! Aborting immediately.');
    process.exit(1);
  }

  // SAFETY GUARD 3: Explicit authorization for disposable staging import
  if (process.env.CONFIRM_DISPOSABLE_STAGING !== 'true') {
    console.error('[SAFETY ABORT] Refusing import without explicit authorization!');
    console.error('To import synthetic test fixtures into an authorized disposable database, set:');
    console.error('CONFIRM_DISPOSABLE_STAGING=true npm run db:import:pg\n');
    process.exit(1);
  }

  // Use synthetic fixtures by default to guarantee zero customer PII
  const fixturePath = process.env.IMPORT_FIXTURE_PATH || 'prisma/staging_synthetic_fixtures.json';
  const exportPath = path.resolve(process.cwd(), fixturePath);
  if (!fs.existsSync(exportPath)) {
    console.error(`[ERROR] Fixture file not found at: ${exportPath}`);
    console.error('Please ensure prisma/staging_synthetic_fixtures.json exists or provide IMPORT_FIXTURE_PATH.');
    process.exit(1);
  }

  const rawJson = fs.readFileSync(exportPath, 'utf-8');
  const payload = JSON.parse(rawJson);
  const data = payload.data;

  try {
    const parsed = new URL(targetDbUrl);
    console.log(`Connecting to PostgreSQL target database: host=${parsed.host}, db=${parsed.pathname.replace(/^\//, '')}, user=${parsed.username || 'default'}`);
  } catch {
    console.log(`Connecting to PostgreSQL target: ${targetDbUrl.replace(/:[^:@]+@/, ':****@')}`);
  }

  const prisma = new PGPrismaClient({
    datasources: { db: { url: targetDbUrl } },
  });

  try {
    console.log('Beginning transactional PostgreSQL data import in strict dependency order...\n');

    await prisma.$transaction(async (tx) => {
      // 1. Settings
      console.log(`Importing ${data.settings.length} Settings...`);
      for (const s of data.settings) {
        await tx.setting.upsert({
          where: { key: s.key },
          create: {
            key: s.key,
            value: s.value,
            group: s.group || 'general',
            description: s.description || null,
            updatedAt: new Date(s.updatedAt),
          },
          update: {
            value: s.value,
            group: s.group || 'general',
            description: s.description || null,
            updatedAt: new Date(s.updatedAt),
          },
        });
      }

      // 2. Users
      console.log(`Importing ${data.users.length} Users...`);
      for (const u of data.users) {
        await tx.user.upsert({
          where: { id: u.id },
          create: {
            id: u.id,
            name: u.name,
            email: u.email || null,
            phone: u.phone || null,
            passwordHash: u.passwordHash || null,
            googleId: u.googleId || null,
            role: u.role || 'CUSTOMER',
            tokenVersion: u.tokenVersion || 0,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
          },
          update: {},
        });
      }

      // 3. Delivery Zones
      console.log(`Importing ${data.deliveryZones.length} Delivery Zones...`);
      for (const z of data.deliveryZones) {
        await tx.deliveryZone.upsert({
          where: { id: z.id },
          create: {
            id: z.id,
            areaName: z.areaName,
            deliveryFee: z.deliveryFee,
            minOrderAmount: z.minOrderAmount,
            estimatedDeliveryTime: z.estimatedDeliveryTime,
            isActive: z.isActive,
            createdAt: new Date(z.createdAt),
            updatedAt: new Date(z.updatedAt),
          },
          update: {},
        });
      }

      // 4. Addresses
      console.log(`Importing ${data.addresses.length} Addresses...`);
      for (const a of data.addresses) {
        await tx.address.upsert({
          where: { id: a.id },
          create: {
            id: a.id,
            userId: a.userId,
            fullName: a.fullName,
            phone: a.phone,
            deliveryZoneId: a.deliveryZoneId || null,
            streetAddress: a.streetAddress,
            landmark: a.landmark || null,
            isDefault: a.isDefault,
            createdAt: new Date(a.createdAt),
          },
          update: {},
        });
      }

      // 5. Vegetables
      console.log(`Importing ${data.vegetables.length} Vegetables...`);
      for (const v of data.vegetables) {
        await tx.vegetable.upsert({
          where: { id: v.id },
          create: {
            id: v.id,
            name: v.name,
            slug: v.slug,
            description: v.description,
            pricePerKg: v.pricePerKg,
            isAvailable: v.isAvailable,
            isFeatured: v.isFeatured,
            isOffer: v.isOffer,
            offerPrice: v.offerPrice || null,
            createdAt: new Date(v.createdAt),
            updatedAt: new Date(v.updatedAt),
          },
          update: {},
        });
      }

      // 6. Vegetable Images
      console.log(`Importing ${data.vegetableImages.length} Vegetable Images...`);
      for (const vi of data.vegetableImages) {
        await tx.vegetableImage.upsert({
          where: { id: vi.id },
          create: {
            id: vi.id,
            vegetableId: vi.vegetableId,
            url: vi.url,
            thumbnailUrl: vi.thumbnailUrl || null,
            isPrimary: vi.isPrimary,
            orderIndex: vi.orderIndex,
            createdAt: new Date(vi.createdAt),
          },
          update: {},
        });
      }

      // 7. Orders
      console.log(`Importing ${data.orders.length} Orders...`);
      for (const o of data.orders) {
        await tx.order.upsert({
          where: { id: o.id },
          create: {
            id: o.id,
            uuid: o.uuid,
            userId: o.userId || null,
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            deliveryAddress: o.deliveryAddress,
            deliveryZoneId: o.deliveryZoneId || null,
            deliveryNotes: o.deliveryNotes || null,
            subtotal: o.subtotal,
            deliveryFee: o.deliveryFee,
            grandTotal: o.grandTotal,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            paymentTxnRef: o.paymentTxnRef || null,
            orderStatus: o.orderStatus,
            whatsappSent: o.whatsappSent,
            idempotencyKey: o.idempotencyKey || null,
            idempotencyPayloadHash: o.idempotencyPayloadHash || null,
            createdAt: new Date(o.createdAt),
            updatedAt: new Date(o.updatedAt),
          },
          update: {},
        });
      }

      // 8. Order Items
      console.log(`Importing ${data.orderItems.length} Order Items...`);
      for (const oi of data.orderItems) {
        await tx.orderItem.upsert({
          where: { id: oi.id },
          create: {
            id: oi.id,
            orderId: oi.orderId,
            vegetableId: oi.vegetableId || null,
            vegetableName: oi.vegetableName,
            vegetableImage: oi.vegetableImage || null,
            pricePerKg: oi.pricePerKg,
            weightDisplay: oi.weightDisplay,
            weightInKg: oi.weightInKg,
            unitPrice: oi.unitPrice || 0,
            quantity: oi.quantity || 1,
            itemTotal: oi.itemTotal,
          },
          update: {},
        });
      }

      // 9. Order Status History
      console.log(`Importing ${data.statusHistory.length} Order Status History entries...`);
      for (const sh of data.statusHistory) {
        await tx.orderStatusHistory.upsert({
          where: { id: sh.id },
          create: {
            id: sh.id,
            orderId: sh.orderId,
            fromStatus: sh.fromStatus || null,
            toStatus: sh.toStatus,
            note: sh.note || null,
            createdAt: new Date(sh.createdAt),
          },
          update: {},
        });
      }

      // 10. PostgreSQL Sequence Synchronization for Order.id
      console.log('Synchronizing PostgreSQL serial sequence for Order table...');
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"Order"', 'id'), coalesce((SELECT MAX(id) FROM "Order"), 1), (SELECT COUNT(*) > 0 FROM "Order"));`
      );
    });

    console.log('\n[SUCCESS] All records successfully migrated to PostgreSQL.');
  } finally {
    await prisma.$disconnect();
  }
}

importPostgresData().catch((err) => {
  console.error('[IMPORT ERROR]:', err);
  process.exit(1);
});
