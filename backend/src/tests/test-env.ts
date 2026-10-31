import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Force NODE_ENV to test
process.env.NODE_ENV = 'test';

// Resolve .env.test path
const testEnvPath = path.resolve(process.cwd(), '.env.test');
if (!fs.existsSync(testEnvPath)) {
  throw new Error(
    '[DATABASE SAFETY ABORT] .env.test file is missing! Tests cannot run without explicit test configuration.'
  );
}

// Load .env.test with override: true so test settings supersede default .env
dotenv.config({ path: testEnvPath, override: true });

const dbUrl = process.env.DATABASE_URL || '';

// SAFETY GUARD 1: Fail safely if pointing to dev.db
if (!dbUrl || dbUrl.includes('dev.db')) {
  throw new Error(
    `[DATABASE SAFETY ABORT] Refusing to run tests against development database! DATABASE_URL="${dbUrl}". Expected an isolated test database (e.g. test.db).`
  );
}

// SAFETY GUARD 2: Must explicitly point to a test database containing "test.db"
if (!dbUrl.includes('test.db')) {
  throw new Error(
    `[DATABASE SAFETY ABORT] DATABASE_URL does not point to a verified test database: "${dbUrl}". Expected a database URL containing "test.db".`
  );
}

export function assertTestDbActive(): void {
  const currentDb = process.env.DATABASE_URL || '';
  if (!currentDb.includes('test.db') || currentDb.includes('dev.db')) {
    throw new Error(
      `[DATABASE SAFETY ABORT] Active DATABASE_URL is invalid for testing: "${currentDb}". Aborting to prevent data corruption.`
    );
  }
}
