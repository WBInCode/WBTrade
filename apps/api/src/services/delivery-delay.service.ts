/**
 * Delivery Delay Detection & Notification Service
 *
 * Detects orders at risk of delivery delay and manages
 * admin alerts + customer notifications (email + in-app).
 *
 * Message templates are stored in the EmailTemplate DB table (category: DELIVERY_DELAY).
 * Templates with includesDiscount=true auto-generate unique coupon codes.
 */

import { prisma } from '../db';
import { emailService } from './email.service';
import { discountService } from './discount.service';
import * as supportService from './support.service';

// ────────────────────────────────────────────────────────
// Legacy preset interface (for backward-compatible API response)
// ────────────────────────────────────────────────────────

export interface DelayPreset {
  id: string;
  name: string;
  description: string;
  content: string;
  includesDiscount?: boolean;
  discountPercent?: number | null;
  discountValidDays?: number | null;
}

// ────────────────────────────────────────────────────────
// Default settings
// ────────────────────────────────────────────────────────

const DEFAULT_ALERT_HOURS = 24;

// ────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────

export class DeliveryDelayService {
  /**
   * Get configurable alert threshold from Settings (hours before estimatedDeliveryDate)
   */
  async getAlertThresholdHours(): Promise<number> {
    try {
      const setting = await prisma.settings.findUnique({
        where: { key: 'delivery_delay_alert_hours' },
      });
      if (setting) {
        const hours = parseInt(setting.value, 10);
        if (!isNaN(hours) && hours > 0) return hours;
      }
    } catch (e) {
      console.error('[DeliveryDelayService] Error reading alert threshold:', e);
    }
    return DEFAULT_ALERT_HOURS;
  }

  /**
   * Detect orders at risk of delivery delay and create DeliveryDelayAlert records.
   * Called by cron job (e.g. twice daily at 08:00 and 14:00).
   */
  async detectDelays(): Promise<{ detected: number; skipped: number }> {
    const thresholdHours = await this.getAlertThresholdHours();
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + thresholdHours * 60 * 60 * 1000);

    console.log(`[DeliveryDelayService] Detecting delays (threshold: ${thresholdHours}h, checking orders with estimated delivery <= ${thresholdDate.toISOString()})`);

    // Find orders where:
    // - estimatedDeliveryDate is within the threshold window (now to now + threshold)
    // - OR estimatedDeliveryDate is already past
    // - status is NOT delivered/cancelled/refunded
    // - SHIPPED is INCLUDED — the package may have been sent late (e.g. waited for supplier)
    //   and admin may still want to notify the customer about the delay
    // - no delay notification has been sent yet
    const atRiskOrders = await prisma.order.findMany({
      where: {
        estimatedDeliveryDate: {
          lte: thresholdDate,
          not: null,
        },
        deliveryDelayNotifiedAt: null,
        status: {
          notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'],
        },
        deletedAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
        estimatedDeliveryDate: true,
        status: true,
        deliveryDelayAlerts: {
          where: { status: 'pending' },
          select: { id: true },
        },
      },
    });

    let detected = 0;
    let skipped = 0;

    for (const order of atRiskOrders) {
      // Skip if there's already a pending alert for this order
      if (order.deliveryDelayAlerts.length > 0) {
        skipped++;
        continue;
      }

      await prisma.deliveryDelayAlert.create({
        data: {
          orderId: order.id,
          status: 'pending',
        },
      });
      detected++;
    }

    console.log(`[DeliveryDelayService] Detection complete: ${detected} new alerts, ${skipped} skipped (already have pending alert)`);
    return { detected, skipped };
  }

  /**
   * Return available message templates from the database.
   * Maps to the legacy DelayPreset interface for backward compatibility.
   */
  async getPresets(): Promise<DelayPreset[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: { category: 'DELIVERY_DELAY', isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      content: t.content,
      includesDiscount: t.includesDiscount,
      discountPercent: t.discountPercent,
      discountValidDays: t.discountValidDays,
    }));
  }

  /**
   * Send delay notification to customer:
   * - Resolves template from DB (by templateId) or uses custom message
   * - If template has includesDiscount, generates a unique coupon code
   * - Always sends email
   * - Creates UserNotification if order belongs to a registered user
   * - Updates DeliveryDelayAlert status
   */
  async sendDelayNotification(
    alertId: string,
    messageType: string,
    customMessage?: string,
    adminId?: string
  ): Promise<{ success: boolean; error?: string; couponCode?: string }> {
    const alert = await prisma.deliveryDelayAlert.findUnique({
      where: { id: alertId },
      include: {
        order: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    if (alert.status === 'notified') {
      return { success: false, error: 'Alert already notified' };
    }

    const order = alert.order;

    // Determine message content and coupon generation
    let messageContent: string;
    let generatedCouponCode: string | undefined;
    let template: { includesDiscount: boolean; discountPercent: number | null; discountValidDays: number | null } | null = null;

    if (messageType === 'custom' && customMessage) {
      messageContent = customMessage;
    } else {
      // messageType is a template ID (cuid) — load from DB
      const dbTemplate = await prisma.emailTemplate.findUnique({
        where: { id: messageType },
      });
      if (!dbTemplate) {
        return { success: false, error: `Nie znaleziono szablonu: ${messageType}` };
      }
      messageContent = dbTemplate.content;
      template = dbTemplate;
    }

    // Determine recipient email
    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      return { success: false, error: 'No recipient email found' };
    }

    const customerName = order.user
      ? `${order.user.firstName} ${order.user.lastName}`
      : `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim() || 'Kliencie';

    // Generate unique coupon if template includes discount
    if (template?.includesDiscount && template.discountPercent && template.discountValidDays) {
      try {
        const couponResult = await discountService.generateDelayApologyCoupon({
          userId: order.userId,
          guestEmail: order.guestEmail,
          discountPercent: template.discountPercent,
          validDays: template.discountValidDays,
          orderNumber: order.orderNumber,
        });
        generatedCouponCode = couponResult.couponCode;
        const expiryFormatted = couponResult.expiresAt.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Replace discount placeholders
        messageContent = messageContent
          .replace(/\{discountCode\}/g, couponResult.couponCode)
          .replace(/\{discountPercent\}/g, String(template.discountPercent))
          .replace(/\{discountExpiry\}/g, expiryFormatted);
      } catch (couponErr) {
        console.error('[DeliveryDelayService] Failed to generate coupon:', couponErr);
        return { success: false, error: `Błąd generowania kuponu: ${couponErr instanceof Error ? couponErr.message : String(couponErr)}` };
      }
    }

    // Replace common placeholders
    messageContent = messageContent
      .replace(/\{orderNumber\}/g, order.orderNumber)
      .replace(/\{customerName\}/g, customerName);

    // Create support ticket so customer can reply to the delay notification email
    let replyToAddress: string | undefined;
    try {
      const ticket = await supportService.createTicket({
        userId: order.userId || undefined,
        guestEmail: !order.userId ? recipientEmail : undefined,
        guestName: !order.userId ? customerName : undefined,
        orderId: order.id,
        subject: `Opóźnienie dostawy — zamówienie #${order.orderNumber}`,
        category: 'DELIVERY',
        priority: 'NORMAL',
        message: messageContent,
        senderRole: 'ADMIN',
      });
      // Reply-To: skrzynka support@wb-partners.pl (monitorowana)
      // Ticket # jest w temacie maila — admin może łatwo powiązać odpowiedź z ticketem
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@wb-partners.pl';
      replyToAddress = supportEmail;
      console.log(`[DeliveryDelayService] Support ticket ${ticket.ticketNumber} created for order ${order.orderNumber}, reply-to: ${supportEmail}`);
    } catch (ticketErr) {
      console.error('[DeliveryDelayService] Failed to create support ticket:', ticketErr);
      // Continue without reply-to — email still goes out
    }

    // Send email
    try {
      const emailResult = await emailService.sendDeliveryDelayEmail({
        to: recipientEmail,
        customerName,
        orderNumber: order.orderNumber,
        messageContent,
        replyTo: replyToAddress,
      });

      if (!emailResult.success) {
        console.error('[DeliveryDelayService] Email send failed:', emailResult.error);
        return { success: false, error: `Email failed: ${emailResult.error}` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[DeliveryDelayService] Email exception:', message);
      return { success: false, error: `Email exception: ${message}` };
    }

    // Create in-app notification if user is registered
    if (order.userId) {
      await prisma.userNotification.create({
        data: {
          userId: order.userId,
          type: 'delivery_delay',
          title: 'Opóźnienie dostawy',
          message: `Dostawa zamówienia #${order.orderNumber} może być opóźniona. Sprawdź szczegóły w swoim panelu.`,
          link: `/account/orders/${order.id}`,
          metadata: { orderId: order.id, orderNumber: order.orderNumber },
        },
      });
    }

    // Update alert and order
    await prisma.$transaction([
      prisma.deliveryDelayAlert.update({
        where: { id: alertId },
        data: {
          status: 'notified',
          notifiedAt: new Date(),
          messageType,
          customMessage: messageType === 'custom' ? customMessage : null,
          sentBy: adminId || null,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { deliveryDelayNotifiedAt: new Date() },
      }),
    ]);

    console.log(`[DeliveryDelayService] Notification sent for order ${order.orderNumber} (alert: ${alertId})${generatedCouponCode ? `, coupon: ${generatedCouponCode}` : ''}`);
    return { success: true, couponCode: generatedCouponCode };
  }

  /**
   * Dismiss an alert without sending notification
   */
  async dismissAlert(alertId: string, adminId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.deliveryDelayAlert.update({
        where: { id: alertId },
        data: {
          status: 'dismissed',
          sentBy: adminId || null,
        },
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Get pending alerts count (for admin notification badge)
   */
  async getPendingCount(): Promise<number> {
    return prisma.deliveryDelayAlert.count({
      where: { status: 'pending' },
    });
  }
}

export const deliveryDelayService = new DeliveryDelayService();
