// Test połączenia z Neon PostgreSQL
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔄 Testowanie połączenia z Neon...\n');

    // Test 1: Sprawdzenie bazy danych
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version()`;
    console.log('✅ Połączenie z bazą danych: OK');
    console.log(`   Czas serwera: ${result[0].current_time}`);
    console.log(`   PostgreSQL: ${result[0].version}\n`);

    // Test 2: Liczba użytkowników
    const userCount = await prisma.user.count();
    console.log(`✅ Liczba użytkowników w bazie: ${userCount}`);

    // Test 3: Liczba produktów
    const productCount = await prisma.product.count();
    console.log(`✅ Liczba produktów w bazie: ${productCount}`);

    // Test 4: Liczba zamówień
    const orderCount = await prisma.order.count();
    console.log(`✅ Liczba zamówień w bazie: ${orderCount}\n`);

    // Test 5: Przykład zapytania
    const categories = await prisma.category.findMany({ take: 3 });
    console.log(`✅ Pierwsze 3 kategorie:`);
    categories.forEach((cat, i) => {
      console.log(`   ${i + 1}. ${cat.name} (${cat.slug})`);
    });

    console.log('\n✅ WSZYSTKIE TESTY PRZESZŁY POMYŚLNIE');
    console.log('🎉 Neon PostgreSQL jest podłączony i działa!\n');

  } catch (error) {
    console.error('❌ Błąd połączenia:', error.message);
    console.error('\n📋 Sprawdź:');
    console.error('   1. Czy connection string jest poprawny?');
    console.error('   2. Czy Neon instancja jest aktywna?');
    console.error('   3. Czy baza neondb istnieje?');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
