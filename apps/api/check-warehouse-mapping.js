const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Pobierz wszystkie konfiguracje Baselinker (może być ich kilka dla różnych magazynów)
  const configs = await prisma.baselinkerConfig.findMany();
  
  console.log('Konfiguracje Baselinkera w bazie:', configs.length);
  configs.forEach(c => {
    console.log('  Inventory ID:', c.inventoryId);
    console.log('  Sync enabled:', c.syncEnabled);
    console.log('  ---');
  });
  
  // Sprawdź jakie prefixy odpowiadają jakim inventory ID
  // Potrzebujemy zmapować: btp -> inventory_id, hp -> inventory_id, itp.
  console.log('\n📋 Potrzebne mapowanie magazynów:');
  console.log('   Prefix "btp" -> Inventory ID = ?');
  console.log('   Prefix "hp" -> Inventory ID = ?');
  console.log('   Prefix "leker" -> Inventory ID = ?');
  console.log('   Brak prefiksu (liczba) -> Inventory ID = ? (domyślny)');
  console.log('\n💡 Te ID znajdziesz w panelu Baselinker → Moje magazyny');
}

main().finally(() => prisma.$disconnect());
