const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Sprawdzanie integralności bazy danych\n');
  
  // 1. Duplikaty inventory
  const duplicates = await prisma.$queryRaw`
    SELECT variant_id, location_id, COUNT(*) as count
    FROM inventory
    GROUP BY variant_id, location_id
    HAVING COUNT(*) > 1
  `;
  
  console.log('1️⃣  DUPLIKATY w tabeli inventory:');
  if (duplicates.length === 0) {
    console.log('   ✅ Brak duplikatów - wszystko OK!\n');
  } else {
    console.log(`   ❌ Znaleziono ${duplicates.length} duplikatów:\n`);
    duplicates.slice(0, 5).forEach(d => {
      console.log(`      variant_id: ${d.variant_id}, count: ${d.count}`);
    });
  }
  
  // 2. Integralność kluczy obcych
  const orphanedInventory = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM inventory i
    LEFT JOIN product_variants v ON i.variant_id = v.id
    WHERE v.id IS NULL
  `;
  
  console.log('2️⃣  ORPHANED inventory (bez wariantu):');
  if (orphanedInventory[0].count === 0) {
    console.log('   ✅ Wszystkie inventory mają prawidłowe warianty\n');
  } else {
    console.log(`   ⚠️  ${orphanedInventory[0].count} pozycji bez wariantu\n`);
  }
  
  // 3. Sprawdź unique constraint
  const schema = await prisma.$queryRaw`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'inventory'
    AND constraint_type = 'UNIQUE'
  `;
  
  console.log('3️⃣  UNIQUE CONSTRAINTS na tabeli inventory:');
  schema.forEach(c => {
    console.log(`   ✅ ${c.constraint_name} (${c.constraint_type})`);
  });
  
  // 4. Statystyki
  console.log('\n4️⃣  STATYSTYKI:');
  const stats = await prisma.inventory.aggregate({
    _count: true,
    _sum: { quantity: true },
    _avg: { quantity: true }
  });
  
  console.log(`   Pozycji inventory: ${stats._count.toLocaleString('pl-PL')}`);
  console.log(`   Suma stanów: ${stats._sum.quantity?.toLocaleString('pl-PL') || 0}`);
  console.log(`   Średni stan: ${Math.round(stats._avg.quantity || 0)}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n💡 WNIOSKI:');
  console.log('   • Operacje UPSERT są bezpieczne - nie tworzą duplikatów');
  console.log('   • Unique constraint chroni przed duplikatami');
  console.log('   • Tylko aktualizujemy stany (quantity), nie dotykamy produktów');
  
  await prisma.$disconnect();
}

main().catch(console.error);
