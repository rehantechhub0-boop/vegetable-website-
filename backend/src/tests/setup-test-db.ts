import './test-env.js';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const devDbPath = path.resolve('prisma', 'dev.db');
const testDbPath = path.resolve('prisma', 'test.db');

console.log('=== TEST DATABASE INITIALIZATION ===');
console.log(`[Path Verification] Development Database: ${devDbPath}`);
console.log(`[Path Verification] Test Database:        ${testDbPath}`);

if (devDbPath === testDbPath) {
  throw new Error('[CRITICAL SAFETY ERROR] Test database path matches development database path! Aborting.');
}

if (!fs.existsSync(devDbPath)) {
  console.warn('[WARNING] Development database not found at expected location.');
} else {
  console.log(`[Preservation Check] Confirmed dev.db exists (${fs.statSync(devDbPath).size} bytes).`);
}

// 1. Push schema to isolated test.db
console.log('\n[Schema Push] Creating schema on isolated test.db...');
execSync('npx prisma db push --schema=prisma/schema.prisma --skip-generate', {
  cwd: path.resolve(process.cwd()),
  env: {
    ...process.env,
    DATABASE_URL: 'file:./test.db',
  },
  stdio: 'inherit',
});

// 2. Seed test.db with required test fixtures
console.log('\n[Fixture Setup] Seeding initial fixtures into test.db...');
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'file:./test.db' },
  },
});

async function seedTestDb() {
  try {
    // Settings
    const defaultSettings = [
      { key: 'brand_name', value: 'Fresh Vegetables Muzaffargarh', group: 'general', description: 'Store brand name' },
      { key: 'brand_tagline', value: 'Fresh, hand-picked vegetables delivered directly to your doorstep.', group: 'general', description: 'Tagline' },
      { key: 'contact_phone', value: '0300-1234567', group: 'general', description: 'Store customer support phone' },
      { key: 'whatsapp_number', value: '923001234567', group: 'whatsapp', description: 'WhatsApp business phone' },
      { key: 'whatsapp_enabled', value: 'true', group: 'whatsapp', description: 'Enable WhatsApp notifications' },
      { key: 'currency_symbol', value: 'Rs.', group: 'general', description: 'Currency symbol' },
      { key: 'min_order_amount', value: '300', group: 'delivery', description: 'Global minimum order amount in Rs.' },
      { key: 'default_delivery_fee', value: '100', group: 'delivery', description: 'Standard delivery fee in Rs.' },
    ];

    for (const s of defaultSettings) {
      await prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: s,
      });
    }

    // Delivery Zones
    const testZones = [
      { areaName: 'Muzaffargarh City Center', deliveryFee: 80, minOrderAmount: 300, estimatedDeliveryTime: '30-45 mins', isActive: true },
      { areaName: 'Alipur Road Area', deliveryFee: 120, minOrderAmount: 400, estimatedDeliveryTime: '45-60 mins', isActive: true },
      { areaName: 'Jhang Road Area', deliveryFee: 120, minOrderAmount: 400, estimatedDeliveryTime: '45-60 mins', isActive: true },
      { areaName: 'Test Open Delivery Zone', deliveryFee: 50, minOrderAmount: 0, estimatedDeliveryTime: '20-30 mins', isActive: true },
    ];

    for (const z of testZones) {
      const existing = await prisma.deliveryZone.findFirst({ where: { areaName: z.areaName } });
      if (!existing) {
        await prisma.deliveryZone.create({ data: z });
      }
    }

    // Standard Vegetables
    const testVegs = [
      { name: 'Bhindi (Tender Lady Finger / Okra)', slug: 'bhindi-lady-finger', pricePerKg: 240, isAvailable: true, description: 'Fresh crisp okra.' },
      { name: 'Phool Gobi (Cauliflower)', slug: 'phool-gobi-cauliflower', pricePerKg: 190, isAvailable: true, description: 'Fresh white cauliflower.' },
      { name: 'Tamatar (Fresh Red Tomatoes)', slug: 'tamatar-red-tomatoes', pricePerKg: 180, isAvailable: true, description: 'Juicy ripe tomatoes.' },
      { name: 'Aloo (Farm Fresh Potatoes)', slug: 'aloo-potatoes', pricePerKg: 120, isAvailable: true, description: 'Everyday cooking potatoes.' },
      { name: 'Pyaz (Red Onions)', slug: 'pyaz-onions', pricePerKg: 220, isAvailable: true, description: 'Quality red onions.' },
    ];

    for (const v of testVegs) {
      const existing = await prisma.vegetable.findFirst({ where: { slug: v.slug } });
      if (!existing) {
        await prisma.vegetable.create({ data: v });
      }
    }

    // Default Seed Admin & Customer
    const adminHash = await bcrypt.hash('Admin@Sabzi2026!', 10);
    await prisma.user.upsert({
      where: { phone: '03000000000' },
      update: {},
      create: {
        name: 'Store Manager',
        email: 'admin@freshvegetables.pk',
        phone: '03000000000',
        passwordHash: adminHash,
        role: 'ADMIN',
      },
    });

    const custHash = await bcrypt.hash('Customer123!', 10);
    await prisma.user.upsert({
      where: { phone: '03123456789' },
      update: {},
      create: {
        name: 'Test Customer Fixture',
        email: 'fixture@example.com',
        phone: '03123456789',
        passwordHash: custHash,
        role: 'CUSTOMER',
      },
    });

    const counts = {
      users: await prisma.user.count(),
      vegetables: await prisma.vegetable.count(),
      zones: await prisma.deliveryZone.count(),
      settings: await prisma.setting.count(),
    };

    console.log('[Fixture Setup Completed] Test database initialized with:', counts);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestDb().catch((err) => {
  console.error('[SETUP ERROR]:', err);
  process.exit(1);
});
