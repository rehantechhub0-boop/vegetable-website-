/**
 * Isolated PostgreSQL Client Generator
 * Generates the PostgreSQL Prisma Client into `src/generated/pg-client`.
 * Supplies a valid postgresql:// placeholder protocol so generation succeeds even when
 * the active .env is currently configured for local SQLite.
 */

import { spawnSync } from 'child_process';

console.log('[PRISMA] Generating isolated PostgreSQL client to src/generated/pg-client...');

const effectivePgUrl =
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'))
    ? process.env.DATABASE_URL
    : 'postgresql://placeholder_user:placeholder_pass@localhost:5432/placeholder_db';

const res = spawnSync('npx', ['prisma', 'generate', '--schema=./prisma/schema.postgresql.prisma'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: effectivePgUrl,
  },
});

if (res.status !== 0) {
  console.error('[PRISMA] PostgreSQL client generation failed.');
  process.exit(res.status || 1);
}

console.log('[PRISMA] PostgreSQL client successfully generated to src/generated/pg-client.\n');
