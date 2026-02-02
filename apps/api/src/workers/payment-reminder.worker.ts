/**
 * Payment Reminder Worker
 * 
 * Processes payment reminder jobs:
 * - Runs daily to check for unpaid orders
 * - Sends reminder emails for orders pending payment
 * - Cancels orders after 7 days without payment
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, queueConnection, getQueue } from '../lib/queue';
import { paymentReminderService } from '../services/payment-reminder.service';

interface PaymentReminderJobData {
  timestamp: number;
}

/**
 * Create payment reminder worker
 */
export function createPaymentReminderWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.PAYMENT_REMINDER,
    async (job: Job) => {
      console.log(`[PaymentReminderWorker] Processing job ${job.name}:`, job.data);

      switch (job.name) {
        case 'process-unpaid-orders':
          return await processUnpaidOrders(job);
        default:
          console.warn(`[PaymentReminderWorker] Unknown job type: ${job.name}`);
          return { success: false, error: 'Unknown job type' };
      }
    },
    {
      connection: queueConnection,
      concurrency: 1, // Process one at a time
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[PaymentReminderWorker] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[PaymentReminderWorker] Job ${job?.id} failed:`, err);
  });

  console.log('✅ Payment reminder worker started');
  return worker;
}

/**
 * Process unpaid orders - send reminders or cancel expired
 */
async function processUnpaidOrders(_job: Job<PaymentReminderJobData>) {
  console.log(`[PaymentReminderWorker] Starting unpaid orders processing at ${new Date().toISOString()}`);
  
  try {
    const result = await paymentReminderService.processUnpaidOrders();
    
    console.log(`[PaymentReminderWorker] Processing complete:`);
    console.log(`  - Processed: ${result.processed} orders`);
    console.log(`  - Reminders sent: ${result.remindersSent}`);
    console.log(`  - Orders cancelled: ${result.ordersCancelled}`);
    console.log(`  - Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.warn('[PaymentReminderWorker] Errors:', result.errors.slice(0, 10));
    }
    
    return result;
  } catch (error) {
    console.error('[PaymentReminderWorker] Processing failed:', error);
    throw error;
  }
}

/**
 * Schedule recurring payment reminder processing
 * Runs daily at 10:00 AM (Warsaw time)
 */
export async function schedulePaymentReminders(): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.PAYMENT_REMINDER);
  
  // Remove existing repeatable jobs first
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'process-unpaid-orders') {
      await queue.removeRepeatableByKey(job.key);
    }
  }
  
  // Add new repeatable job - runs daily at 10:00 AM
  // Using cron pattern: minute hour day-of-month month day-of-week
  await queue.add(
    'process-unpaid-orders',
    { 
      timestamp: Date.now(),
    },
    {
      repeat: {
        pattern: '0 10 * * *', // Every day at 10:00 AM
        tz: 'Europe/Warsaw', // Polish timezone
      },
      removeOnComplete: 30, // Keep last 30 completed jobs
      removeOnFail: 30, // Keep last 30 failed jobs
    }
  );

  console.log('✅ Payment reminder scheduled (daily at 10:00 AM Warsaw time)');
}

/**
 * Manually trigger payment reminder processing (for testing/admin)
 */
export async function triggerPaymentReminders(): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.PAYMENT_REMINDER);
  
  await queue.add(
    'process-unpaid-orders',
    { 
      timestamp: Date.now(),
    },
    {
      removeOnComplete: 10,
      removeOnFail: 10,
    }
  );

  console.log('✅ Payment reminder job triggered manually');
}
