/**
 * Cross-platform script to copy the generated PostgreSQL Prisma client
 * from `src/generated/pg-client` to `dist/generated/pg-client`.
 *
 * Runs automatically as a postbuild step across Windows, Linux, and macOS without external dependencies.
 * If the source client has not been generated yet, it automatically generates it first.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src', 'generated', 'pg-client');
const destDir = path.join(rootDir, 'dist', 'generated', 'pg-client');

// 1. Verify that the source directory exists and has the entry point index.js
if (!fs.existsSync(srcDir) || !fs.existsSync(path.join(srcDir, 'index.js'))) {
  console.log('[POSTBUILD] src/generated/pg-client missing or incomplete. Generating PostgreSQL client...');

  const effectivePgUrl =
    process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'))
      ? process.env.DATABASE_URL
      : 'postgresql://placeholder_user:placeholder_pass@localhost:5432/placeholder_db';

  const res = spawnSync('npx', ['prisma', 'generate', '--schema=./prisma/schema.postgresql.prisma'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: effectivePgUrl,
    },
  });

  if (res.status !== 0 || !fs.existsSync(path.join(srcDir, 'index.js'))) {
    console.error('[POSTBUILD ERROR] Failed to generate PostgreSQL client into src/generated/pg-client.');
    process.exit(1);
  }
}

// 2. Ensure dist/generated directory exists
const destParent = path.dirname(destDir);
if (!fs.existsSync(destParent)) {
  fs.mkdirSync(destParent, { recursive: true });
}

// 3. Copy src/generated/pg-client to dist/generated/pg-client
try {
  // If destination already exists, remove it first to ensure a completely clean copy
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  // Node 16.7.0+ built-in recursive directory copy
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });

  // 4. Verify critical files were copied
  const requiredFiles = ['index.js', 'package.json'];
  const missingFiles = requiredFiles.filter((f) => !fs.existsSync(path.join(destDir, f)));

  if (missingFiles.length > 0) {
    console.error(`[POSTBUILD ERROR] Missing critical files in ${destDir}: ${missingFiles.join(', ')}`);
    process.exit(1);
  }

  const items = fs.readdirSync(destDir);
  console.log(`[POSTBUILD] Successfully copied PostgreSQL client to dist/generated/pg-client (${items.length} items verified).`);
} catch (err) {
  console.error('[POSTBUILD ERROR] Failed to copy PostgreSQL client to dist:', err);
  process.exit(1);
}
