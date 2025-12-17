import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data');

  // ============================================
  // USERS
  // ============================================
  const hashedPassword = await hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@wbtrade.pl',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'WBTrade',
      phone: '+48 500 100 200',
      role: 'ADMIN',
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      email: 'magazyn@wbtrade.pl',
      password: hashedPassword,
      firstName: 'Jan',
      lastName: 'Magazynier',
      phone: '+48 500 100 201',
      role: 'WAREHOUSE',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: 'klient@example.com',
      password: hashedPassword,
      firstName: 'Anna',
      lastName: 'Kowalska',
      phone: '+48 600 700 800',
      role: 'CUSTOMER',
    },
  });

  console.log('👤 Created users');

  // ============================================
  // ADDRESSES
  // ============================================
  const customerAddress = await prisma.address.create({
    data: {
      userId: customerUser.id,
      firstName: 'Anna',
      lastName: 'Kowalska',
      street: 'ul. Kwiatowa 15/3',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'PL',
      phone: '+48 600 700 800',
      isDefault: true,
    },
  });

  console.log('📍 Created addresses');

  // ============================================
  // CATEGORIES
  // ============================================
  const elektronika = await prisma.category.create({
    data: {
      name: 'Elektronika',
      slug: 'elektronika',
      image: '/images/categories/elektronika.jpg',
      order: 1,
    },
  });

  const smartfony = await prisma.category.create({
    data: {
      name: 'Smartfony',
      slug: 'smartfony',
      parentId: elektronika.id,
      image: '/images/categories/smartfony.jpg',
      order: 1,
    },
  });

  // Podkategorie smartfonów
  await prisma.category.createMany({
    data: [
      { name: 'iPhone', slug: 'iphone', parentId: smartfony.id, order: 1 },
      { name: 'Samsung', slug: 'samsung', parentId: smartfony.id, order: 2 },
      { name: 'Xiaomi', slug: 'xiaomi', parentId: smartfony.id, order: 3 },
    ],
  });

  const laptopy = await prisma.category.create({
    data: {
      name: 'Laptopy',
      slug: 'laptopy',
      parentId: elektronika.id,
      image: '/images/categories/laptopy.jpg',
      order: 2,
    },
  });

  // Podkategorie laptopów
  await prisma.category.createMany({
    data: [
      { name: 'Laptopy gamingowe', slug: 'laptopy-gamingowe', parentId: laptopy.id, order: 1 },
      { name: 'Ultrabooki', slug: 'ultrabooki', parentId: laptopy.id, order: 2 },
      { name: 'Laptopy 2w1', slug: 'laptopy-2w1', parentId: laptopy.id, order: 3 },
      { name: 'Laptopy biznesowe', slug: 'laptopy-biznesowe', parentId: laptopy.id, order: 4 },
    ],
  });

  const akcesoria = await prisma.category.create({
    data: {
      name: 'Akcesoria',
      slug: 'akcesoria',
      parentId: elektronika.id,
      image: '/images/categories/akcesoria.jpg',
      order: 3,
    },
  });

  const telewizory = await prisma.category.create({
    data: {
      name: 'Telewizory',
      slug: 'telewizory',
      parentId: elektronika.id,
      order: 4,
    },
  });

  const sluchawki = await prisma.category.create({
    data: {
      name: 'Słuchawki',
      slug: 'sluchawki',
      parentId: elektronika.id,
      order: 5,
    },
  });

  // MODA
  const moda = await prisma.category.create({
    data: {
      name: 'Moda',
      slug: 'moda',
      order: 2,
    },
  });

  await prisma.category.createMany({
    data: [
      { name: 'Odzież damska', slug: 'odziez-damska', parentId: moda.id, order: 1 },
      { name: 'Odzież męska', slug: 'odziez-meska', parentId: moda.id, order: 2 },
      { name: 'Buty', slug: 'buty', parentId: moda.id, order: 3 },
      { name: 'Akcesoria modowe', slug: 'akcesoria-moda', parentId: moda.id, order: 4 },
    ],
  });

  // DOM I OGRÓD
  const domIOgrod = await prisma.category.create({
    data: {
      name: 'Dom i Ogród',
      slug: 'dom-i-ogrod',
      order: 3,
    },
  });

  await prisma.category.createMany({
    data: [
      { name: 'Meble', slug: 'meble', parentId: domIOgrod.id, order: 1 },
      { name: 'Dekoracje', slug: 'dekoracje', parentId: domIOgrod.id, order: 2 },
      { name: 'Ogród', slug: 'ogrod', parentId: domIOgrod.id, order: 3 },
      { name: 'Narzędzia', slug: 'narzedzia', parentId: domIOgrod.id, order: 4 },
    ],
  });

  // SUPERMARKET
  const supermarket = await prisma.category.create({
    data: {
      name: 'Supermarket',
      slug: 'supermarket',
      order: 4,
    },
  });

  await prisma.category.createMany({
    data: [
      { name: 'Żywność', slug: 'zywnosc', parentId: supermarket.id, order: 1 },
      { name: 'Napoje', slug: 'napoje', parentId: supermarket.id, order: 2 },
      { name: 'Chemia domowa', slug: 'chemia-domowa', parentId: supermarket.id, order: 3 },
    ],
  });

  // DZIECKO
  const dziecko = await prisma.category.create({
    data: {
      name: 'Dziecko',
      slug: 'dziecko',
      order: 5,
    },
  });

  await prisma.category.createMany({
    data: [
      { name: 'Zabawki', slug: 'zabawki', parentId: dziecko.id, order: 1 },
      { name: 'Ubranka', slug: 'ubranka', parentId: dziecko.id, order: 2 },
      { name: 'Wózki', slug: 'wozki', parentId: dziecko.id, order: 3 },
    ],
  });

  // URODA
  const uroda = await prisma.category.create({
    data: {
      name: 'Uroda',
      slug: 'uroda',
      order: 6,
    },
  });

  await prisma.category.createMany({
    data: [
      { name: 'Pielęgnacja', slug: 'pielegnacja', parentId: uroda.id, order: 1 },
      { name: 'Makijaż', slug: 'makijaz', parentId: uroda.id, order: 2 },
      { name: 'Perfumy', slug: 'perfumy', parentId: uroda.id, order: 3 },
    ],
  });

  // MOTORYZACJA
  const motoryzacja = await prisma.category.create({
    data: {
      name: 'Motoryzacja',
      slug: 'motoryzacja',
      order: 7,
    },
  });

  await prisma.category.createMany({
    data: [
      { name: 'Części samochodowe', slug: 'czesci-samochodowe', parentId: motoryzacja.id, order: 1 },
      { name: 'Akcesoria samochodowe', slug: 'akcesoria-moto', parentId: motoryzacja.id, order: 2 },
      { name: 'Opony', slug: 'opony', parentId: motoryzacja.id, order: 3 },
    ],
  });

  // AGD (stare, zachowuję)
  const agd = await prisma.category.create({
    data: {
      name: 'AGD',
      slug: 'agd',
      image: '/images/categories/agd.jpg',
      order: 8,
    },
  });

  const agdMale = await prisma.category.create({
    data: {
      name: 'Małe AGD',
      slug: 'male-agd',
      parentId: agd.id,
      image: '/images/categories/male-agd.jpg',
      order: 1,
    },
  });

  console.log('📁 Created categories');

  // ============================================
  // WAREHOUSE LOCATIONS
  // ============================================
  const mainWarehouse = await prisma.location.create({
    data: {
      name: 'Magazyn Główny',
      code: 'MAG-01',
      type: 'WAREHOUSE',
    },
  });

  const zoneA = await prisma.location.create({
    data: {
      name: 'Strefa A - Elektronika',
      code: 'MAG-01-A',
      type: 'ZONE',
      parentId: mainWarehouse.id,
    },
  });

  const shelfA1 = await prisma.location.create({
    data: {
      name: 'Regał A1',
      code: 'MAG-01-A-01',
      type: 'SHELF',
      parentId: zoneA.id,
    },
  });

  const shelfA2 = await prisma.location.create({
    data: {
      name: 'Regał A2',
      code: 'MAG-01-A-02',
      type: 'SHELF',
      parentId: zoneA.id,
    },
  });

  console.log('🏭 Created warehouse locations');

  // ============================================
  // PRODUCTS
  // ============================================
  
  // Product 1: iPhone
  const iphone = await prisma.product.create({
    data: {
      name: 'Apple iPhone 15 Pro Max',
      slug: 'apple-iphone-15-pro-max',
      description: `Najnowszy flagowiec Apple z chipem A17 Pro, tytanową obudową i zaawansowanym systemem aparatów.

• **Chip A17 Pro:** Najszybszy procesor w smartfonie, stworzony z myślą o zaawansowanych grach i profesjonalnych aplikacjach.
• **Tytanowa konstrukcja:** Lekka i wytrzymała obudowa z tytanu klasy lotniczej, odporna na zarysowania.
• **Aparat 48MP:** Główny aparat z sensorem quad-pixel dla niesamowitych zdjęć w każdych warunkach oświetleniowych.
• **Action Button:** Konfigurowalny przycisk akcji do szybkiego dostępu do ulubionych funkcji.
• **USB-C:** Uniwersalne złącze USB-C z obsługą USB 3.0 dla szybszego transferu danych.`,
      specifications: {
        'Wyświetlacz': '6.7" Super Retina XDR OLED',
        'Procesor': 'Apple A17 Pro (3nm)',
        'Pamięć RAM': '8 GB',
        'Aparat główny': '48 MP + 12 MP + 12 MP',
        'Aparat przedni': '12 MP TrueDepth',
        'Bateria': '4422 mAh',
        'System': 'iOS 17',
        'Wymiary': '159.9 x 76.7 x 8.25 mm',
        'Waga': '221 g',
        'Wodoodporność': 'IP68',
        'Gwarancja': '24 miesiące'
      },
      sku: 'APPL-IPH15PM',
      barcode: '1234567890123',
      status: 'ACTIVE',
      price: 6499.00,
      compareAtPrice: 6999.00,
      categoryId: smartfony.id,
      metaTitle: 'iPhone 15 Pro Max - Kup w WBTrade',
      metaDescription: 'Apple iPhone 15 Pro Max w najlepszej cenie. Darmowa dostawa!',
    },
  });

  // iPhone images
  await prisma.productImage.createMany({
    data: [
      { productId: iphone.id, url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600', alt: 'iPhone 15 Pro Max przód', order: 0 },
      { productId: iphone.id, url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600', alt: 'iPhone 15 Pro Max tył', order: 1 },
      { productId: iphone.id, url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600', alt: 'iPhone 15 Pro Max bok', order: 2 },
    ],
  });

  // iPhone variants
  const iphoneVariant256 = await prisma.productVariant.create({
    data: {
      productId: iphone.id,
      name: '256GB - Tytan Naturalny',
      sku: 'APPL-IPH15PM-256-NAT',
      barcode: '1234567890124',
      price: 6499.00,
      compareAtPrice: 6999.00,
      attributes: { storage: '256GB', color: 'Tytan Naturalny' },
    },
  });

  const iphoneVariant512 = await prisma.productVariant.create({
    data: {
      productId: iphone.id,
      name: '512GB - Tytan Czarny',
      sku: 'APPL-IPH15PM-512-BLK',
      barcode: '1234567890125',
      price: 7499.00,
      compareAtPrice: 7999.00,
      attributes: { storage: '512GB', color: 'Tytan Czarny' },
    },
  });

  // Product 2: MacBook
  const macbook = await prisma.product.create({
    data: {
      name: 'Apple MacBook Pro 14" M3 Pro',
      slug: 'apple-macbook-pro-14-m3-pro',
      description: `Profesjonalny laptop Apple z chipem M3 Pro, 18GB RAM i ekranem Liquid Retina XDR.

• **Chip M3 Pro:** 11-rdzeniowy CPU i 14-rdzeniowy GPU dla błyskawicznej wydajności w zadaniach profesjonalnych.
• **Ekran Liquid Retina XDR:** 14.2" wyświetlacz z technologią ProMotion (120Hz), jasnością do 1600 nitów HDR i obsługą P3.
• **Pamięć ujednolicona 18GB:** Ultraszybka pamięć dla płynnej pracy z wieloma aplikacjami i dużymi projektami.
• **Bateria na cały dzień:** Do 17 godzin pracy na baterii przy odtwarzaniu wideo.
• **Zaawansowane złącza:** HDMI 2.1, gniazdo kart SDXC, MagSafe 3, Thunderbolt 4.`,
      specifications: {
        'Wyświetlacz': '14.2" Liquid Retina XDR (3024 x 1964)',
        'Procesor': 'Apple M3 Pro (11-rdzeniowy CPU)',
        'Pamięć RAM': '18 GB zunifikowana',
        'Karta graficzna': '14-rdzeniowy GPU',
        'Dysk SSD': '512 GB',
        'Bateria': 'Do 17 godzin',
        'System': 'macOS Sonoma',
        'Wymiary': '31.26 x 22.12 x 1.55 cm',
        'Waga': '1.61 kg',
        'Złącza': '3x Thunderbolt 4, HDMI, SDXC, MagSafe 3',
        'Gwarancja': '24 miesiące'
      },
      sku: 'APPL-MBP14-M3P',
      barcode: '1234567890200',
      status: 'ACTIVE',
      price: 9999.00,
      compareAtPrice: 10999.00,
      categoryId: laptopy.id,
      metaTitle: 'MacBook Pro 14 M3 Pro - WBTrade',
      metaDescription: 'Apple MacBook Pro 14 z chipem M3 Pro. Profesjonalna wydajność.',
    },
  });

  await prisma.productImage.createMany({
    data: [
      { productId: macbook.id, url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', alt: 'MacBook Pro 14 otwarty', order: 0 },
      { productId: macbook.id, url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600', alt: 'MacBook Pro 14 zamknięty', order: 1 },
    ],
  });

  const macbookVariant = await prisma.productVariant.create({
    data: {
      productId: macbook.id,
      name: '512GB SSD - Gwiezdna Szarość',
      sku: 'APPL-MBP14-M3P-512-GRY',
      barcode: '1234567890201',
      price: 9999.00,
      compareAtPrice: 10999.00,
      attributes: { storage: '512GB SSD', color: 'Gwiezdna Szarość', ram: '18GB' },
    },
  });

  // Product 3: Samsung Galaxy
  const samsung = await prisma.product.create({
    data: {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description: `Flagowy smartfon Samsung z rysikiem S Pen, aparatem 200MP i AI Galaxy.

• **Galaxy AI:** Inteligentne funkcje tłumaczenia w czasie rzeczywistym, podsumowywania notatek i edycji zdjęć.
• **Aparat 200MP:** Rewolucyjny sensor do zdjęć z niesamowitą szczegółowością, zoom optyczny 5x i Space Zoom 100x.
• **S Pen w zestawie:** Precyzyjny rysik do notowania, szkicowania i zdalnego sterowania aparatem.
• **Tytanowa ramka:** Wytrzymała konstrukcja z certyfikatem Armor Aluminum i szkłem Corning Gorilla Armor.
• **Ekran QHD+ Dynamic AMOLED 2X:** 6.8" z jasnością do 2600 nitów i adaptive refresh 1-120Hz.`,
      specifications: {
        'Wyświetlacz': '6.8" Dynamic AMOLED 2X QHD+ (3088 x 1440)',
        'Procesor': 'Snapdragon 8 Gen 3 for Galaxy',
        'Pamięć RAM': '12 GB',
        'Aparat główny': '200 MP + 50 MP + 12 MP + 10 MP',
        'Aparat przedni': '12 MP',
        'Bateria': '5000 mAh',
        'System': 'Android 14 z One UI 6.1',
        'Wymiary': '162.3 x 79.0 x 8.6 mm',
        'Waga': '232 g',
        'Wodoodporność': 'IP68',
        'S Pen': 'Wbudowany',
        'Gwarancja': '24 miesiące'
      },
      sku: 'SAMS-GS24U',
      barcode: '1234567890300',
      status: 'ACTIVE',
      price: 5999.00,
      compareAtPrice: 6499.00,
      categoryId: smartfony.id,
    },
  });

  await prisma.productImage.create({
    data: { productId: samsung.id, url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600', alt: 'Samsung Galaxy S24 Ultra', order: 0 },
  });

  const samsungVariant = await prisma.productVariant.create({
    data: {
      productId: samsung.id,
      name: '256GB - Titanium Black',
      sku: 'SAMS-GS24U-256-BLK',
      barcode: '1234567890301',
      price: 5999.00,
      compareAtPrice: 6499.00,
      attributes: { storage: '256GB', color: 'Titanium Black' },
    },
  });

  // Product 4: AirPods
  const airpods = await prisma.product.create({
    data: {
      name: 'Apple AirPods Pro 2',
      slug: 'apple-airpods-pro-2',
      description: `Słuchawki bezprzewodowe z aktywną redukcją szumów i etui z USB-C.

• **Aktywna redukcja szumów 2x lepsza:** Zaawansowany chip H2 eliminuje nawet dwa razy więcej szumów otoczenia.
• **Dźwięk przestrzenny:** Spersonalizowany dźwięk przestrzenny z dynamicznym śledzeniem ruchów głowy.
• **Tryb przezroczystości adaptacyjnej:** Słyszysz otoczenie, redukując jednocześnie głośne dźwięki.
• **Sterowanie dotykowe:** Przesuwaj palcem po nóżce, aby regulować głośność.
• **Etui MagSafe z USB-C:** Precyzyjne lokalizowanie przez Znajdź, ładowanie bezprzewodowe i USB-C.`,
      specifications: {
        'Typ': 'Dokanałowe TWS',
        'Chip': 'Apple H2',
        'ANC': 'Tak (aktywna redukcja szumów)',
        'Dźwięk przestrzenny': 'Dolby Atmos',
        'Czas pracy (słuchawki)': 'Do 6 godzin (ANC włączone)',
        'Czas pracy (z etui)': 'Do 30 godzin',
        'Wodoodporność': 'IPX4 (słuchawki i etui)',
        'Łączność': 'Bluetooth 5.3',
        'Złącze etui': 'USB-C, MagSafe, Qi',
        'Waga słuchawki': '5.3 g (każda)',
        'Waga etui': '50.8 g',
        'Gwarancja': '24 miesiące'
      },
      sku: 'APPL-APP2',
      barcode: '1234567890400',
      status: 'ACTIVE',
      price: 1199.00,
      compareAtPrice: 1349.00,
      categoryId: akcesoria.id,
    },
  });

  await prisma.productImage.create({
    data: { productId: airpods.id, url: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600', alt: 'AirPods Pro 2', order: 0 },
  });

  const airpodsVariant = await prisma.productVariant.create({
    data: {
      productId: airpods.id,
      name: 'AirPods Pro 2 USB-C',
      sku: 'APPL-APP2-USBC',
      barcode: '1234567890401',
      price: 1199.00,
      compareAtPrice: 1349.00,
      attributes: { version: 'USB-C' },
    },
  });

  // Product 5: Ekspres do kawy
  const ekspres = await prisma.product.create({
    data: {
      name: 'DeLonghi Magnifica S ECAM',
      slug: 'delonghi-magnifica-s-ecam',
      description: `Automatyczny ekspres do kawy z młynkiem, spieniaczem mleka i 13 programami.

• **Wbudowany młynek stożkowy:** 13 stopni regulacji mielenia dla idealnego smaku kawy z każdego ziarna.
• **System spieniania mleka:** Klasyczna dysza cappuccino do tworzenia gęstej, kremowej pianki.
• **Funkcja podwójnego espresso:** Przygotuj dwie kawy jednocześnie, oszczędzając czas.
• **Regulacja mocy i ilości:** Dostosuj intensywność kawy i objętość napoju do własnych preferencji.
• **Łatwe czyszczenie:** Automatyczne programy odkamieniania i płukania, wyjmowana grupa zaparzająca.`,
      specifications: {
        'Typ': 'Automatyczny z młynkiem',
        'Ciśnienie': '15 barów',
        'Młynek': 'Stożkowy stalowy',
        'Stopnie mielenia': '13',
        'Pojemność wody': '1.8 l',
        'Pojemność kawy': '250 g',
        'Moc': '1450 W',
        'Programy': 'Espresso, Lungo, Kawa, Cappuccino',
        'Spieniacz mleka': 'Tak (dysza parowa)',
        'Wymiary': '23.8 x 43 x 35.1 cm',
        'Waga': '9 kg',
        'Kolor': 'Czarny',
        'Gwarancja': '24 miesiące'
      },
      sku: 'DELO-MAGS',
      barcode: '1234567890500',
      status: 'ACTIVE',
      price: 1799.00,
      compareAtPrice: 2199.00,
      categoryId: agdMale.id,
    },
  });

  await prisma.productImage.create({
    data: { productId: ekspres.id, url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600', alt: 'DeLonghi Magnifica', order: 0 },
  });

  const ekspresVariant = await prisma.productVariant.create({
    data: {
      productId: ekspres.id,
      name: 'Magnifica S - Czarny',
      sku: 'DELO-MAGS-BLK',
      barcode: '1234567890501',
      price: 1799.00,
      compareAtPrice: 2199.00,
      attributes: { color: 'Czarny' },
    },
  });

  console.log('📦 Created products with variants');

  // ============================================
  // INVENTORY
  // ============================================
  await prisma.inventory.createMany({
    data: [
      { variantId: iphoneVariant256.id, locationId: shelfA1.id, quantity: 25, reserved: 2, minimum: 5 },
      { variantId: iphoneVariant512.id, locationId: shelfA1.id, quantity: 15, reserved: 0, minimum: 3 },
      { variantId: macbookVariant.id, locationId: shelfA2.id, quantity: 8, reserved: 1, minimum: 2 },
      { variantId: samsungVariant.id, locationId: shelfA1.id, quantity: 30, reserved: 3, minimum: 5 },
      { variantId: airpodsVariant.id, locationId: shelfA2.id, quantity: 50, reserved: 5, minimum: 10 },
      { variantId: ekspresVariant.id, locationId: shelfA2.id, quantity: 12, reserved: 0, minimum: 3 },
    ],
  });

  console.log('📊 Created inventory');

  // ============================================
  // STOCK MOVEMENTS (history)
  // ============================================
  await prisma.stockMovement.createMany({
    data: [
      { variantId: iphoneVariant256.id, type: 'RECEIVE', quantity: 30, toLocationId: shelfA1.id, reference: 'PZ/2024/001', notes: 'Dostawa od Apple' },
      { variantId: iphoneVariant256.id, type: 'SHIP', quantity: -3, fromLocationId: shelfA1.id, reference: 'WZ/2024/001', notes: 'Zamówienie #1001' },
      { variantId: iphoneVariant256.id, type: 'RESERVE', quantity: -2, fromLocationId: shelfA1.id, reference: 'ORD-1002', notes: 'Rezerwacja zamówienia' },
      { variantId: macbookVariant.id, type: 'RECEIVE', quantity: 10, toLocationId: shelfA2.id, reference: 'PZ/2024/002', notes: 'Dostawa od Apple' },
      { variantId: samsungVariant.id, type: 'RECEIVE', quantity: 35, toLocationId: shelfA1.id, reference: 'PZ/2024/003', notes: 'Dostawa od Samsung' },
    ],
  });

  console.log('📋 Created stock movements');

  // ============================================
  // TAX RATES
  // ============================================
  await prisma.taxRate.createMany({
    data: [
      { name: 'VAT 23%', rate: 23.00, country: 'PL' },
      { name: 'VAT 8%', rate: 8.00, country: 'PL' },
      { name: 'VAT 0%', rate: 0.00, country: 'PL' },
    ],
  });

  console.log('💰 Created tax rates');

  // ============================================
  // COUPONS
  // ============================================
  await prisma.coupon.createMany({
    data: [
      { 
        code: 'WELCOME10', 
        description: '10% zniżki dla nowych klientów', 
        type: 'PERCENTAGE', 
        value: 10.00,
        minimumAmount: 100.00,
        maximumUses: 1000,
        expiresAt: new Date('2025-12-31'),
      },
      { 
        code: 'SUMMER50', 
        description: '50 PLN zniżki przy zakupach powyżej 500 PLN', 
        type: 'FIXED_AMOUNT', 
        value: 50.00,
        minimumAmount: 500.00,
        maximumUses: 500,
        expiresAt: new Date('2025-08-31'),
      },
      { 
        code: 'FREESHIP', 
        description: 'Darmowa dostawa', 
        type: 'FREE_SHIPPING', 
        value: 0.00,
        minimumAmount: 200.00,
      },
    ],
  });

  console.log('🎟️ Created coupons');

  // ============================================
  // SAMPLE ORDER
  // ============================================
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2024-0001',
      userId: customerUser.id,
      status: 'PROCESSING',
      shippingAddressId: customerAddress.id,
      billingAddressId: customerAddress.id,
      shippingMethod: 'inpost_paczkomat',
      paymentMethod: 'blik',
      paymentStatus: 'PAID',
      subtotal: 7698.00,
      discount: 0,
      shipping: 0,
      tax: 1437.49,
      total: 7698.00,
      customerNotes: 'Proszę o dostawę do paczkomatu WAW01A',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order.id,
        variantId: iphoneVariant256.id,
        productName: 'Apple iPhone 15 Pro Max',
        variantName: '256GB - Tytan Naturalny',
        sku: 'APPL-IPH15PM-256-NAT',
        quantity: 1,
        unitPrice: 6499.00,
        total: 6499.00,
      },
      {
        orderId: order.id,
        variantId: airpodsVariant.id,
        productName: 'Apple AirPods Pro 2',
        variantName: 'AirPods Pro 2 USB-C',
        sku: 'APPL-APP2-USBC',
        quantity: 1,
        unitPrice: 1199.00,
        total: 1199.00,
      },
    ],
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      { orderId: order.id, status: 'PENDING', note: 'Zamówienie złożone', createdBy: customerUser.id },
      { orderId: order.id, status: 'CONFIRMED', note: 'Płatność BLIK potwierdzona', createdBy: null },
      { orderId: order.id, status: 'PROCESSING', note: 'Zamówienie w realizacji', createdBy: warehouseUser.id },
    ],
  });

  console.log('🛒 Created sample order');

  // ============================================
  // CART
  // ============================================
  const cart = await prisma.cart.create({
    data: {
      userId: customerUser.id,
    },
  });

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      variantId: samsungVariant.id,
      quantity: 1,
    },
  });

  console.log('🛒 Created sample cart');

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   - 3 users (admin, warehouse, customer)');
  console.log('   - 6 categories (with hierarchy)');
  console.log('   - 5 products with variants');
  console.log('   - 4 warehouse locations');
  console.log('   - Inventory for all variants');
  console.log('   - 3 coupons');
  console.log('   - 1 sample order');
  console.log('');
  console.log('🔐 Login credentials:');
  console.log('   Admin: admin@wbtrade.pl / password123');
  console.log('   Warehouse: magazyn@wbtrade.pl / password123');
  console.log('   Customer: klient@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
