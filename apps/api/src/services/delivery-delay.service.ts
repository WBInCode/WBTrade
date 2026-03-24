/**
 * Delivery Delay Detection & Notification Service
 *
 * Detects orders at risk of delivery delay and manages
 * admin alerts + customer notifications (email + in-app).
 */

import { prisma } from '../db';
import { emailService } from './email.service';
import * as supportService from './support.service';

// ────────────────────────────────────────────────────────
// Message Presets
// ────────────────────────────────────────────────────────

export interface DelayPreset {
  id: string;
  name: string;
  description: string;
  content: string; // Contains {orderNumber} placeholder
}

const DELAY_PRESETS: DelayPreset[] = [
  {
    id: 'preset_1',
    name: 'Krótkie przeprosiny',
    description: 'Zwięzła, profesjonalna wiadomość z przeprosinami',
    content: `Szanowny Kliencie,

Pragniemy poinformować, że realizacja Twojego zamówienia nr {orderNumber} może potrwać nieco dłużej niż planowano. Dokładamy wszelkich starań, aby przesyłka dotarła do Ciebie jak najszybciej.

Przepraszamy za niedogodności i dziękujemy za cierpliwość.

Z poważaniem,
Zespół WBTrade`,
  },
  {
    id: 'preset_2',
    name: 'Rozbudowane przeprosiny z rabatem',
    description: 'Empatyczna wiadomość z kodem rabatowym na następne zakupy',
    content: `Szanowny Kliencie,

Z przykrością informujemy, że wysyłka Twojego zamówienia nr {orderNumber} została opóźniona z przyczyn logistycznych. Rozumiemy, jak ważna jest terminowa dostawa i szczerze przepraszamy za tę sytuację.

Jako wyraz naszych przeprosin, przygotowaliśmy dla Ciebie kod rabatowy PRZEPRASZAMY10 na 10% zniżki przy kolejnych zakupach w naszym sklepie.

Twoja przesyłka zostanie nadana w najbliższym możliwym terminie. O każdej zmianie statusu poinformujemy Cię mailowo.

Dziękujemy za wyrozumiałość i zaufanie.

Z poważaniem,
Zespół WBTrade`,
  },
  {
    id: 'preset_3',
    name: 'Informacyjny — paczka w przygotowaniu',
    description: 'Neutralny ton informujący o statusie przesyłki',
    content: `Szanowny Kliencie,

Chcielibyśmy poinformować Cię o aktualnym statusie Twojego zamówienia nr {orderNumber}. Przesyłka jest obecnie w trakcie przygotowania do wysyłki i zostanie nadana w najbliższych dniach roboczych.

Planowany termin dostawy może ulec niewielkiemu przesunięciu. Po nadaniu paczki otrzymasz wiadomość z numerem śledzenia przesyłki.

W razie pytań zachęcamy do kontaktu z naszym zespołem obsługi klienta.

Pozdrawiamy,
Zespół WBTrade`,
  },
];

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
   * Return available message presets
   */
  getPresets(): DelayPreset[] {
    return DELAY_PRESETS;
  }

  /**
   * Send delay notification to customer:
   * - Always sends email
   * - Creates UserNotification if order belongs to a registered user
   * - Updates DeliveryDelayAlert status
   */
  async sendDelayNotification(
    alertId: string,
    messageType: string,
    customMessage?: string,
    adminId?: string
  ): Promise<{ success: boolean; error?: string }> {
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

    // Determine message content
    let messageContent: string;
    if (messageType === 'custom' && customMessage) {
      messageContent = customMessage;
    } else {
      const preset = DELAY_PRESETS.find((p) => p.id === messageType);
      if (!preset) {
        return { success: false, error: `Invalid preset: ${messageType}` };
      }
      messageContent = preset.content;
    }

    // Replace placeholders
    messageContent = messageContent.replace(/\{orderNumber\}/g, order.orderNumber);

    // Determine recipient email
    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      return { success: false, error: 'No recipient email found' };
    }

    const customerName = order.user
      ? `${order.user.firstName} ${order.user.lastName}`
      : `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim() || 'Kliencie';

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

    console.log(`[DeliveryDelayService] Notification sent for order ${order.orderNumber} (alert: ${alertId})`);
    return { success: true };
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
