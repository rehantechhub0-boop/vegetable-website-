/**
 * Non-destructive SQLite Data Exporter
 * Safely extracts all catalog, user, and order records from SQLite (dev.db) into a structured JSON file.
 * This file is then used by `import-pg-data.ts` to populate staging/production PostgreSQL.
 *
 * SAFETY GUARANTEE: Read-only access. Never modifies, deletes, or reseeds dev.db.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function exportSqliteData() {
  console.log('=== NON-DESTRUCTIVE SQLITE DATA EXPORT FOR POSTGRESQL MIGRATION ===\n');

  // Explicitly ensure connection points to dev.db in read-only intent
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  console.log(`Connecting to source database: ${dbUrl}`);

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    console.log('Querying existing records from SQLite...');

    // 1. Settings
    const settings = await prisma.setting.findMany();
    console.log(`- Settings: ${settings.length} records`);

    // 2. Users
    const users = await prisma.user.findMany();
    console.log(`- Users: ${users.length} records`);

    // 3. Delivery Zones
    const deliveryZones = await prisma.deliveryZone.findMany();
    console.log(`- Delivery Zones: ${deliveryZones.length} records`);

    // 4. Addresses
    const addresses = await prisma.address.findMany();
    console.log(`- Addresses: ${addresses.length} records`);

    // 5. Vegetables
    const vegetables = await prisma.vegetable.findMany();
    console.log(`- Vegetables: ${vegetables.length} records`);

    // 6. Vegetable Images
    const vegetableImages = await prisma.vegetableImage.findMany();
    console.log(`- Vegetable Images: ${vegetableImages.length} records`);

    // 7. Orders
    const orders = await prisma.order.findMany();
    console.log(`- Orders: ${orders.length} records`);

    // 8. Order Items
    const orderItems = await prisma.orderItem.findMany();
    console.log(`- Order Items: ${orderItems.length} records`);

    // 9. Order Status History
    const statusHistory = await prisma.orderStatusHistory.findMany();
    console.log(`- Order Status History: ${statusHistory.length} records`);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      sourceDatabase: dbUrl,
      recordCounts: {
        settings: settings.length,
        users: users.length,
        deliveryZones: deliveryZones.length,
        addresses: addresses.length,
        vegetables: vegetables.length,
        vegetableImages: vegetableImages.length,
        orders: orders.length,
        orderItems: orderItems.length,
        statusHistory: statusHistory.length,
      },
      data: {
        settings,
        users,
        deliveryZones,
        addresses,
        vegetables,
        vegetableImages,
        orders,
        orderItems,
        statusHistory,
      },
    };

    const outPath = path.resolve(process.cwd(), 'prisma/data_export_for_pg.json');
    fs.writeFileSync(outPath, JSON.stringify(exportPayload, null, 2), 'utf-8');

    console.log(`\nExport successfully written to: ${outPath}`);
    console.log(`Payload size: ${(fs.statSync(outPath).size / 1024).toFixed(2)} KB`);
    console.log('Source database was NOT modified.\n');
  } finally {
    await prisma.$disconnect();
  }
}

exportSqliteData().catch((err) => {
  console.error('[EXPORT ERROR]:', err);
  process.exit(1);
});
