import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Muzaffargarh Vegetable Platform...');

  // 1. Settings (Brand Name configurable as required)
  const defaultSettings = [
    { key: 'brand_name', value: 'Fresh Vegetables Muzaffargarh', group: 'general', description: 'Store brand name' },
    { key: 'brand_tagline', value: 'Fresh, hand-picked vegetables delivered directly to your doorstep.', group: 'general', description: 'Tagline' },
    { key: 'contact_phone', value: '0342-7883728', group: 'general', description: 'Store customer support phone' },
    { key: 'whatsapp_number', value: '923427883728', group: 'whatsapp', description: 'WhatsApp business phone' },
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

  // 2. Primary Store Owner & Super Admin
  const ownerPasswordHash = await bcrypt.hash('Rehan@Muzaffargarh2026!', 10);
  await prisma.user.upsert({
    where: { email: 'rehan.techhub0@gmail.com' },
    update: {
      name: 'Rehan Qadri (Store Owner)',
      phone: '03427883728',
      passwordHash: ownerPasswordHash,
      role: 'OWNER',
    },
    create: {
      name: 'Rehan Qadri (Store Owner)',
      email: 'rehan.techhub0@gmail.com',
      phone: '03427883728',
      passwordHash: ownerPasswordHash,
      role: 'OWNER',
    },
  });

  // 2b. Store Admin/Manager
  const adminPasswordHash = await bcrypt.hash('Admin@Sabzi2026!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@freshvegetables.pk' },
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

  // 5. Authentic Fresh Vegetables Only (Full stock, 24 authentic varieties)
  const vegetables = [
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
      name: 'Teenda (Desi Round Gourd)',
      slug: 'desi-round-gourd-teenda',
      description: 'Tender small round desi teenda. Soft inside with quick cooking time, traditional home cooking favorite.',
      pricePerKg: 130,
      isAvailable: true,
      isFeatured: false,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=800&auto=format&fit=crop&q=80'
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
    },
    {
      name: 'Shalgam (Tender Purple Top Turnips)',
      slug: 'fresh-turnips-shalgam',
      description: 'Crisp, sweet-peppery purple top turnips. Cooked into traditional Shalgam Gosht or pickled for desi pickles.',
      pricePerKg: 90,
      isAvailable: true,
      isFeatured: false,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=800&auto=format&fit=crop&q=80'
      ]
    },
    {
      name: 'Arvi (Tender Taro Root)',
      slug: 'desi-taro-root-arvi',
      description: 'Clean, hairy desi arvi roots with firm cream-colored flesh. Delicious when fried or simmered in Arvi Gosht salan.',
      pricePerKg: 210,
      isAvailable: true,
      isFeatured: false,
      isOffer: false,
      images: [
        'https://images.unsplash.com/photo-1598030304671-5aa1d6f21128?w=800&auto=format&fit=crop&q=80'
      ]
    },
    {
      name: 'Desi Lemons / Nimbu (Juicy Yellow Lemons)',
      slug: 'fresh-yellow-lemons-nimbu',
      description: 'Thin-skinned, highly aromatic yellow desi lemons bursting with tart citrus juice. Rich source of natural Vitamin C.',
      pricePerKg: 320,
      isAvailable: true,
      isFeatured: true,
      isOffer: true,
      offerPrice: 280,
      images: [
        'https://images.unsplash.com/photo-1534948216015-843149f72be3?w=800&auto=format&fit=crop&q=80'
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

