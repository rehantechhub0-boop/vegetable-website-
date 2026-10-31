/**
 * Cross-Database Search Compatibility Regression Tests
 *
 * Verifies that:
 * 1. buildStringSearchFilter produces the correct filter shape for SQLite vs PostgreSQL.
 * 2. SQLite queries never contain `mode: 'insensitive'` (which causes runtime crashes).
 * 3. Mixed-case queries (e.g. searching "tamatar" or "TAMATAR" for "Tamatar") match correctly in SQLite.
 * 4. Admin search services (vegetables, orders, customers) work seamlessly.
 *
 * All database operations strictly execute against `test.db`. Never mutates `dev.db`.
 */

import './test-env.js';
import { PrismaClient } from '@prisma/client';
import { buildStringSearchFilter, isPostgreSqlActive } from '../utils/search.util.js';
import {
  getAdminVegetables,
  getAdminOrders,
  getAdminCustomers,
} from '../services/admin.service.js';

const prisma = new PrismaClient();

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

async function runSearchTests() {
  console.log('\n=============================================================');
  console.log('=== PHASE 6.4.1 CROSS-DATABASE SEARCH REGRESSION TESTS ===');
  console.log('=============================================================\n');

  // --- UNIT 1: Filter generation logic ---
  console.log('--- 1. Search Filter Generator (Unit Tests) ---');

  const sqliteFilter = buildStringSearchFilter('tamatar', prisma);
  assert(
    sqliteFilter.contains === 'tamatar' && sqliteFilter.mode === undefined,
    'SQLite filter contains "tamatar" and omits mode property'
  );

  const mockPgPrisma = { _engineConfig: { activeProvider: 'postgresql' } };
  const pgFilter = buildStringSearchFilter('tamatar', mockPgPrisma);
  assert(
    pgFilter.contains === 'tamatar' && pgFilter.mode === 'insensitive',
    'PostgreSQL filter contains "tamatar" and includes mode: "insensitive"'
  );

  // --- UNIT 2: SQLite provider detection ---
  console.log('\n--- 2. Database Provider Detection ---');
  assert(
    !isPostgreSqlActive(prisma),
    'Active test client correctly detected as NOT PostgreSQL (SQLite)'
  );
  assert(
    isPostgreSqlActive(mockPgPrisma),
    'Mock client with activeProvider="postgresql" detected as PostgreSQL'
  );

  // --- INTEGRATION 3: Live queries against test.db ---
  console.log('\n--- 3. Database Search Queries against test.db ---');

  // Ensure test fixture exists in test.db
  const slug = 'test-tamatar-fresh';
  await prisma.vegetable.upsert({
    where: { slug },
    create: {
      name: 'Tamatar (Fresh Red Tomatoes)',
      slug,
      description: 'Farm fresh red juicy tomatoes from Muzaffargarh',
      pricePerKg: 120,
      isAvailable: true,
    },
    update: {
      name: 'Tamatar (Fresh Red Tomatoes)',
    },
  });

  // Query 1: Lowercase search for "tamatar"
  const resLower = await getAdminVegetables(prisma, { search: 'tamatar' });
  const foundLower = resLower.data.some((v) => v.name.includes('Tamatar'));
  assert(foundLower, 'Search for lowercase "tamatar" finds "Tamatar (Fresh Red Tomatoes)"');

  // Query 2: Uppercase search for "TAMATAR"
  const resUpper = await getAdminVegetables(prisma, { search: 'TAMATAR' });
  const foundUpper = resUpper.data.some((v) => v.name.includes('Tamatar'));
  assert(foundUpper, 'Search for uppercase "TAMATAR" finds "Tamatar (Fresh Red Tomatoes)"');

  // Query 3: Mixed-case search for "TaMaTaR"
  const resMixed = await getAdminVegetables(prisma, { search: 'TaMaTaR' });
  const foundMixed = resMixed.data.some((v) => v.name.includes('Tamatar'));
  assert(foundMixed, 'Search for mixed-case "TaMaTaR" finds "Tamatar (Fresh Red Tomatoes)"');

  // Query 4: Description substring search
  const resDesc = await getAdminVegetables(prisma, { search: 'juicy tomatoes' });
  const foundDesc = resDesc.data.some((v) => v.slug === slug);
  assert(foundDesc, 'Search for description "juicy tomatoes" finds matching vegetable');

  // Query 5: Customer search (mixed case)
  const resCust = await getAdminCustomers(prisma, { search: 'test' });
  assert(
    Array.isArray(resCust.data),
    'getAdminCustomers executes successfully with search term'
  );

  // Query 6: Order search
  const resOrders = await getAdminOrders(prisma, { search: 'ali' });
  assert(
    Array.isArray(resOrders.data),
    'getAdminOrders executes successfully with search term'
  );

  // Query 7: Verify runtime error safety
  // Explicitly confirm that executing these queries does NOT trigger SQLite's "Unknown argument mode"
  let runtimeErrorThrown = false;
  try {
    await prisma.vegetable.findMany({
      where: {
        name: buildStringSearchFilter('tamatar', prisma),
      },
    });
  } catch (err) {
    runtimeErrorThrown = true;
  }
  assert(
    !runtimeErrorThrown,
    'Prisma query with buildStringSearchFilter executes on SQLite without runtime argument error'
  );

  console.log('\n=============================================================');
  console.log(`SEARCH REGRESSION TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runSearchTests().catch((err) => {
  console.error('[FATAL ERROR IN SEARCH TESTS]:', err);
  process.exit(1);
});
