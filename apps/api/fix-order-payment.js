/**
 * Fix payment status for order WB-MKYMVNL9-JVCV
 * The payment was completed (PayU confirmed) but webhook didn't update the status
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function decryptToken(ciphertext, iv, authTag) {
  const key = Buffer.from(process.env.BASELINKER_ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  const orderNumber = 'WB-MKYMVNL9-JVCV';
  
  // 1. Find order
  const order = await prisma.order.findFirst({
    where: { orderNumber }
  });
  
  if (!order) {
    console.log('Order not found!');
    return;
  }
  
  console.log('=== PRZED AKTUALIZACJĄ ===');
  console.log('Order:', order.orderNumber);
  console.log('paymentStatus:', order.paymentStatus);
  console.log('status:', order.status);
  console.log('baselinkerOrderId:', order.baselinkerOrderId);
  
  // 2. Update order payment status to PAID
  await prisma.order.update({
    where: { id: order.id },
    data: { 
      paymentStatus: 'PAID',
      status: 'CONFIRMED'
    }
  });
  
  // 3. Add to status history
  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      status: 'CONFIRMED',
      note: '[FIX] Płatność potwierdzona ręcznie - webhook PayU nie zadziałał',
    }
  });
  
  console.log('\n✅ Status płatności zaktualizowany na PAID');
  
  // 4. Update Baselinker order status
  if (order.baselinkerOrderId) {
    console.log('\n=== AKTUALIZACJA BASELINKER ===');
    
    const config = await prisma.baselinkerConfig.findFirst({
      where: { syncEnabled: true }
    });
    
    if (config) {
      const token = await decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );
      
      const PAID_STATUS_ID = 65342; // "Nowe zamówienia" - opłacone
      
      const formData = new URLSearchParams();
      formData.append('method', 'setOrderStatus');
      formData.append('parameters', JSON.stringify({
        order_id: parseInt(order.baselinkerOrderId),
        status_id: PAID_STATUS_ID
      }));
      
      const response = await fetch('https://api.baselinker.com/connector.php', {
        method: 'POST',
        headers: {
          'X-BLToken': token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      
      const result = await response.json();
      
      if (result.status === 'SUCCESS') {
        console.log('✅ Status w Baselinkerze zaktualizowany na "Nowe zamówienia" (opłacone)');
      } else {
        console.log('❌ Błąd Baselinker:', result);
      }
    }
  }
  
  // 5. Verify
  const updated = await prisma.order.findFirst({
    where: { orderNumber }
  });
  
  console.log('\n=== PO AKTUALIZACJI ===');
  console.log('paymentStatus:', updated.paymentStatus);
  console.log('status:', updated.status);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
