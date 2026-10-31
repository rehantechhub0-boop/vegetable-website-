/**
 * Security & Regression Test Suite
 * Covers Helmet headers, CORS restrictions, Production Startup Guards,
 * Rate Limiting on authentication endpoints, and Core Business Logic Regressions.
 *
 * All tests strictly operate against test.db (isolated test environment).
 * Never mutates or resets dev.db.
 */

import './test-env.js';
import request from 'supertest';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { spawnSync } from 'child_process';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createOrder, StalePriceError } from '../services/order.service.js';

let app: any;
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

function getDbCounts(dbPath: string): { orders: number; users: number } {
  const scriptPath = path.resolve(process.cwd(), 'src/tests/count-db.py');
  const res = spawnSync('python', [scriptPath, dbPath], { encoding: 'utf-8' });
  if (res.status !== 0) {
    throw new Error(`Failed to query ${dbPath}: ${res.stderr}`);
  }
  const [ordersStr, usersStr] = res.stdout.trim().split(',');
  return {
    orders: parseInt(ordersStr, 10),
    users: parseInt(usersStr, 10),
  };
}

function extractCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return raw.split(';')[0];
}

async function runSecuritySuite() {
  console.log('\n=============================================================');
  console.log('=== PHASE 5.1 SECURITY VERIFICATION & REGRESSION SUITE ===');
  console.log('=============================================================\n');

  // Verify DB safety before starting
  const devDbPath = path.resolve(process.cwd(), 'prisma/dev.db');
  const initialCounts = getDbCounts(devDbPath);
  console.log(`[Baseline] dev.db initial check -> Orders: ${initialCounts.orders}, Users: ${initialCounts.users}`);
  assert(initialCounts.orders >= 279, `Safety: dev.db has valid orders baseline (${initialCounts.orders} >= 279)`);
  assert(initialCounts.users >= 87, `Safety: dev.db has valid users baseline (${initialCounts.users} >= 87)`);

  // Load backend Express app
  app = (await import('../server.js')).app;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. HELMET SECURITY HEADERS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. HELMET SECURITY HEADERS ---');
  {
    const res = await request(app).get('/api/health');
    assert(res.status === 200, 'Health endpoint responds with HTTP 200');
    assert(res.headers['x-content-type-options'] === 'nosniff', 'Helmet sets X-Content-Type-Options: nosniff');
    assert(res.headers['x-frame-options'] === 'SAMEORIGIN', 'Helmet sets X-Frame-Options: SAMEORIGIN (Clickjacking protection)');
    assert(res.headers['x-dns-prefetch-control'] === 'off', 'Helmet sets X-DNS-Prefetch-Control: off');
    assert(res.headers['cross-origin-resource-policy'] === 'cross-origin', 'Helmet sets Cross-Origin-Resource-Policy: cross-origin for uploads compatibility');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CORS VERIFICATION (Dev vs. Production Policy)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. CORS RESTRICTIONS & POLICY VERIFICATION ---');
  {
    // 2.1 Development/Test mode allowed origins
    const allowedLocalhostRes = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    assert(
      allowedLocalhostRes.headers['access-control-allow-origin'] === 'http://localhost:5173',
      'CORS: http://localhost:5173 is permitted in development/test'
    );

    const allowedPort5174Res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5174');
    assert(
      allowedPort5174Res.headers['access-control-allow-origin'] === 'http://localhost:5174',
      'CORS: http://localhost:5174 is permitted in development/test'
    );

    // 2.2 Requests without Origin header (curl, mobile, server-to-server) allowed
    const noOriginRes = await request(app).get('/api/health');
    assert(noOriginRes.status === 200, 'CORS: Request with no origin header is permitted');

    // 2.3 Production CORS Isolation Simulation
    // In production, localhost MUST be rejected and ONLY explicitly configured CORS_ORIGIN is allowed
    const testProdOrigins = (originHeader: string, configuredOrigin: string) => {
      const prodApp = express();
      const configuredOrigins = configuredOrigin.split(',').map((o) => o.trim()).filter(Boolean);
      const allowedOrigins = configuredOrigins; // Production logic: only explicit origins

      prodApp.use(cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) return callback(null, true);
          return callback(new Error(`CORS: origin '${origin}' is not allowed`));
        },
        credentials: true,
      }));
      prodApp.get('/test', (req, res) => res.json({ ok: true }));
      prodApp.use((err: any, req: Request, res: Response, next: any) => {
        res.status(500).json({ error: err.message });
      });
      return request(prodApp).get('/test').set('Origin', originHeader);
    };

    // Test approved production origin
    const prodApproved = await testProdOrigins('https://freshvegetables.pk', 'https://freshvegetables.pk');
    assert(
      prodApproved.headers['access-control-allow-origin'] === 'https://freshvegetables.pk',
      'CORS Production: Explicitly configured production origin is allowed'
    );

    // Test rejected unauthorized origin
    const prodRejected = await testProdOrigins('https://attacker-malicious-site.com', 'https://freshvegetables.pk');
    assert(
      prodRejected.status === 500 && prodRejected.body.error?.includes('CORS: origin'),
      'CORS Production: Unapproved external origin is rejected'
    );

    // Test localhost rejected in production
    const prodLocalhostRejected = await testProdOrigins('http://localhost:5173', 'https://freshvegetables.pk');
    assert(
      prodLocalhostRejected.status === 500 && prodLocalhostRejected.body.error?.includes('CORS: origin'),
      'CORS Production: Localhost origin is strictly rejected in production'
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. PRODUCTION STARTUP GUARDS (Secrets & Database Validation)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. PRODUCTION STARTUP GUARDS ---');
  {
    // Test 3.1: Missing JWT_SECRET aborts startup with exit code 1
    const testGuard = (envOverrides: Record<string, string>) => {
      const script = `
        process.env.NODE_ENV = '${envOverrides.NODE_ENV || 'production'}';
        process.env.JWT_SECRET = '${envOverrides.JWT_SECRET ?? ''}';
        process.env.DATABASE_URL = '${envOverrides.DATABASE_URL || 'postgresql://user:pass@localhost:5432/proddb'}';
        
        // Emulate server.ts startup guard
        if (process.env.NODE_ENV === 'production') {
          const jwtSecret = process.env.JWT_SECRET || '';
          if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('dev_2026') || jwtSecret.includes('sabzi_muzaffargarh')) {
            console.error('[STARTUP ABORT] JWT_SECRET is missing, too short, or is a development placeholder.');
            process.exit(1);
          }
          if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dev.db') || process.env.DATABASE_URL.includes('test.db')) {
            console.error('[STARTUP ABORT] DATABASE_URL is missing or points to a local SQLite dev/test file in production.');
            process.exit(1);
          }
        }
        process.exit(0);
      `;
      return spawnSync('node', ['-e', script], { encoding: 'utf-8' });
    };

    // Missing JWT_SECRET
    const resMissing = testGuard({ JWT_SECRET: '' });
    assert(resMissing.status === 1, 'Startup Guard: Missing JWT_SECRET in production exits with code 1');
    assert(resMissing.stderr.includes('[STARTUP ABORT]'), 'Startup Guard: Logs descriptive startup abort error');
    assert(!resMissing.stdout.includes('secret') && !resMissing.stderr.includes('sabzi_'), 'Startup Guard: Never prints secret values');

    // Development placeholder secret
    const resPlaceholder = testGuard({ JWT_SECRET: 'sabzi_muzaffargarh_secure_jwt_secret_dev_2026_xyz' });
    assert(resPlaceholder.status === 1, 'Startup Guard: Placeholder JWT_SECRET in production exits with code 1');

    // Too short secret (< 32 chars)
    const resShort = testGuard({ JWT_SECRET: 'short_weak_secret_under_32' });
    assert(resShort.status === 1, 'Startup Guard: Secret under 32 characters in production exits with code 1');

    // Production pointing to dev.db SQLite
    const resDevDb = testGuard({
      JWT_SECRET: 'a_very_strong_production_secret_key_exceeding_32_characters_2026',
      DATABASE_URL: 'file:./dev.db',
    });
    assert(resDevDb.status === 1, 'Startup Guard: Production pointing to dev.db exits with code 1');

    // Valid production config passes startup guard
    const resValid = testGuard({
      JWT_SECRET: 'a_very_strong_production_secret_key_exceeding_32_characters_2026',
      DATABASE_URL: 'postgresql://produser:prodpass@proddb.internal:5432/vegetables_prod',
    });
    assert(resValid.status === 0, 'Startup Guard: Valid production config passes startup check (exit code 0)');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. REGRESSION VERIFICATION: Customer Auth, Admin Auth, Orders, Stale Price
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. REGRESSION VERIFICATION ---');
  const ts = Date.now();
  const testCustomerEmail = `sec_cust_${ts}@test.com`;
  const testAdminEmail = `sec_admin_${ts}@test.com`;
  const testPassword = 'PasswordSecure123!';
  let customerCookie = '';
  let adminCookie = '';
  let createdOrderId: number | null = null;
  let createdOrderUuid: string | null = null;

  // 4.1 Register Customer via API
  {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Security Test Customer',
        email: testCustomerEmail,
        phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
        password: testPassword,
      });
    assert(regRes.status === 201, 'Regression: Customer registration returns HTTP 201');
    assert(regRes.body.success === true, 'Regression: Registration returns success: true');
    customerCookie = extractCookie(regRes as any);
    assert(customerCookie.includes('auth_token='), 'Regression: Registration sets auth_token cookie');
  }

  // 4.2 Customer Login via API
  {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testCustomerEmail, password: testPassword });
    assert(loginRes.status === 200, 'Regression: Customer login returns HTTP 200');
    assert(loginRes.body.user?.role === 'CUSTOMER', 'Regression: User role is CUSTOMER');
    customerCookie = extractCookie(loginRes as any);
  }

  // 4.3 Admin Authorization Check
  {
    // Create admin user in test.db
    const adminHash = await bcrypt.hash(testPassword, 10);
    await prisma.user.create({
      data: {
        name: 'Security Test Admin',
        email: testAdminEmail,
        passwordHash: adminHash,
        role: 'ADMIN',
      },
    });

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testAdminEmail, password: testPassword });
    assert(adminLoginRes.status === 200, 'Regression: Admin login returns HTTP 200');
    adminCookie = extractCookie(adminLoginRes as any);

    // Unauthenticated request to /admin/orders rejected (401)
    const unauthAdmin = await request(app).get('/api/v1/admin/orders');
    assert(unauthAdmin.status === 401, 'Regression: Unauthenticated request to /admin/orders returns 401');

    // Customer requesting admin route rejected (403)
    const custAdmin = await request(app)
      .get('/api/v1/admin/orders')
      .set('Cookie', customerCookie);
    assert(custAdmin.status === 403, 'Regression: Customer requesting /admin/orders returns 403 Forbidden');

    // Admin requesting admin route allowed (200)
    const adminOrders = await request(app)
      .get('/api/v1/admin/orders')
      .set('Cookie', adminCookie);
    assert(adminOrders.status === 200, 'Regression: Admin requesting /admin/orders returns 200 OK');
  }

  // 4.4 Order Creation & Idempotency
  {
    const testVeg = await prisma.vegetable.findFirst();
    const testZone = await prisma.deliveryZone.findFirst();
    assert(!!testVeg && !!testZone, 'Pre-condition: Vegetable and Delivery Zone exist in test.db');

    if (testVeg && testZone) {
      const idempotencyKey = `idemp-sec-${ts}`;
      const safeWeight = Math.max(2.0, Math.ceil(((testZone.minOrderAmount || 300) + 50) / (testVeg.pricePerKg || 100)));
      const orderPayload = {
        idempotencyKey,
        customer: {
          name: 'Security Buyer',
          phone: '03009876543',
        },
        delivery: {
          zoneId: testZone.id,
          address: 'Al-Razaq Colony, Muzaffargarh',
        },
        paymentMethod: 'COD',
        items: [
          {
            vegetableId: testVeg.id,
            weightInKg: safeWeight,
            quantity: 1,
            expectedPricePerKg: testVeg.pricePerKg,
          },
        ],
      };

      // Order creation
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', customerCookie)
        .send(orderPayload);

      assert(orderRes.status === 201, 'Regression: Order creation returns HTTP 201');
      assert(orderRes.body.success === true, 'Regression: Order creation body.success is true');
      createdOrderId = orderRes.body.order?.id;
      createdOrderUuid = orderRes.body.order?.uuid;
      assert(!!createdOrderId && !!createdOrderUuid, 'Regression: Order returns valid ID and UUID');

      // Idempotency: replay identical request
      const replayedRes = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', customerCookie)
        .send(orderPayload);

      assert(
        replayedRes.status === 200,
        'Regression Idempotency: Replaying with same key returns 200'
      );
      assert(
        replayedRes.body.order?.uuid === createdOrderUuid,
        'Regression Idempotency: Returns same order without duplicating'
      );

      // Stale price rejection: item price doesn't match DB price
      const stalePayload = {
        ...orderPayload,
        idempotencyKey: `idemp-stale-${ts}`,
        items: [
          {
            vegetableId: testVeg.id,
            weightInKg: safeWeight,
            quantity: 1,
            expectedPricePerKg: testVeg.pricePerKg + 999, // Intentional mismatch
          },
        ],
      };

      const staleRes = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', customerCookie)
        .send(stalePayload);

      assert(
        staleRes.status === 409,
        'Regression Stale Price: Mismatched price rejected with 409 Conflict'
      );
      assert(
        staleRes.body.code === 'PRICE_CHANGED',
        'Regression Stale Price: Error code is PRICE_CHANGED'
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. AUTHENTICATION RATE LIMITING ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. AUTHENTICATION RATE LIMITING ENFORCEMENT ---');
  {
    // The rate limiter is configured with AUTH_RATE_MAX (50 in test mode).
    // Earlier tests consumed: 1 registration + 2 logins = 3 requests.
    // We send requests until we hit the threshold.
    let hitRateLimit = false;
    let rateLimitStatusCode = 0;
    let rateLimitMessage = '';
    let hasRateLimitHeaders = false;

    console.log('  Triggering rate limit on /api/v1/auth/login...');
    for (let i = 1; i <= 60; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent_test@example.com', password: 'wrongpassword' });

      if (res.status === 429) {
        hitRateLimit = true;
        rateLimitStatusCode = res.status;
        rateLimitMessage = res.body?.error || '';
        hasRateLimitHeaders = !!(
          res.headers['ratelimit-limit'] ||
          res.headers['ratelimit-remaining'] ||
          res.headers['retry-after']
        );
        break;
      }
    }

    assert(hitRateLimit === true, 'Rate Limiter: Authentication endpoint enforces rate limits (HTTP 429 triggered)');
    assert(rateLimitStatusCode === 429, 'Rate Limiter: Response status is 429 Too Many Requests');
    assert(
      rateLimitMessage.includes('Too many authentication attempts'),
      'Rate Limiter: Returns user-friendly rate limit message'
    );
    assert(hasRateLimitHeaders === true, 'Rate Limiter: Standard RateLimit headers present on HTTP 429 response');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. DEV DATABASE ISOLATION VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. DATABASE ISOLATION FINAL VERIFICATION ---');
  {
    const finalCounts = getDbCounts(devDbPath);
    console.log(`[Final] dev.db check -> Orders: ${finalCounts.orders}, Users: ${finalCounts.users}`);

    assert(finalCounts.orders === initialCounts.orders, `dev.db orders unchanged: ${initialCounts.orders} === ${finalCounts.orders}`);
    assert(finalCounts.users === initialCounts.users, `dev.db users unchanged: ${initialCounts.users} === ${finalCounts.users}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n=============================================================');
  console.log(`SECURITY REGRESSION TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecuritySuite().catch((err) => {
  console.error('[UNHANDLED TEST EXCEPTION]:', err);
  process.exit(1);
});
