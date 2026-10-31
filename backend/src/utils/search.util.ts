/**
 * Cross-Database Search Utility
 *
 * Provides dialect-aware substring matching for Prisma queries across SQLite and PostgreSQL.
 *
 * Background:
 * - SQLite's native LIKE operator is ASCII case-insensitive by default.
 *   Prisma's SQLite connector strictly REJECTS the `mode: 'insensitive'` argument at runtime.
 * - PostgreSQL's native LIKE operator is strictly case-sensitive.
 *   Prisma requires `mode: 'insensitive'` to generate an ILIKE clause for case-insensitive matching.
 *
 * This utility inspects the active Prisma Client or database connection configuration
 * and returns the appropriate filter shape without SQL injection risks or runtime errors.
 */

export type CrossDbStringFilter = {
  contains: string;
  mode?: 'insensitive';
};

/**
 * Determines whether the active database provider is PostgreSQL.
 */
export function isPostgreSqlActive(prisma?: any): boolean {
  if (prisma?._engineConfig?.activeProvider === 'postgresql') {
    return true;
  }
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    return true;
  }
  return false;
}

/**
 * Builds a safe, cross-database Prisma substring search filter.
 * - When PostgreSQL is active: returns `{ contains: term, mode: 'insensitive' }` (generates ILIKE).
 * - When SQLite is active: returns `{ contains: term }` (uses native ASCII case-insensitive LIKE).
 */
export function buildStringSearchFilter(term: string, prisma?: any): CrossDbStringFilter {
  if (isPostgreSqlActive(prisma)) {
    return { contains: term, mode: 'insensitive' };
  }
  return { contains: term };
}
