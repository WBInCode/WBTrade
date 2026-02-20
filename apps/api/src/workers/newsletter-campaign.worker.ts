/**
 * Newsletter Campaign Service
 * 
 * Processes scheduled newsletter campaigns:
 * - Checks for campaigns due to be sent (SCHEDULED + scheduled_for <= now)
 * - Fetches verified, non-unsubscribed subscribers
 * - Sends campaign emails via Resend (using 'newsletter' template)
 * - Updates campaign status and recipient count
 * 
 * Works WITHOUT Redis/BullMQ — uses direct function calls and setInterval
 */

import { PrismaClient } from '@prisma/client';
import { sendEmailDirect } from './email.worker';

const prisma = new PrismaClient();

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wb-trade.pl';

/**
 * Safely convert HTML content to plain text.
 * Iteratively strips tags and decodes entities to avoid incomplete sanitization.
 */
function stripHtmlToText(html: string): string {
  // Iteratively remove HTML tags until none remain
  let text = html;
  let prev = '';
  while (text !== prev) {
    prev = text;
    text = text.replace(/<[^>]*>/g, '');
  }
  // Decode common HTML entities
  const entityMap: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  for (const [entity, char] of Object.entries(entityMap)) {
    text = text.split(entity).join(char);
  }
  return text.trim();
}

// Batch size for sending (to avoid overloading Resend API)
const BATCH_SIZE = 10;
// Delay between batches (ms) — Resend free tier: 100 emails/day, 1/sec
const BATCH_DELAY_MS = 1500;

/**
 * Generate unsubscribe link for a subscriber
 */
function getUnsubscribeLink(token: string): string {
  return `${SITE_URL}/newsletter/unsubscribe?token=${token}`;
}

/**
 * Wrap campaign HTML content with unsubscribe footer
 */
function wrapWithUnsubscribe(html: string, token: string): string {
  const unsubscribeUrl = getUnsubscribeLink(token);
  return `${html}
  <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 30px;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      Otrzymujesz tego maila, ponieważ zapisałeś/aś się do naszego newslettera.<br>
      <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">Wypisz się z newslettera</a>
    </p>
  </div>`;
}

/**
 * Send a single campaign to all verified subscribers
 */
export async function sendCampaign(campaignId: string): Promise<{ sent: number; failed: number; errors: string[] }> {
  const campaign = await prisma.newsletter_campaigns.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error(`Kampania ${campaignId} nie znaleziona`);
  }

  if (campaign.status === 'SENT') {
    console.log(`[NewsletterWorker] Campaign ${campaignId} already sent, skipping`);
    return { sent: 0, failed: 0, errors: [] };
  }

  if (campaign.status === 'SENDING') {
    console.log(`[NewsletterWorker] Campaign ${campaignId} already being sent, skipping`);
    return { sent: 0, failed: 0, errors: [] };
  }

  // Mark as SENDING
  await prisma.newsletter_campaigns.update({
    where: { id: campaignId },
    data: { status: 'SENDING', updated_at: new Date() },
  });

  console.log(`[NewsletterWorker] Starting campaign "${campaign.title}" (${campaignId})`);

  // Get all verified, non-unsubscribed subscribers
  const subscribers = await prisma.newsletter_subscriptions.findMany({
    where: {
      is_verified: true,
      unsubscribed_at: null,
    },
    select: {
      email: true,
      token: true,
    },
  });

  if (subscribers.length === 0) {
    console.warn(`[NewsletterWorker] No subscribers to send to for campaign ${campaignId}`);
    await prisma.newsletter_campaigns.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sent_at: new Date(),
        recipient_count: 0,
        updated_at: new Date(),
      },
    });
    return { sent: 0, failed: 0, errors: ['Brak subskrybentów'] };
  }

  console.log(`[NewsletterWorker] Sending to ${subscribers.length} subscribers`);

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // Send one by one with delay to respect Resend rate limit (2 req/sec)
  for (let i = 0; i < subscribers.length; i++) {
    const subscriber = subscribers[i];

    try {
      const htmlWithUnsubscribe = wrapWithUnsubscribe(campaign.content, subscriber.token);

      // Strip HTML tags for plain text version
      const textContent = stripHtmlToText(campaign.content);

      await sendEmailDirect({
        to: subscriber.email,
        subject: campaign.subject,
        template: 'newsletter',
        context: {
          subject: campaign.subject,
          content: htmlWithUnsubscribe,
          textContent,
        },
      });

      sentCount++;
      console.log(`[NewsletterWorker] ✓ Sent to ${subscriber.email} (${i + 1}/${subscribers.length})`);
    } catch (err: any) {
      failedCount++;
      errors.push(`${subscriber.email}: ${err?.message || 'Unknown error'}`);
      console.error(`[NewsletterWorker] ✗ Failed to send to ${subscriber.email}:`, err?.message);
    }

    // Wait 600ms between emails to stay under Resend's 2 req/sec limit
    if (i < subscribers.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  // Update campaign status
  const finalStatus = failedCount === subscribers.length ? 'FAILED' : 'SENT';
  await prisma.newsletter_campaigns.update({
    where: { id: campaignId },
    data: {
      status: finalStatus,
      sent_at: new Date(),
      recipient_count: sentCount,
      updated_at: new Date(),
    },
  });

  console.log(`[NewsletterWorker] Campaign "${campaign.title}" complete: ${sentCount} sent, ${failedCount} failed`);
  return { sent: sentCount, failed: failedCount, errors };
}

/**
 * Check for scheduled campaigns that are due and send them
 */
export async function processScheduledCampaigns(): Promise<{ processed: number; results: any[] }> {
  const now = new Date();

  const dueCampaigns = await prisma.newsletter_campaigns.findMany({
    where: {
      status: 'SCHEDULED',
      scheduled_for: { lte: now },
    },
  });

  if (dueCampaigns.length === 0) {
    return { processed: 0, results: [] };
  }

  console.log(`[NewsletterWorker] Found ${dueCampaigns.length} scheduled campaign(s) due for sending`);

  const results = [];
  for (const campaign of dueCampaigns) {
    try {
      const result = await sendCampaign(campaign.id);
      results.push({ campaignId: campaign.id, title: campaign.title, ...result });
    } catch (error: any) {
      console.error(`[NewsletterWorker] Failed to process campaign ${campaign.id}:`, error);
      // Mark as FAILED
      await prisma.newsletter_campaigns.update({
        where: { id: campaign.id },
        data: { status: 'FAILED', updated_at: new Date() },
      });
      results.push({ campaignId: campaign.id, title: campaign.title, error: error.message });
    }
  }

  return { processed: dueCampaigns.length, results };
}

/**
 * Start the newsletter campaign scheduler (uses setInterval — no Redis needed)
 * Checks every 60 seconds for due campaigns
 */
export function startNewsletterScheduler(): void {
  // Run once immediately on startup
  processScheduledCampaigns().catch((err) => {
    console.error('[NewsletterScheduler] Initial check failed:', err);
  });

  // Then check every 60 seconds
  setInterval(async () => {
    try {
      const result = await processScheduledCampaigns();
      if (result.processed > 0) {
        console.log(`[NewsletterScheduler] Processed ${result.processed} campaign(s):`, result.results);
      }
    } catch (err) {
      console.error('[NewsletterScheduler] Scheduled check failed:', err);
    }
  }, 60 * 1000);

  console.log('✅ Newsletter campaign scheduler active (checks every 60s, no Redis needed)');
}
