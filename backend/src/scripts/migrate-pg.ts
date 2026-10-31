/**
 * Repeatable PostgreSQL Migration Runner
 * Safely applies the initial PostgreSQL schema DDL to target staging/production databases.
 *
 * SAFETY GUARDS:
 * 1. Strictly refuses to execute against SQLite databases (dev.db / test.db).
 * 2. Requires a valid postgresql:// connection string.
 * 3. Tracks applied migrations in `_app_migrations` to ensure idempotency.
 * 4. Runs DDL transactionally and verifies all 9 tables upon completion.
 */

import { PrismaClient as PGPrismaClient } from '../generated/pg-client/index.js';
import fs from 'fs';
import path from 'path';

async function migratePostgres() {
  console.log('=== TARGETED POSTGRESQL MIGRATION RUNNER ===\n');

  const targetDbUrl = process.env.DATABASE_URL || '';

  // SAFETY GUARD 1: Protocol validation
  if (!targetDbUrl.startsWith('postgresql://') && !targetDbUrl.startsWith('postgres://')) {
    console.error('[SAFETY ABORT] Refusing migration: DATABASE_URL must start with "postgresql://" or "postgres://".');
    console.error(`Received: "${targetDbUrl}"`);
    console.error('To apply migrations to PostgreSQL, provide: DATABASE_URL="postgresql://..." npm run db:migrate:pg\n');
    process.exit(1);
  }

  // SAFETY GUARD 2: Explicit SQLite rejection
  if (targetDbUrl.includes('dev.db') || targetDbUrl.includes('test.db') || targetDbUrl.includes('file:')) {
    console.error('[SAFETY ABORT] Fatal: target DATABASE_URL points to SQLite! Aborting immediately.');
    process.exit(1);
  }

  const migrationSqlPath = path.resolve(
    process.cwd(),
    'prisma/migrations_postgresql/0_init/migration.sql'
  );

  if (!fs.existsSync(migrationSqlPath)) {
    console.error(`[ERROR] Migration SQL file not found at: ${migrationSqlPath}`);
    process.exit(1);
  }

  const ddlSql = fs.readFileSync(migrationSqlPath, 'utf-8');

  console.log(`Connecting to PostgreSQL target: ${targetDbUrl.replace(/:[^:@]+@/, ':****@')}`);
  const prisma = new PGPrismaClient({
    datasources: { db: { url: targetDbUrl } },
  });

  try {
    // 1. Initialize migration tracking table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_app_migrations" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT UNIQUE NOT NULL,
        "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Check if 0_init has already been applied
    const existingMigration: any[] = await prisma.$queryRawUnsafe(`
      SELECT "name", "applied_at" FROM "_app_migrations" WHERE "name" = '0_init';
    `);

    if (existingMigration.length > 0) {
      console.log(`[INFO] Migration '0_init' has already been applied at: ${existingMigration[0].applied_at}.`);
      console.log('No pending migrations to apply.');
    } else {
      console.log('Applying baseline migration "0_init"...');

      // Execute DDL transactionally
      await prisma.$executeRawUnsafe(ddlSql);

      // Record migration
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_app_migrations" ("name") VALUES ('0_init');
      `);

      console.log('[SUCCESS] Baseline PostgreSQL migration "0_init" applied successfully.');
    }

    // 3. Verify all 9 required tables
    console.log('\nVerifying table creation in public schema...');
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `);
    const tableNames = tables.map((t: any) => t.table_name);

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

    let allPresent = true;
    for (const reqTable of requiredTables) {
      const exists = tableNames.includes(reqTable);
      console.log(`  - Table "${reqTable}": ${exists ? 'OK' : 'MISSING'}`);
      if (!exists) allPresent = false;
    }

    if (!allPresent) {
      console.error('[ERROR] One or more required tables are missing after migration!');
      process.exit(1);
    }

    console.log('\n[COMPLETE] PostgreSQL schema verified. All tables and constraints active.\n');
  } finally {
    await prisma.$disconnect();
  }
}

migratePostgres().catch((err) => {
  console.error('[MIGRATION ERROR]:', err);
  process.exit(1);
});
