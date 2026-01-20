import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearOrders() {
  console.log('🗑️  Usuwanie zamówień testowych...\n');

  try {
    // Usuń historię statusów (ma onDelete: Cascade, ale dla pewności)
    const deletedHistory = await prisma.orderStatusHistory.deleteMany({});
    console.log(`✓ Usunięto ${deletedHistory.count} wpisów historii statusów`);

    // Usuń pozycje zamówień (ma onDelete: Cascade, ale dla pewności)
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`✓ Usunięto ${deletedOrderItems.count} pozycji zamówień`);

    // Teraz usuń zamówienia
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✓ Usunięto ${deletedOrders.count} zamówień`);

    console.log('\n✅ Wszystkie zamówienia testowe zostały usunięte!');
  } catch (error) {
    console.error('❌ Błąd podczas usuwania:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearOrders();
