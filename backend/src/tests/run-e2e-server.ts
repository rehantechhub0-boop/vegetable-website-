import './test-env.js';
import path from 'path';

process.env.LISTEN_E2E = 'true';
process.env.PORT = '5001';

console.log('=== STARTING ISOLATED E2E TEST BACKEND SERVER ===');
console.log(`[Database Isolation] Verified active DATABASE_URL: ${process.env.DATABASE_URL}`);

if (!process.env.DATABASE_URL?.includes('test.db') || process.env.DATABASE_URL?.includes('dev.db')) {
  console.error('[CRITICAL SAFETY ABORT] Refusing to start E2E server without isolated test.db!');
  process.exit(1);
}

import('../server.js').then(() => {
  console.log('[E2E Server Ready] Listening on http://localhost:5001 connected strictly to test.db');
}).catch((err) => {
  console.error('[E2E Server Start Error]', err);
  process.exit(1);
});
