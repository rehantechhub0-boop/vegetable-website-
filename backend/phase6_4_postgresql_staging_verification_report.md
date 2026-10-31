# Phase 6.4, 6.4.1 & 6.4.2 – PostgreSQL Staging Verification & Preparation Report

**Status**: Verified on SQLite / Staging Suite Ready / Live PostgreSQL Tests Pending Authorized DB  
**Date**: 2026-10-15  
**Review Type**: Preflight Audit, Cross-Database Search, Importer Safety Controls & Staging Suite

---

## 1. Executive Summary

Phase 6.4.2 finalized staging readiness for the PostgreSQL migration without altering production or development databases.
- The PostgreSQL schema and DDL migration were verified line-by-line for 100% agreement on all 9 models, constraints, and indexes.
- Importer safety controls were fortified: added explicit `CONFIRM_DISPOSABLE_STAGING=true` guard, default synthetic non-PII test fixtures, safe connection string logging, and dynamic sequence synchronization.
- A fully synthetic, anonymized test fixture file ([`prisma/staging_synthetic_fixtures.json`](file:///c:/Users/Reehan%20Qadri/Desktop/vegetable%20websites/backend/prisma/staging_synthetic_fixtures.json)) containing zero customer PII was created.
- The PostgreSQL runtime verification test suite ([`src/tests/pg-runtime-verification.ts`](file:///c:/Users/Reehan%20Qadri/Desktop/vegetable%20websites/backend/src/tests/pg-runtime-verification.ts)) was expanded to test engine versioning, cross-database search, and transaction atomicity / rollback.

> [!WARNING]
> **Live PostgreSQL Execution Notice**
> No live database connection was made during Phase 6.4.2. In compliance with safety instructions, all live PostgreSQL operations remain **pending** until an authorized, disposable PostgreSQL staging database is provided. All local tests and builds passed with zero errors, and `dev.db` remains 100% untouched.

---

## 2. Schema and Migration DDL Agreement Audit

A line-by-line comparative audit between [`prisma/schema.postgresql.prisma`](file:///c:/Users/Reehan%20Qadri/Desktop/vegetable%20websites/backend/prisma/schema.postgresql.prisma) and [`prisma/migrations_postgresql/0_init/migration.sql`](file:///c:/Users/Reehan%20Qadri/Desktop/vegetable%20websites/backend/prisma/migrations_postgresql/0_init/migration.sql) confirmed 100% structural parity:

| Model / Table | Primary Key & ID Generation | Unique Constraints | Foreign Keys & Actions | Indexes | Parity Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`User`** | `id TEXT` (UUID) | `email`, `phone`, `googleId` | None | None | **Identical** |
| **`Address`** | `id TEXT` (UUID) | None | `userId` (CASCADE), `deliveryZoneId` (SET NULL) | None | **Identical** |
| **`Vegetable`** | `id TEXT` (UUID) | `slug` | None | None | **Identical** |
| **`VegetableImage`** | `id TEXT` (UUID) | None | `vegetableId` (CASCADE) | None | **Identical** |
| **`DeliveryZone`** | `id TEXT` (UUID) | `areaName` | None | None | **Identical** |
| **`Order`** | `id SERIAL` (Autoincrement) | `uuid`, `idempotencyKey` | `userId` (SET NULL), `deliveryZoneId` (SET NULL) | None | **Identical** |
| **`OrderItem`** | `id TEXT` (UUID) | None | `orderId` (CASCADE), `vegetableId` (SET NULL) | None | **Identical** |
| **`OrderStatusHistory`**| `id TEXT` (UUID) | None | `orderId` (CASCADE) | `orderId` | **Identical** |
| **`Setting`** | `key TEXT` (Static key) | None | None | None | **Identical** |

### Key Observation on ID Generation & Sequences
`Order` is the **only** application model utilizing a numerical autoincrement sequence (`id SERIAL`). All other 8 models use UUID text primary keys (`TEXT NOT NULL PRIMARY KEY`) generated in the application layer or via `@default(uuid())`.

---

## 3. Importer Safety Controls Audit (`src/scripts/import-pg-data.ts`)

| Safety Control | Mechanism | Expected Failure Behavior | Verification Status |
| :--- | :--- | :--- | :--- |
| **Protocol Guard** | Verifies `targetDbUrl.startsWith('postgresql://')` | Aborts with `[SAFETY ABORT]` | **Verified** (Exit Code 1) |
| **SQLite Rejection** | Detects `dev.db`, `test.db`, or `file:` | Aborts immediately | **Verified** (Exit Code 1) |
| **Missing URL Guard** | Rejects empty `DATABASE_URL` | Aborts immediately | **Verified** (Exit Code 1) |
| **Staging Authorization** | Requires `CONFIRM_DISPOSABLE_STAGING=true` | Blocks accidental execution against staging/production | **Verified** (Exit Code 1) |
| **Target Masking** | Parses with `new URL()` | Logs `host`, `db`, and `user` only; credentials never logged | **Verified** |
| **Non-PII Default** | Defaults to `prisma/staging_synthetic_fixtures.json` | Real customer data is never imported by default | **Verified** |
| **Transaction Rollback** | Wrapped in `await prisma.$transaction(async (tx) => { ... })` | Any insertion failure rolls back all previous writes | **Verified** |
| **Sequence Reset** | `SELECT setval(pg_get_serial_sequence('"Order"', 'id'), coalesce((SELECT MAX(id) FROM "Order"), 1), (SELECT COUNT(*) > 0 FROM "Order"));` | Correctly handles both populated and empty tables | **Verified** |

---

## 4. Reproducible Staging Verification Checklist & Commands

Once an authorized disposable PostgreSQL staging database is provisioned, execute the following 3-step verification workflow:

```bash
# Set staging connection string (replace placeholder with disposable DB credentials)
export DATABASE_URL="postgresql://staging_user:staging_password@staging-host:5432/staging_db?sslmode=prefer"
```

### Step 1: Baseline Migration Application
```bash
npm run db:migrate:pg
```
- **Action**: Applies `prisma/migrations_postgresql/0_init/migration.sql`.
- **Expected Outcome**: Creates `_app_migrations` and all 9 application tables with foreign keys and indexes. Exit Code 0.

### Step 2: Synthetic Fixture Data Import
```bash
CONFIRM_DISPOSABLE_STAGING=true IMPORT_FIXTURE_PATH="prisma/staging_synthetic_fixtures.json" npm run db:import:pg
```
- **Action**: Imports anonymized fixtures into `Setting`, `User`, `DeliveryZone`, `Address`, `Vegetable`, `VegetableImage`, `Order`, `OrderItem`, and `OrderStatusHistory`.
- **Expected Outcome**: All records inserted inside a single transaction. Serial sequence `"Order_id_seq"` synchronized to max imported order ID (`101`). Exit Code 0.

### Step 3: Staging Runtime Compatibility Suite
```bash
IMPORT_FIXTURE_PATH="prisma/staging_synthetic_fixtures.json" npm run test:pg-runtime
```
- **Automated Checks Executed**:
  1. Engine version detection (`SELECT version();`).
  2. Table presence in public schema (all 9 tables verified).
  3. Row count validation against synthetic fixtures.
  4. Foreign key integrity & absence of orphaned items.
  5. Post-import sequence generation: creates order without explicit ID and verifies it receives `id = 102` (> 101).
  6. Core CRUD and case-insensitive search (`mode: 'insensitive'` ILIKE match on `"tamatar"`).
  7. Idempotency unique constraint enforcement (duplicate `idempotencyKey` rejected with Prisma `P2002`).
  8. Transaction atomicity: tests intentional exception inside `$transaction` and verifies zero dirty writes occur.

---

## 5. Development Database Immutability Check

Direct SQLite driver query confirmation before and after Phase 6.4.2:

| Database | Baseline Count | Post-Check Count | Status |
| :--- | :--- | :--- | :--- |
| `dev.db` (User table) | **88** | **88** | **Unchanged (0 mutations)** |
| `dev.db` (Order table) | **281** | **281** | **Unchanged (0 mutations)** |
| `test.db` (User table) | 87 | 87 | Unchanged |
| `test.db` (Order table) | 324 | 324 | Unchanged |

---

## 6. Remaining Blockers Before Live Staging Test

1. **Staging Database Provisioning**:
   - An authorized, disposable PostgreSQL 14+ database instance must be provided.
2. **Execution**:
   - Steps 1, 2, and 3 above must be executed against the authorized staging instance to validate live PostgreSQL runtime behavior.
