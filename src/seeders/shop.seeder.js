/**
 * Shop Seeder — idempotent
 *
 * Run with:  node src/seeders/shop.seeder.js
 *
 * Uses `updateOne({ slug }, data, { upsert: true })` so re-running never
 * creates duplicate records.  Existing records are updated in place.
 */
require('dotenv').config();

const { connectDatabase, mongoose } = require('../config/database');
const Category = require('../models/Category');
const Product  = require('../models/Product');

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const CATEGORIES = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Gadgets, devices and consumer electronics for everyday life.',
    image: '',
    parent: null,
    isActive: true,
    order: 1,
  },
];

// priceInCents: PKR prices (e.g. PKR 85,000 = 8500000 cents)
// Using cents so 1 unit = 1 paisa (or 1 cent for USD stores)
const PRODUCTS = (electronicsId) => [
  {
    name: 'Samsung Galaxy S24 Ultra',
    slug: 'samsung-galaxy-s24-ultra',
    description:
      'Flagship Android smartphone with 200MP camera, S Pen, Snapdragon 8 Gen 3, and 5000mAh battery.',
    priceInCents: 36999900, // PKR 369,999
    category: electronicsId,
    images: [],
    stock: 15,
    brand: 'Samsung',
    tags: ['smartphone', 'android', 'flagship', '5g'],
    specifications: new Map([
      ['Display',  '6.8" QHD+ Dynamic AMOLED 2X, 120Hz'],
      ['Processor','Snapdragon 8 Gen 3'],
      ['RAM',      '12GB'],
      ['Storage',  '256GB'],
      ['Camera',   '200MP + 12MP + 10MP + 10MP'],
      ['Battery',  '5000mAh, 45W Fast Charging'],
      ['OS',       'Android 14'],
    ]),
    isActive: true,
    rating: 4.8,
    reviewCount: 312,
  },
  {
    name: 'Apple iPhone 15 Pro',
    slug: 'apple-iphone-15-pro',
    description:
      'Pro iPhone with Titanium design, A17 Pro chip, 48MP main camera and USB-C connectivity.',
    priceInCents: 44999900, // PKR 449,999
    category: electronicsId,
    images: [],
    stock: 20,
    brand: 'Apple',
    tags: ['smartphone', 'ios', 'flagship', '5g', 'iphone'],
    specifications: new Map([
      ['Display',  '6.1" Super Retina XDR, 120Hz ProMotion'],
      ['Processor','A17 Pro'],
      ['Storage',  '128GB'],
      ['Camera',   '48MP Main + 12MP Ultra Wide + 12MP 3× Telephoto'],
      ['Battery',  '3274mAh, 20W Fast Charging'],
      ['OS',       'iOS 17'],
    ]),
    isActive: true,
    rating: 4.9,
    reviewCount: 540,
  },
  {
    name: 'Sony WH-1000XM5 Headphones',
    slug: 'sony-wh-1000xm5',
    description:
      'Industry-leading noise cancelling wireless headphones with 30-hour battery and Multipoint Connection.',
    priceInCents: 9499900, // PKR 94,999
    category: electronicsId,
    images: [],
    stock: 50,
    brand: 'Sony',
    tags: ['headphones', 'wireless', 'noise-cancelling', 'audio'],
    specifications: new Map([
      ['Driver',          '30mm'],
      ['Frequency Range', '4Hz – 40,000Hz'],
      ['Battery Life',    '30 hours (NC on)'],
      ['Connectivity',    'Bluetooth 5.2, Multipoint'],
      ['Weight',          '250g'],
    ]),
    isActive: true,
    rating: 4.7,
    reviewCount: 892,
  },
  {
    name: 'Dell XPS 15 Laptop',
    slug: 'dell-xps-15-laptop',
    description:
      '15.6" OLED laptop with Intel Core i7-13700H, 32GB RAM, 1TB SSD and NVIDIA RTX 4070.',
    priceInCents: 59999900, // PKR 599,999
    category: electronicsId,
    images: [],
    stock: 8,
    brand: 'Dell',
    tags: ['laptop', 'windows', 'oled', 'gaming', 'creative'],
    specifications: new Map([
      ['Display',  '15.6" 3.5K OLED, 60Hz'],
      ['Processor','Intel Core i7-13700H'],
      ['RAM',      '32GB DDR5'],
      ['Storage',  '1TB NVMe SSD'],
      ['GPU',      'NVIDIA RTX 4070 8GB'],
      ['Battery',  '86Wh, 130W Fast Charge'],
      ['OS',       'Windows 11 Home'],
    ]),
    isActive: true,
    rating: 4.6,
    reviewCount: 215,
  },
  {
    name: 'Apple iPad Pro 12.9" (M2)',
    slug: 'apple-ipad-pro-12-9-m2',
    description:
      'Pro-grade tablet with M2 chip, Liquid Retina XDR display, Thunderbolt port and Apple Pencil 2 support.',
    priceInCents: 37999900, // PKR 379,999
    category: electronicsId,
    images: [],
    stock: 12,
    brand: 'Apple',
    tags: ['tablet', 'ipad', 'ios', 'm2', 'creative'],
    specifications: new Map([
      ['Display',  '12.9" Liquid Retina XDR, ProMotion 120Hz'],
      ['Chip',     'Apple M2'],
      ['Storage',  '128GB'],
      ['Camera',   '12MP Wide + 10MP Ultra Wide'],
      ['Battery',  'Up to 10 hours'],
      ['Connectivity', 'Wi-Fi 6E, Bluetooth 5.3, USB-C (Thunderbolt)'],
    ]),
    isActive: true,
    rating: 4.8,
    reviewCount: 178,
  },
  {
    name: 'GoPro HERO12 Black',
    slug: 'gopro-hero12-black',
    description:
      'Action camera with 5.3K video, HyperSmooth 6.0 stabilization, waterproof to 10m and 27MP photos.',
    priceInCents: 7999900, // PKR 79,999
    category: electronicsId,
    images: [],
    stock: 30,
    brand: 'GoPro',
    tags: ['action-camera', 'waterproof', '4k', 'adventure'],
    specifications: new Map([
      ['Video',    '5.3K60, 4K120, 2.7K240'],
      ['Photo',    '27MP'],
      ['Stabilization', 'HyperSmooth 6.0'],
      ['Waterproof', '10m without housing'],
      ['Battery',  '1720mAh (Enduro)'],
    ]),
    isActive: true,
    rating: 4.5,
    reviewCount: 634,
  },
  {
    name: 'Logitech MX Master 3S Mouse',
    slug: 'logitech-mx-master-3s',
    description:
      'Advanced wireless mouse with 8K DPI sensor, MagSpeed scroll wheel, Quiet Click buttons and USB-C charging.',
    priceInCents: 1999900, // PKR 19,999
    category: electronicsId,
    images: [],
    stock: 75,
    brand: 'Logitech',
    tags: ['mouse', 'wireless', 'productivity', 'ergonomic'],
    specifications: new Map([
      ['Sensor',    '8000 DPI Darkfield'],
      ['Buttons',   '7 programmable'],
      ['Battery',   'Up to 70 days on full charge'],
      ['Connectivity', 'Bluetooth, Logi Bolt USB'],
      ['Weight',    '141g'],
    ]),
    isActive: true,
    rating: 4.7,
    reviewCount: 1203,
  },
  {
    name: 'Samsung 65" QLED 4K Smart TV',
    slug: 'samsung-65-qled-4k-tv',
    description:
      'Quantum HDR, 120Hz, Neo Quantum Processor 4K, Dolby Atmos, Gaming Hub and Object Tracking Sound.',
    priceInCents: 22999900, // PKR 229,999
    category: electronicsId,
    images: [],
    stock: 6,
    brand: 'Samsung',
    tags: ['tv', 'smart-tv', '4k', 'qled', 'gaming'],
    specifications: new Map([
      ['Display',  '65" QLED, Quantum HDR+'],
      ['Resolution','4K UHD (3840×2160)'],
      ['Refresh Rate', '120Hz'],
      ['HDR',      'Quantum HDR+ / Dolby Vision IQ'],
      ['OS',       'Tizen 7.0'],
      ['Audio',    '60W, Dolby Atmos, Object Tracking Sound'],
    ]),
    isActive: true,
    rating: 4.6,
    reviewCount: 421,
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const seed = async () => {
  await connectDatabase();
  console.log('\n🌱  Running shop seeder…\n');

  // --- Categories ---
  for (const cat of CATEGORIES) {
    const result = await Category.updateOne(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true }
    );
    const action = result.upsertedCount ? 'Created' : 'Updated';
    console.log(`  [Category] ${action}: ${cat.name}`);
  }

  // Fetch the Electronics category id
  const electronics = await Category.findOne({ slug: 'electronics' }).lean();
  if (!electronics) {
    throw new Error('Electronics category not found after seeding — aborting product seed.');
  }

  // --- Products ---
  for (const product of PRODUCTS(electronics._id)) {
    // Convert Map to plain object for $set so Mongoose stores it correctly
    const setData = {
      ...product,
      specifications: product.specifications instanceof Map
        ? Object.fromEntries(product.specifications)
        : product.specifications,
    };
    const result = await Product.updateOne(
      { slug: product.slug },
      { $set: setData },
      { upsert: true }
    );
    const action = result.upsertedCount ? 'Created' : 'Updated';
    console.log(`  [Product]  ${action}: ${product.name}`);
  }

  console.log('\n✅  Shop seeder completed successfully.\n');
  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error('\n❌  Seeder failed:', error.message);
  process.exitCode = 1;
  mongoose.disconnect();
});

