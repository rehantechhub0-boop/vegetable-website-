# Phase 6.3 & 6.3.1 – Production Prisma Runtime Verification & Cross-Platform Audit Report

**Status**: Verified & Reproducible (Clean Checkout Ready)  
**Date**: 2026-10-15  
**Scope**: Code audit, cross-platform build automation, client isolation, production startup guards, and test isolation for Node.js/Express + Prisma backend.

---

## 1. Executive Summary

Phase 6.3.1 resolved the Windows-only build dependency and validated the production PostgreSQL client workflow.
A cross-platform Node.js copy script (`scripts/copy-pg-client.js`) replaced PowerShell `Copy-Item`. A `prebuild` lifecycle hook was added to ensure fresh git checkouts can run `npm run build` cleanly without missing module compilation errors.

All production startup guards, database client selection mechanisms, and test database isolation barriers were executed and confirmed against actual compiled artifacts in `dist/`.

> [!WARNING]
> **Live PostgreSQL Unverified Notice**
> Real PostgreSQL database migration execution, data import, query execution against PostgreSQL, and live runtime behavior remain **unverified** because no live PostgreSQL server was provisioned or connected during this local audit. Verification was strictly confined to static analysis, compile-time validation, and offline client factory instantiation.

---

## 2. Changes Implemented in Phase 6.3.1

| File | Change | Rationale |
| :--- | :--- | :--- |
| `backend/scripts/copy-pg-client.js` | Created built-in Node.js copy script | Replaced Windows-only `powershell Copy-Item` with standard Node 16.7+ `fs.cpSync`, `fs.mkdirSync`, and `fs.rmSync`. Supports Windows, Linux, and macOS without extra dependencies. Automatically detects missing source client and generates it if required. |
| `backend/package.json` | Added `"clean"`, `"prebuild"`, updated `"postbuild"` | `"clean"` removes `dist/` cross-platform. `"prebuild": "npm run db:generate:pg"` ensures `src/generated/pg-client` is generated before `tsc` runs, preventing `TS2307: Cannot find module` errors on fresh checkouts. `"postbuild": "node scripts/copy-pg-client.js"` ensures runtime artifacts exist in `dist/`. |
| `.gitignore` | Added `src/generated/` and `*/src/generated/` | Prevents platform-specific Prisma binary engines (e.g., `query_engine-windows.dll.node`, ~19.3 MB) from polluting version control. Client is generated deterministically during build. |

---

## 3. Automated vs. Manual / Programmatic Checks

| Check | Type | Method | Result | Exit Code |
| :--- | :--- | :--- | :--- | :--- |
| Clean Build Pipeline | Automated | `npm run clean && npm run build` | Passed (`prebuild` -> `tsc` -> `postbuild`) | `0` |
| Fresh Checkout Simulation | Automated | Deletion of `dist/` & `src/generated/pg-client/` followed by `npm run build` | Passed (fully self-healing) | `0` |
| Native Binary Engine in `dist` | Programmatic | Inspected `dist/generated/pg-client/` | Present (`query_engine-windows.dll.node`, 19,261,952 bytes; `index.js`, 40,366 bytes; 13 items total) | `0` |
| Prod Startup Guard: Missing JWT | Automated | Child process execution of `dist/server.js` | Aborted with `[STARTUP ABORT] JWT_SECRET is missing...` | `1` |
| Prod Startup Guard: Placeholder JWT | Automated | Child process execution of `dist/server.js` | Aborted with `[STARTUP ABORT] JWT_SECRET is missing, too short...` | `1` |
| Prod Startup Guard: SQLite URL | Automated | Child process execution of `dist/server.js` (`DATABASE_URL=file:./dev.db`) | Aborted with `[STARTUP ABORT] DATABASE_URL is missing or points to a local SQLite dev/test file...` | `1` |
| Prod Startup Guard: Missing URL | Automated | Child process execution of `dist/server.js` (`DATABASE_URL=''`) | Aborted with `[STARTUP ABORT] DATABASE_URL is missing...` | `1` |
| Prod Startup Guard: Non-PG URL | Automated | Child process execution of `dist/server.js` (`DATABASE_URL=mysql://...`) | Aborted with `[STARTUP ABORT] Production environment must connect to a verified PostgreSQL database!...` | `1` |
| Runtime Factory Selection: Prod | Programmatic | Instantiated `dist/db/prisma.js` under `NODE_ENV=production` | Loaded `postgresql` provider from `dist/generated/pg-client` | `0` |
| Runtime Factory Selection: Dev | Programmatic | Instantiated `dist/db/prisma.js` under `NODE_ENV=development` | Loaded `sqlite` provider from `node_modules/.prisma/client` | `0` |
| Test Environment Isolation | Automated | `src/tests/test-env.ts` guard assertion | Verified `.env.test` overrides `.env`; hard abort if `dev.db` is present | `0` |
| Security & Regression Suite | Automated | `npm run test:security` | 43 passed, 0 failed | `0` |
| Database Counts Immutability | Programmatic | Verified `dev.db` before and after test execution | Baseline: Users=88, Orders=281<br>Post-test: Users=88, Orders=281 (0 differences) | `0` |

---

## 4. Prisma Client Isolation & Runtime Factory Audit

### Generator Output Isolation
- **SQLite Client**: Generated to standard `node_modules/.prisma/client`.
- **PostgreSQL Client**: Generated strictly to `src/generated/pg-client` (via `prisma/schema.postgresql.prisma` line 8: `output = "../src/generated/pg-client"`).
- Running `npm run db:generate:pg` does **not** overwrite the SQLite client in `node_modules/.prisma/client`.

### Runtime Factory (`src/db/prisma.ts`)
```typescript
function loadPGClient(dbUrl: string): PrismaClient {
  const { PrismaClient: PGPrismaClient } = require('../generated/pg-client/index.js');
  return new PGPrismaClient({ datasources: { db: { url: dbUrl } } }) as unknown as PrismaClient;
}
```
When compiled to `dist/db/prisma.js`, `require('../generated/pg-client/index.js')` resolves to `dist/generated/pg-client/index.js`.
Verified via engine metadata:
- `activeProvider`: `"postgresql"`
- `dirname`: `.../dist/generated/pg-client`

### TypeScript Type-Safety Nuance
- The factory return type is declared as `PrismaClient` (the SQLite client type from `@prisma/client`).
- The PostgreSQL client is cast using `as unknown as PrismaClient`.
- **Finding**: This is structural API compatibility, not nominal compile-time type safety. Because both schemas (`schema.prisma` and `schema.postgresql.prisma`) maintain 100% identical model names, fields, relations, and types, all application services (`order.service.ts`, `auth.service.ts`, `admin.service.ts`) execute their standard Prisma ORM calls (`findUnique`, `findMany`, `create`, `update`, `delete`, `$transaction`) identically on both clients.
- None of the business service logic uses raw SQL (`$queryRaw` or `$executeRaw`). Raw SQL is restricted to migration verification scripts.

---

## 5. Development Database Immutability Verification

Direct SQLite query comparison before and after all test suites:

| Database | Baseline Count | Post-Verification Count | Status |
| :--- | :--- | :--- | :--- |
| `dev.db` (User table) | **88** | **88** | **Unchanged (0 mutation)** |
| `dev.db` (Order table) | **281** | **281** | **Unchanged (0 mutation)** |
| `test.db` (User table) | 78 | 80 | Mutated safely in isolated test DB |
| `test.db` (Order table) | 300 | 301 | Mutated safely in isolated test DB |

---

## 6. Unresolved Items & Pre-Staging Prerequisites

1. **Live PostgreSQL Connection**:
   Connecting to an actual PostgreSQL instance (Docker or cloud staging DB) is required before Phase 6.4 staging rollout.
2. **Migration Execution**:
   `npm run db:migrate:pg` has been statically verified and syntax-checked, but has not been applied to a live database.
3. **Data Migration Script**:
   `npm run db:export:sqlite` and `npm run db:import:pg` require validation against a disposable live target database.
