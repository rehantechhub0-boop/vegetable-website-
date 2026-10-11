import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Muzaffargarh Vegetable Platform...');

  // 1. Settings (Brand Name configurable as required)
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

  // 2. Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@Sabzi2026!', 10);
  const adminUser = await prisma.user.upsert({
    where: { phone: '03000000000' },
    update: {},
    create: {
      name: 'Store Manager',
      email: 'admin@freshvegetables.pk',
      phone: '03000000000',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  // 3. Customer Demo User
  const customerPasswordHash = await bcrypt.hash('Customer123!', 10);
  await prisma.user.upsert({
    where: { phone: '03123456789' },
    update: {},
    create: {
      name: 'Muhammad Usman',
      email: 'usman@example.com',
      phone: '03123456789',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
    },
  });

  // 4. Admin-Controlled Delivery Zones (Editable in admin panel)
  const deliveryZones = [
    { areaName: 'Muzaffargarh City Center', deliveryFee: 80, minOrderAmount: 300, estimatedDeliveryTime: '30-45 mins' },
    { areaName: 'Alipur Road Area', deliveryFee: 120, minOrderAmount: 400, estimatedDeliveryTime: '45-60 mins' },
    { areaName: 'Jhang Road Area', deliveryFee: 120, minOrderAmount: 400, estimatedDeliveryTime: '45-60 mins' },
    { areaName: 'Khangarh Bypass Sector', deliveryFee: 150, minOrderAmount: 500, estimatedDeliveryTime: '50-70 mins' },
    { areaName: 'Dera Ghazi Khan Road Zone', deliveryFee: 150, minOrderAmount: 500, estimatedDeliveryTime: '50-70 mins' },
  ];

  for (const zone of deliveryZones) {
    await prisma.deliveryZone.upsert({
      where: { areaName: zone.areaName },
      update: zone,
      create: zone,
    });
  }

  // 5. Authentic Fresh Vegetables Only (No fruits, no grocery bloat)
  const vegetables = [
    {
      name: 'Tamatar (Fresh Red Tomatoes)',
      slug: 'fresh-tomatoes',
      description: 'Firm, juicy farm-fresh tomatoes. Perfect for curries, salads, and traditional handi.',
      pricePerKg: 180,
      isAvailable: true,
      isFeatured: true,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1546470427-227c7369a9b0?w=800&auto=format&fit=crop&q=80'
      ]
    },
    {
      name: 'Aloo (Farm Fresh Potatoes)',
      slug: 'fresh-potatoes',
      description: 'Clean, thin-skinned golden potatoes freshly harvested. Excellent for all daily cooking.',
      pricePerKg: 120,
      isAvailable: true,
      isFeatured: true,
      isOffer: true,
      offerPrice: 100,
      images: [
        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80'
      ]
    },
    {
      name: 'Pyaz (Red Onions)',
      slug: 'red-onions',
      description: 'Pungent, dry, crisp red onions. Essential staple for everyday Pakistani cooking.',
      pricePerKg: 220,
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
      description: 'Young, tender, bright green bhindi. Freshly picked without fibrous strings.',
      pricePerKg: 240,
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
      description: 'Washed, vibrant green leafy spinach loaded with iron and minerals. Great for Palak Gosht and Daal.',
      pricePerKg: 140,
      isAvailable: true,
      isFeatured: false,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80'
      ]
    },
    {
      name: 'Kheera (Crisp Salad Cucumbers)',
      slug: 'fresh-cucumber-kheera',
      description: 'Hydrating, crisp desi salad cucumbers. Freshly cut and cool.',
      pricePerKg: 160,
      isAvailable: true,
      isFeatured: false,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=800&auto=format&fit=crop&q=80'
      ]
    },
    {
      name: 'Phool Gobi (Cauliflower)',
      slug: 'fresh-cauliflower-gobi',
      description: 'Tight, snow-white cauliflower florets with crisp outer green leaves.',
      pricePerKg: 190,
      isAvailable: true,
      isFeatured: false,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=800&auto=format&fit=crop&q=80'
      ]
    },
    {
      name: 'Shimla Mirch (Green Bell Pepper)',
      slug: 'shimla-mirch-capsicum',
      description: 'Thick, sweet, aromatic green capsicums. Adds aroma to Jalfrezi and mixed sabzi.',
      pricePerKg: 280,
      isAvailable: true,
      isFeatured: false,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&auto=format&fit=crop&q=80'
      ]
    },
    {
      name: 'Hari Mirch (Fresh Green Chillies)',
      slug: 'spicy-green-chillies',
      description: 'Fiery, fresh green chillies packed with punchy aroma.',
      pricePerKg: 300,
      isAvailable: true,
      isFeatured: false,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80'
      ]
    },
    {
      name: 'Adrak & Lehsan (Ginger & Garlic Pair)',
      slug: 'fresh-ginger-garlic',
      description: 'Clean, plump ginger rhizomes and aromatic garlic bulbs. Kitchen essentials.',
      pricePerKg: 650,
      isAvailable: false,
      isFeatured: false,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80'
      ]
    }
  ];

  for (const veg of vegetables) {
    const { images, ...vegData } = veg;
    const createdVeg = await prisma.vegetable.upsert({
      where: { slug: veg.slug },
      update: vegData,
      create: vegData,
    });

    // Clean old images and recreate
    await prisma.vegetableImage.deleteMany({ where: { vegetableId: createdVeg.id } });

    for (let i = 0; i < images.length; i++) {
      await prisma.vegetableImage.create({
        data: {
          vegetableId: createdVeg.id,
          url: images[i],
          isPrimary: i === 0,
          orderIndex: i,
        }
      });
    }
  }

  console.log('Seeding completed successfully!');
  console.log(`Admin user created: 03000000000 / Admin@Sabzi2026!`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
