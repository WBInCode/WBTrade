const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addRefundColumns() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS refund_number VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS refund_reason TEXT,
      ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP
    `);
    console.log('✅ Refund columns added successfully');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addRefundColumns();
