import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

let isReady = false;
let initPromise: Promise<void> | null = null;

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "deliveryZoneId" TEXT,
    "streetAddress" TEXT NOT NULL,
    "landmark" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "Vegetable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isOffer" BOOLEAN NOT NULL DEFAULT false,
    "offerPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vegetable_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "VegetableImage" (
    "id" TEXT NOT NULL,
    "vegetableId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VegetableImage_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "DeliveryZone" (
    "id" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedDeliveryTime" TEXT NOT NULL DEFAULT '30-45 mins',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "Order" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryZoneId" TEXT,
    "deliveryNotes" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentTxnRef" TEXT,
    "orderStatus" TEXT NOT NULL DEFAULT 'NEW',
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "idempotencyPayloadHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "vegetableId" TEXT,
    "vegetableName" TEXT NOT NULL,
    "vegetableImage" TEXT,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "weightDisplay" TEXT NOT NULL,
    "weightInKg" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "itemTotal" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Vegetable_slug_key" ON "Vegetable"("slug");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryZone_areaName_key" ON "DeliveryZone"("areaName");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Order_uuid_key" ON "Order"("uuid");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key" ON "Order"("idempotencyKey");`,
  `CREATE INDEX IF NOT EXISTS "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");`
];

const SEED_SETTINGS = [
  { key: 'brand_name', value: 'Fresh Vegetables Muzaffargarh', group: 'general', description: 'Store brand name' },
  { key: 'brand_tagline', value: 'Fresh, hand-picked vegetables delivered directly to your doorstep.', group: 'general', description: 'Tagline' },
  { key: 'contact_phone', value: '03427883728', group: 'general', description: 'Store customer support phone' },
  { key: 'whatsapp_number', value: '923427883728', group: 'whatsapp', description: 'WhatsApp business phone' },
  { key: 'whatsapp_enabled', value: 'true', group: 'whatsapp', description: 'Enable WhatsApp notifications' },
  { key: 'currency_symbol', value: 'Rs.', group: 'general', description: 'Currency symbol' },
  { key: 'min_order_amount', value: '300', group: 'delivery', description: 'Global minimum order amount in Rs.' },
  { key: 'default_delivery_fee', value: '100', group: 'delivery', description: 'Standard delivery fee in Rs.' },
];

const SEED_ZONES = [
  { id: 'zone-1', areaName: 'Muzaffargarh City Center', deliveryFee: 80, minOrderAmount: 300, estimatedDeliveryTime: '30-45 mins', isActive: true },
  { id: 'zone-2', areaName: 'Alipur Road Area', deliveryFee: 120, minOrderAmount: 400, estimatedDeliveryTime: '45-60 mins', isActive: true },
  { id: 'zone-3', areaName: 'Jhang Road Area', deliveryFee: 120, minOrderAmount: 400, estimatedDeliveryTime: '45-60 mins', isActive: true },
  { id: 'zone-4', areaName: 'Khangarh Bypass Sector', deliveryFee: 150, minOrderAmount: 500, estimatedDeliveryTime: '50-70 mins', isActive: true },
  { id: 'zone-5', areaName: 'Dera Ghazi Khan Road Zone', deliveryFee: 150, minOrderAmount: 500, estimatedDeliveryTime: '50-70 mins', isActive: true },
];

const SEED_VEGETABLES = [
  {
    name: 'Tamatar (Fresh Red Tomatoes)',
    slug: 'fresh-tomatoes',
    description: 'Firm, juicy farm-fresh tomatoes. Hand-picked daily, perfect for curries, salads, and traditional handi.',
    pricePerKg: 160,
    isAvailable: true,
    isFeatured: true,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546470427-227c7369a9b0?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Aloo (Farm Fresh Golden Potatoes)',
    slug: 'fresh-potatoes',
    description: 'Clean, thin-skinned golden potatoes freshly harvested. Essential staple for daily cooking, aloo parathas, and fries.',
    pricePerKg: 120,
    isAvailable: true,
    isFeatured: true,
    isOffer: true,
    offerPrice: 95,
    images: [
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Pyaz (Desi Red Onions)',
    slug: 'red-onions',
    description: 'Pungent, dry, crisp red onions. Essential staple for rich gravy base and everyday Pakistani handi cooking.',
    pricePerKg: 190,
    isAvailable: true,
    isFeatured: true,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Bhindi (Tender Lady Finger / Okra)',
    slug: 'fresh-bhindi-okra',
    description: 'Young, tender, bright green bhindi. Freshly picked without fibrous strings, quick to cook and crispy.',
    pricePerKg: 220,
    isAvailable: true,
    isFeatured: true,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Palak (Fresh Leafy Spinach)',
    slug: 'fresh-spinach-palak',
    description: 'Washed, vibrant green leafy spinach loaded with iron and minerals. Perfect for Palak Paneer, Palak Gosht, and Daal.',
    pricePerKg: 110,
    isAvailable: true,
    isFeatured: true,
    isOffer: true,
    offerPrice: 85,
    images: [
      'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Kheera (Crisp Desi Salad Cucumbers)',
    slug: 'fresh-cucumber-kheera',
    description: 'Hydrating, crisp desi salad cucumbers. Cool, crunchy, and freshly harvested for refreshing daily salads.',
    pricePerKg: 140,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Phool Gobi (Snow-White Cauliflower)',
    slug: 'fresh-cauliflower-gobi',
    description: 'Tight, snow-white cauliflower florets with crisp outer green leaves. Firm head with excellent taste.',
    pricePerKg: 160,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Band Gobi (Crisp Green Cabbage)',
    slug: 'fresh-cabbage-band-gobi',
    description: 'Tightly packed, crisp green cabbage heads. Ideal for Chinese dishes, vegetable rolls, and fresh slaws.',
    pricePerKg: 110,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1598030304671-5aa1d6f21128?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Shimla Mirch (Green Bell Pepper / Capsicum)',
    slug: 'shimla-mirch-capsicum',
    description: 'Thick-walled, aromatic green capsicums. Adds aroma, crunch, and flavor to Jalfrezi, pizza, and mixed sabzi.',
    pricePerKg: 240,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Hari Mirch (Fiery Fresh Green Chillies)',
    slug: 'spicy-green-chillies',
    description: 'Vibrant, slender desi green chillies packed with punchy aroma and natural spice. Sourced fresh from local growers.',
    pricePerKg: 260,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Gajar (Sweet Farm-Fresh Red Carrots)',
    slug: 'sweet-red-carrots-gajar',
    description: 'Bright red, crunchy sweet desi carrots. Sourced fresh from farms, perfect for Gajar ka Halwa, salads, and mixed sabzi.',
    pricePerKg: 120,
    isAvailable: true,
    isFeatured: true,
    isOffer: true,
    offerPrice: 99,
    images: [
      'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Mooli (Crisp White Salad Radish)',
    slug: 'crisp-white-radish-mooli',
    description: 'Clean, spicy-sweet white radishes with tender green leafy tops. Excellent for Mooli parathas and winter salads.',
    pricePerKg: 80,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1592417817098-8f3d69104a49?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Matar (Sweet Green Peas in Pods)',
    slug: 'sweet-green-peas-matar',
    description: 'Plump, naturally sweet green peas in fresh pods. Hand-sorted for high yield and rich flavor in Matar Pulao.',
    pricePerKg: 250,
    isAvailable: true,
    isFeatured: true,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Baingan (Glossy Purple Eggplant / Brinjal)',
    slug: 'glossy-purple-eggplant-baingan',
    description: 'Shining, deep purple eggplants with minimal seeds and tender white flesh. Perfect for Baingan ka Bharta and Aloo Baingan.',
    pricePerKg: 130,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1621841957884-1210fe19d66d?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Karela (Tender Desi Bitter Gourd)',
    slug: 'fresh-bitter-gourd-karela',
    description: 'Deep green, bumpy desi karela. Known for its medicinal benefits, detox properties, and delicious Bharwan Karela recipe.',
    pricePerKg: 180,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1629858349479-7a544f808759?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Kaddu / Lauki (Tender Bottle Gourd)',
    slug: 'fresh-bottle-gourd-lauki',
    description: 'Smooth, light green tender bottle gourd. Highly refreshing, easy to digest, and perfect for daal kaddu or kheer.',
    pricePerKg: 100,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Adrak (Fresh Aromatic Ginger)',
    slug: 'fresh-ginger-adrak',
    description: 'Clean, plump, high-fiber ginger rhizomes. Delivers robust heat and digestive fragrance to Pakistani recipes.',
    pricePerKg: 540,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Desi Lehsan (Pungent White Garlic)',
    slug: 'desi-garlic-lehsan',
    description: 'Dry, firm white garlic bulbs with concentrated natural oils. Hand-cleaned and sorted for maximum aroma.',
    pricePerKg: 460,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Dhaniya & Pudina Bundle (Fresh Coriander & Mint)',
    slug: 'dhaniya-pudina-mint-coriander',
    description: 'Aromatic bouquet of freshly picked coriander leaves and fragrant mint sprigs. The soul of green chutney and garnishing.',
    pricePerKg: 160,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    name: 'Chukandar (Fresh Red Beetroot)',
    slug: 'fresh-red-beetroot-chukandar',
    description: 'Firm, earthy, deep ruby-red farm beetroots. Rich in iron, natural nitrates, and vitamins. Ideal for juicing and raw salads.',
    pricePerKg: 140,
    isAvailable: true,
    isFeatured: false,
    isOffer: false,
    images: [
      'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800&auto=format&fit=crop&q=80'
    ]
  }
];

export async function ensureDatabaseReady(prisma: PrismaClient): Promise<void> {
  if (isReady) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Step 1: Check if Vegetable table exists and has records
      const count = await prisma.vegetable.count();
      if (count > 0) {
        console.log(`[DB-READY] Tables exist and verified (${count} vegetables found).`);
        try {
          await prisma.setting.upsert({
            where: { key: 'contact_phone' },
            update: { value: '03427883728' },
            create: { key: 'contact_phone', value: '03427883728', group: 'general' },
          });
          await prisma.setting.upsert({
            where: { key: 'whatsapp_number' },
            update: { value: '923427883728' },
            create: { key: 'whatsapp_number', value: '923427883728', group: 'whatsapp' },
          });

          // Ensure Owner account (rehan.techhub0@gmail.com) exists with OWNER role
          const ownerHash = await bcrypt.hash('Rehan@Muzaffargarh2026!', 10);
          await prisma.user.upsert({
            where: { email: 'rehan.techhub0@gmail.com' },
            update: {
              role: 'OWNER',
              name: 'Rehan Qadri (Store Owner)',
              phone: '03427883728',
              passwordHash: ownerHash,
            },
            create: {
              email: 'rehan.techhub0@gmail.com',
              name: 'Rehan Qadri (Store Owner)',
              phone: '03427883728',
              role: 'OWNER',
              passwordHash: ownerHash,
            },
          });
        } catch (setErr: any) {
          console.warn('[DB-READY] Setting / Owner sync note:', setErr?.message);
        }
        isReady = true;
        return;
      }
    } catch (checkErr: any) {
      console.warn('[DB-INIT] Tables missing or inaccessible, running DDL schema creation...', checkErr?.message);
      
      // Step 2: Run DDL statements one by one safely
      for (const sql of DDL_STATEMENTS) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (ddlErr: any) {
          // Ignore if already exists
          if (!ddlErr.message.includes('already exists') && !ddlErr.message.includes('duplicate')) {
            console.warn('[DB-INIT] DDL execution note:', ddlErr.message);
          }
        }
      }
      console.log('[DB-INIT] Schema DDL applied successfully.');
    }

    // Step 3: Seed data if table is empty
    try {
      const currentCount = await prisma.vegetable.count();
      if (currentCount === 0) {
        console.log('[DB-INIT] Seeding initial data (settings, delivery zones, vegetables)...');

        // Settings
        for (const s of SEED_SETTINGS) {
          try {
            await prisma.setting.upsert({
              where: { key: s.key },
              update: { value: s.value },
              create: s,
            });
          } catch (e) {}
        }

        // Delivery Zones
        for (const z of SEED_ZONES) {
          try {
            await prisma.deliveryZone.upsert({
              where: { areaName: z.areaName },
              update: z,
              create: z,
            });
          } catch (e) {}
        }

        // Vegetables & Images
        for (const veg of SEED_VEGETABLES) {
          try {
            const { images, ...vegData } = veg;
            const created = await prisma.vegetable.upsert({
              where: { slug: vegData.slug },
              update: vegData,
              create: vegData,
            });

            if (images && images.length > 0) {
              for (let i = 0; i < images.length; i++) {
                await prisma.vegetableImage.create({
                  data: {
                    vegetableId: created.id,
                    url: images[i],
                    isPrimary: i === 0,
                    orderIndex: i,
                  },
                });
              }
            }
          } catch (vegErr: any) {
            console.warn(`[DB-INIT] Could not seed ${veg.slug}:`, vegErr.message);
          }
        }
        // Ensure Owner account exists in freshly seeded DB
        try {
          const ownerHash = await bcrypt.hash('Rehan@Muzaffargarh2026!', 10);
          await prisma.user.upsert({
            where: { email: 'rehan.techhub0@gmail.com' },
            update: {
              role: 'OWNER',
              name: 'Rehan Qadri (Store Owner)',
              phone: '03427883728',
              passwordHash: ownerHash,
            },
            create: {
              email: 'rehan.techhub0@gmail.com',
              name: 'Rehan Qadri (Store Owner)',
              phone: '03427883728',
              role: 'OWNER',
              passwordHash: ownerHash,
            },
          });
          console.log('[DB-INIT] Primary Owner account verified (rehan.techhub0@gmail.com).');
        } catch (ownerErr: any) {
          console.warn('[DB-INIT] Owner seed notice:', ownerErr?.message);
        }

        console.log('[DB-INIT] Seeding complete! Database is fully populated.');
      }
    } catch (seedErr: any) {
      console.error('[DB-INIT] Error during seeding:', seedErr);
    }

    isReady = true;
  })();

  return initPromise;
}
