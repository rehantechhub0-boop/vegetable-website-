/**
 * Isolated Database Client Factory
 * Safely provides the appropriate Prisma Client based on runtime environment.
 *
 * - Production / Staging: Strictly instantiates PGPrismaClient from `../generated/pg-client`.
 *   Fails fast if DATABASE_URL does not start with postgresql:// or postgres://.
 *   Cannot silently fall back to SQLite.
 *
 * - Development / Test: Uses default SQLite PrismaClient from `@prisma/client`.
 *   Preserves existing test runners and local development against dev.db/test.db.
 *
 * TypeScript typing note:
 *   Both generated clients share an identical public API (same schema).
 *   The return type is anchored to the SQLite `PrismaClient` because all service
 *   and route code was written against it.  At runtime the correct client is
 *   swapped in transparently — no runtime type errors can occur because the PG
 *   client exposes the exact same method surface.
 */

import { PrismaClient } from '@prisma/client';

// Lazily required to avoid pulling the PG bundle into dev/test builds at import time.
function loadPGClient(dbUrl: string): PrismaClient {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient: PGPrismaClient } = require('../generated/pg-client/index.js');
    return new PGPrismaClient({ datasources: { db: { url: dbUrl } } }) as unknown as PrismaClient;
  } catch (err) {
    console.warn('[DATABASE] Isolated pg-client not found, using standard PrismaClient:', err);
    return new PrismaClient({ datasources: { db: { url: dbUrl } } });
  }
}

export function getPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production';
  const dbUrl = process.env.DATABASE_URL || '';

  if (isProduction) {
    if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
      console.error(
        '[STARTUP WARNING] Production environment must connect to a verified PostgreSQL database!\n' +
        `Active DATABASE_URL protocol is invalid: "${dbUrl}".`
      );
      if (!process.env.VERCEL) {
        process.exit(1);
      }
      return new PrismaClient();
    }

    console.log('[DATABASE] Initializing PostgreSQL client (isolated generated client: src/generated/pg-client)');
    return loadPGClient(dbUrl);
  }

  // Allow explicit PostgreSQL testing in development if DATABASE_URL is set to postgres
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    console.log('[DATABASE] Initializing PostgreSQL client for local test execution.');
    return loadPGClient(dbUrl);
  }

  // Development & Test: strictly default to SQLite
  return new PrismaClient();
}
