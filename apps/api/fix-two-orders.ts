/**
 * Szybki fix dla 2 konkretnych zamówień BL
 */
import { prisma } from './src/db';
import { decryptToken } from './src/lib/encryption';
import { createBaselinkerProvider } from './src/providers/baselinker';

const BL_ORDER_IDS = ['43939323'];

async function main() {
  const config = await prisma.baselinkerConfig.findFirst({ where: { syncEnabled: true } });
  if (!config) { console.log('❌ Brak konfiguracji Baselinker'); return; }
  
  const apiToken = decryptToken(config.apiTokenEncrypted, config.encryptionIv, config.authTag);
  const provider = createBaselinkerProvider({ apiToken, inventoryId: config.inventoryId });
  
  for (const blId of BL_ORDER_IDS) {
    const order = await prisma.order.findFirst({ 
      where: { baselinkerOrderId: blId },
      select: { orderNumber: true, total: true, paymentMethod: true }
    });
    
    if (!order) { 
      console.log(`⚠️ Brak zamówienia dla BL#${blId}`); 
      continue; 
    }
    
    console.log(`\n📋 Aktualizuję BL#${blId} (${order.orderNumber})`);
    console.log(`   Kwota: ${order.total} PLN | Metoda: ${order.paymentMethod}`);
    
    try {
      // 1. Ustaw płatność
      await provider.setOrderPayment(
        blId, 
        Number(order.total), 
        Math.floor(Date.now() / 1000), 
        `Płatność ${order.paymentMethod || 'online'}`
      );
      console.log(`   ✅ Płatność ustawiona`);
      
      // 2. Zmień status na "Nowe zamówienia"
      await provider.setOrderStatus(blId, 65342);
      console.log(`   ✅ Status zmieniony na "Nowe zamówienia"`);
    } catch (error) {
      console.log(`   ❌ Błąd: ${error}`);
    }
    
    // Pauza między requestami
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n✅ Gotowe!');
  await prisma.$disconnect();
}

main().catch(console.error);
