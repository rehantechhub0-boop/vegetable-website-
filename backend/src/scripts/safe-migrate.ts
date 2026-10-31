import { PrismaClient } from '@prisma/client';

async function safeMigrateDatabase(dbUrl: string, dbName: string) {
  console.log(`Checking schema for ${dbName} (${dbUrl})...`);
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;');
      console.log(`[${dbName}] Added column idempotencyKey`);
    } catch (e: any) {
      if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
        console.log(`[${dbName}] idempotencyKey column already present.`);
      } else {
        console.log(`[${dbName}] Note on idempotencyKey:`, e.message);
      }
    }

    try {
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key" ON "Order"("idempotencyKey");');
      console.log(`[${dbName}] Created unique index on idempotencyKey`);
    } catch (e: any) {
      console.log(`[${dbName}] Note on index:`, e.message);
    }

    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN "idempotencyPayloadHash" TEXT;');
      console.log(`[${dbName}] Added column idempotencyPayloadHash`);
    } catch (e: any) {
      if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
        console.log(`[${dbName}] idempotencyPayloadHash column already present.`);
      } else {
        console.log(`[${dbName}] Note on idempotencyPayloadHash:`, e.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  await safeMigrateDatabase('file:./dev.db', 'DEV_DB');
  await safeMigrateDatabase('file:./test.db', 'TEST_DB');
}

run().catch(console.error);
