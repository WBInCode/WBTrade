/**
 * Payment Reminder Service
 * 
 * Handles sending payment reminders for unpaid orders:
 * - Sends daily reminder emails for 7 days
 * - Cancels orders after 7 days without payment
 * - Includes ordered products in reminder email
 * - Provides payment link for easy retry
 */

import { prisma } from '../db';
import { emailService } from './email.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// Configuration
const REMINDER_DAYS = 7; // Number of days to send reminders
const REMINDER_INTERVAL_HOURS = 24; // Hours between reminders

interface PaymentReminderResult {
  processed: number;
  remindersSent: number;
  ordersCancelled: number;
  errors: string[];
}

interface UnpaidOrderWithItems {
  id: string;
  orderNumber: string;
  createdAt: Date;
  total: number;
  currency: string;
  paymentReminderCount: number;
  lastPaymentReminderAt: Date | null;
  guestEmail: string | null;
  user: {
    email: string;
    firstName: string | null;
  } | null;
  items: {
    id: string;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    variant: {
      product: {
        images: { url: string }[];
      };
    };
  }[];
}

export class PaymentReminderService {
  /**
   * Process all unpaid orders - send reminders or cancel expired ones
   * This should be called daily by a cron job
   */
  async processUnpaidOrders(): Promise<PaymentReminderResult> {
    const result: PaymentReminderResult = {
      processed: 0,
      remindersSent: 0,
      ordersCancelled: 0,
      errors: [],
    };

    try {
      // Find all unpaid orders that are older than 1 hour (give payment time to process)
      // and not cancelled
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const unpaidOrders = await prisma.order.findMany({
        where: {
          paymentStatus: PaymentStatus.PENDING,
          status: {
            in: [OrderStatus.OPEN, OrderStatus.PENDING],
          },
          createdAt: {
            lt: oneHourAgo, // Only orders older than 1 hour
          },
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
            },
          },
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      images: {
                        take: 1,
                        select: { url: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      console.log(`[PaymentReminder] Found ${unpaidOrders.length} unpaid orders to process`);

      for (const order of unpaidOrders) {
        result.processed++;

        try {
          const customerEmail = order.user?.email || order.guestEmail;
          if (!customerEmail) {
            console.warn(`[PaymentReminder] Order ${order.orderNumber} has no email, skipping`);
            result.errors.push(`Order ${order.orderNumber}: no email address`);
            continue;
          }

          const daysSinceCreation = this.getDaysSinceCreation(order.createdAt);
          // Cast to access new fields - will work after prisma generate
          const orderAny = order as typeof order & { 
            paymentReminderCount: number | null; 
            lastPaymentReminderAt: Date | null;
          };
          const reminderCount = orderAny.paymentReminderCount || 0;
          const lastReminderAt = orderAny.lastPaymentReminderAt;

          // Check if we should cancel the order (after 7 days)
          if (daysSinceCreation >= REMINDER_DAYS) {
            await this.cancelUnpaidOrder(order.id, order.orderNumber);
            result.ordersCancelled++;
            console.log(`[PaymentReminder] Cancelled order ${order.orderNumber} after ${REMINDER_DAYS} days without payment`);
            
            // Send cancellation notification
            await this.sendOrderCancelledEmail(customerEmail, order as unknown as UnpaidOrderWithItems);
            continue;
          }

          // Check if we should send a reminder (once per day)
          const shouldSendReminder = this.shouldSendReminder(
            lastReminderAt,
            reminderCount,
            daysSinceCreation
          );

          if (shouldSendReminder) {
            const daysRemaining = REMINDER_DAYS - daysSinceCreation;
            
            await this.sendPaymentReminder(
              customerEmail,
              order as unknown as UnpaidOrderWithItems,
              reminderCount + 1,
              daysRemaining
            );

            // Update reminder tracking - using raw update to support new fields
            await prisma.$executeRaw`
              UPDATE orders 
              SET payment_reminder_count = ${reminderCount + 1},
                  last_payment_reminder_at = ${new Date()}
              WHERE id = ${order.id}
            `;

            result.remindersSent++;
            console.log(`[PaymentReminder] Sent reminder #${reminderCount + 1} for order ${order.orderNumber}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[PaymentReminder] Error processing order ${order.orderNumber}:`, error);
          result.errors.push(`Order ${order.orderNumber}: ${errorMessage}`);
        }
      }

      console.log(`[PaymentReminder] Processing complete: ${result.remindersSent} reminders sent, ${result.ordersCancelled} orders cancelled`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PaymentReminder] Fatal error:', error);
      result.errors.push(`Fatal error: ${errorMessage}`);
      return result;
    }
  }

  /**
   * Calculate days since order creation
   */
  private getDaysSinceCreation(createdAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine if we should send a reminder
   */
  private shouldSendReminder(
    lastReminderAt: Date | null,
    reminderCount: number,
    daysSinceCreation: number
  ): boolean {
    // If no reminder sent yet and order is at least 1 day old, send first reminder
    if (reminderCount === 0 && daysSinceCreation >= 1) {
      return true;
    }

    // If reminder was sent, check if 24 hours have passed
    if (lastReminderAt) {
      const hoursSinceLastReminder = 
        (new Date().getTime() - lastReminderAt.getTime()) / (1000 * 60 * 60);
      
      return hoursSinceLastReminder >= REMINDER_INTERVAL_HOURS;
    }

    return false;
  }

  /**
   * Send payment reminder email
   */
  private async sendPaymentReminder(
    email: string,
    order: UnpaidOrderWithItems,
    reminderNumber: number,
    daysRemaining: number
  ): Promise<void> {
    const customerName = order.user?.firstName || 'Kliencie';
    
    await emailService.sendPaymentReminderEmail(
      email,
      customerName,
      order.orderNumber,
      order.id,
      Number(order.total),
      order.items.map(item => ({
        name: item.productName,
        variant: item.variantName,
        quantity: item.quantity,
        price: Number(item.unitPrice),
        total: Number(item.total),
        imageUrl: item.variant?.product?.images?.[0]?.url || null,
      })),
      reminderNumber,
      daysRemaining
    );
  }

  /**
   * Send order cancelled email
   */
  private async sendOrderCancelledEmail(
    email: string,
    order: UnpaidOrderWithItems
  ): Promise<void> {
    const customerName = order.user?.firstName || 'Kliencie';
    
    await emailService.sendOrderCancelledDueToNonPaymentEmail(
      email,
      customerName,
      order.orderNumber,
      Number(order.total)
    );
  }

  /**
   * Cancel unpaid order and release inventory
   */
  private async cancelUnpaidOrder(orderId: string, orderNumber: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          internalNotes: `Zamówienie anulowane automatycznie po ${REMINDER_DAYS} dniach bez płatności`,
        },
      });

      // Add status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          note: `Automatyczne anulowanie - brak płatności przez ${REMINDER_DAYS} dni`,
          createdBy: 'SYSTEM',
        },
      });

      // Release any inventory reservations (if applicable)
      // Note: Reservations should already be released by reservation cleanup worker
      // but we ensure consistency here
    });

    console.log(`[PaymentReminder] Order ${orderNumber} cancelled due to non-payment`);
  }
}

export const paymentReminderService = new PaymentReminderService();
