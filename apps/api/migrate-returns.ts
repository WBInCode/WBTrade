/**
 * Data Migration Script: Migrate existing return/complaint tickets to ReturnRequest records
 * 
 * This script converts existing SupportTickets with category RETURN or COMPLAINT
 * into proper ReturnRequest entries with the new status workflow.
 * 
 * Status mapping:
 *   Ticket OPEN       → ReturnRequest NEW
 *   Ticket IN_PROGRESS → ReturnRequest RECEIVED
 *   Ticket CLOSED      → ReturnRequest CLOSED
 * 
 * Usage:
 *   npx ts-node apps/api/migrate-returns.ts
 *   or:
 *   node -r ts-node/register apps/api/migrate-returns.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_MAP: Record<string, string> = {
  OPEN: 'NEW',
  IN_PROGRESS: 'RECEIVED',
  CLOSED: 'CLOSED',
};

async function migrateReturns() {
  console.log('🔄 Starting return migration...\n');

  // Find all return/complaint tickets that DON'T have a ReturnRequest yet
  const tickets = await prisma.supportTicket.findMany({
    where: {
      category: { in: ['RETURN', 'COMPLAINT'] },
      returnRequest: null, // Only tickets not yet migrated
    },
    include: {
      order: {
        include: {
          items: true,
        },
      },
      user: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📋 Found ${tickets.length} tickets to migrate\n`);

  if (tickets.length === 0) {
    console.log('✅ Nothing to migrate. All return/complaint tickets already have ReturnRequest records.');
    await prisma.$disconnect();
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const ticket of tickets) {
    try {
      // Skip if no order linked
      if (!ticket.orderId || !ticket.order) {
        console.log(`⚠️  Skipping ticket ${ticket.ticketNumber}: no order linked`);
        skipped++;
        continue;
      }

      const newStatus = STATUS_MAP[ticket.status] || 'NEW';
      const type = ticket.category === 'COMPLAINT' ? 'COMPLAINT' : 'RETURN';

      // Generate return number if ticket doesn't have one
      const returnNumber = ticket.returnNumber || `RET-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Create ReturnRequest with all order items
      await prisma.returnRequest.create({
        data: {
          returnNumber,
          orderId: ticket.orderId,
          ticketId: ticket.id,
          status: newStatus as any,
          type,
          reason: ticket.subject || 'Migrated from support ticket',
          closedAt: ticket.closedAt,
          closedBy: ticket.closedBy,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          // Create return items for all order items
          items: {
            create: ticket.order.items.map((item) => ({
              orderItemId: item.id,
              quantity: item.quantity,
              reason: null,
            })),
          },
        },
      });

      // Update ticket with return number if it didn't have one
      if (!ticket.returnNumber) {
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { returnNumber },
        });
      }

      migrated++;
      console.log(`✅ Migrated ${ticket.ticketNumber} (${returnNumber}) → ${newStatus}`);
    } catch (error: any) {
      errors++;
      console.error(`❌ Error migrating ${ticket.ticketNumber}:`, error.message);
    }
  }

  console.log('\n────────────────────────────────────');
  console.log(`📊 Migration complete:`);
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⚠️  Skipped:  ${skipped}`);
  console.log(`   ❌ Errors:   ${errors}`);
  console.log('────────────────────────────────────\n');

  await prisma.$disconnect();
}

migrateReturns().catch((err) => {
  console.error('Fatal migration error:', err);
  prisma.$disconnect();
  process.exit(1);
});
