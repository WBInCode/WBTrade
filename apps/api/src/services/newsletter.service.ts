import crypto from 'crypto';
import { prisma } from '../db';
import { emailQueue } from '../lib/queue';

interface SubscribeData {
  email: string;
}

interface VerifyResult {
  success: boolean;
  message: string;
}

export class NewsletterService {
  /**
   * Subscribe to newsletter
   */
  async subscribe(data: SubscribeData): Promise<{ success: boolean; message: string }> {
    const email = data.email.toLowerCase();

    // Check if already subscribed
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.isVerified && !existing.unsubscribedAt) {
        return {
          success: false,
          message: 'Ten adres email jest już zapisany do newslettera',
        };
      }

      if (existing.unsubscribedAt) {
        // Re-subscribe
        const token = crypto.randomBytes(32).toString('hex');
        
        await prisma.newsletterSubscription.update({
          where: { email },
          data: {
            token,
            isVerified: false,
            subscribedAt: new Date(),
            verifiedAt: null,
            unsubscribedAt: null,
          },
        });

        await this.sendVerificationEmail(email, token);

        return {
          success: true,
          message: 'Sprawdź swoją skrzynkę email i potwierdź subskrypcję',
        };
      }

      // Resend verification
      await this.sendVerificationEmail(email, existing.token);
      
      return {
        success: true,
        message: 'Sprawdź swoją skrzynkę email i potwierdź subskrypcję',
      };
    }

    // New subscription
    const token = crypto.randomBytes(32).toString('hex');

    await prisma.newsletterSubscription.create({
      data: {
        email,
        token,
        isVerified: false,
      },
    });

    await this.sendVerificationEmail(email, token);

    return {
      success: true,
      message: 'Sprawdź swoją skrzynkę email i potwierdź subskrypcję',
    };
  }

  /**
   * Verify newsletter subscription
   */
  async verify(token: string): Promise<VerifyResult> {
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { token },
    });

    if (!subscription) {
      throw new Error('Nieprawidłowy token weryfikacyjny');
    }

    if (subscription.isVerified) {
      return {
        success: true,
        message: 'Email już został zweryfikowany',
      };
    }

    // Update subscription
    await prisma.newsletterSubscription.update({
      where: { token },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    // Send welcome email
    try {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
      await emailQueue.add('send-email', {
        to: subscription.email,
        template: 'newsletter-welcome',
        context: {
          shopUrl: frontendUrl,
        },
      });
    } catch (emailError) {
      console.error('[Newsletter] Failed to send welcome email:', emailError);
    }

    return {
      success: true,
      message: 'Subskrypcja newslettera została potwierdzona!',
    };
  }

  /**
   * Unsubscribe from newsletter
   */
  async unsubscribe(token: string): Promise<VerifyResult> {
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { token },
    });

    if (!subscription) {
      throw new Error('Nieprawidłowy token');
    }

    if (subscription.unsubscribedAt) {
      return {
        success: true,
        message: 'Email już został wypisany z newslettera',
      };
    }

    await prisma.newsletterSubscription.update({
      where: { token },
      data: {
        unsubscribedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Zostałeś pomyślnie wypisany z newslettera',
    };
  }

  /**
   * Get all verified subscribers
   */
  async getSubscribers(): Promise<{ email: string; subscribedAt: Date }[]> {
    const subscribers = await prisma.newsletterSubscription.findMany({
      where: {
        isVerified: true,
        unsubscribedAt: null,
      },
      select: {
        email: true,
        subscribedAt: true,
      },
      orderBy: {
        subscribedAt: 'desc',
      },
    });

    return subscribers;
  }

  /**
   * Get subscriber stats
   */
  async getStats(): Promise<{
    total: number;
    verified: number;
    unsubscribed: number;
  }> {
    const [total, verified, unsubscribed] = await Promise.all([
      prisma.newsletterSubscription.count(),
      prisma.newsletterSubscription.count({
        where: { isVerified: true, unsubscribedAt: null },
      }),
      prisma.newsletterSubscription.count({
        where: { unsubscribedAt: { not: null } },
      }),
    ]);

    return { total, verified, unsubscribed };
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const verificationUrl = `${frontendUrl}/newsletter/verify?token=${token}`;

    await emailQueue.add('send-email', {
      to: email,
      template: 'newsletter-confirmation',
      context: {
        verificationUrl,
      },
    });
  }

  /**
   * Send newsletter campaign
   */
  async sendCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
    const campaign = await prisma.newsletterCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Kampania nie istnieje');
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new Error('Kampania została już wysłana lub jest w trakcie wysyłania');
    }

    // Update status
    await prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    const subscribers = await this.getSubscribers();
    let sent = 0;
    let failed = 0;

    // Send to all subscribers
    for (const subscriber of subscribers) {
      try {
        const unsubscribeUrl = `${process.env.FRONTEND_URL}/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
        
        await emailQueue.add('send-email', {
          to: subscriber.email,
          template: 'newsletter',
          context: {
            subject: campaign.subject,
            content: campaign.content,
            unsubscribeUrl,
          },
        });
        sent++;
      } catch (error) {
        console.error(`[Newsletter] Failed to send to ${subscriber.email}:`, error);
        failed++;
      }
    }

    // Update campaign
    await prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        recipientCount: sent,
      },
    });

    return { sent, failed };
  }
}

export const newsletterService = new NewsletterService();
