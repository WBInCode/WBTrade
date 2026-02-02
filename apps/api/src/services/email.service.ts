import { Resend } from 'resend';
import { discountService } from './discount.service';

// ============================================
// EMAIL SERVICE
// Wysyłka emaili przez Resend
// ============================================

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@wb-trade.pl';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wb-trade.pl';

// Initialize Resend (lazily to avoid errors if API key missing)
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resendInstance = new Resend(RESEND_API_KEY);
  }
  return resendInstance;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  /**
   * Send welcome discount email after registration
   */
  async sendWelcomeDiscountEmail(
    to: string,
    firstName: string,
    couponCode: string,
    discountPercent: number,
    expiresAt: Date
  ): Promise<EmailResult> {
    try {
      const resend = getResend();
      
      const formattedExpiry = expiresAt.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `🎉 Twoja zniżka -${discountPercent}% czeka na Ciebie!`,
        html: this.getWelcomeDiscountHtml(firstName, couponCode, discountPercent, formattedExpiry),
        text: this.getWelcomeDiscountText(firstName, couponCode, discountPercent, formattedExpiry),
      });

      if (error) {
        console.error('[EmailService] Resend error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Welcome discount email sent to ${to}, messageId: ${data?.id}`);
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error('[EmailService] Exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * HTML template for welcome discount email
   */
  private getWelcomeDiscountHtml(
    firstName: string,
    couponCode: string,
    discountPercent: number,
    expiresAt: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Logo -->
    <tr>
      <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
        <img src="${SITE_URL}/images/WB-TRADE-logo.png" alt="WBTrade" style="height: 50px; width: auto; margin-bottom: 15px;" />
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Witaj w WB Trade!</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
          Cześć <strong>${firstName}</strong>!
        </p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          Dziękujemy za założenie konta w naszym sklepie! 
          Na początek mamy dla Ciebie specjalną niespodziankę:
        </p>
        
        <!-- Discount Box -->
        <div style="background: linear-gradient(135deg, #fef3e2 0%, #fff7ed 100%); border: 2px dashed #f97316; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
          <p style="font-size: 14px; color: #666; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
            Twój kod rabatowy
          </p>
          <div style="background-color: #ffffff; border: 2px solid #ea580c; border-radius: 8px; padding: 15px 25px; display: inline-block; margin: 10px 0; cursor: pointer;" title="Kliknij aby zaznaczyć">
            <p style="font-size: 32px; font-weight: bold; color: #ea580c; margin: 0; letter-spacing: 4px; font-family: 'Courier New', monospace; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;">${couponCode}</p>
          </div>
          <p style="font-size: 12px; color: #888; margin: 5px 0 15px 0;">👆 Kliknij kod aby zaznaczyć, potem Ctrl+C</p>
          <p style="font-size: 24px; font-weight: bold; color: #333; margin: 0;">
            -${discountPercent}% na pierwsze zakupy
          </p>
        </div>
        
        <!-- Expiry Warning -->
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px 20px; margin: 20px 0;">
          <p style="margin: 0; color: #dc2626; font-size: 14px;">
            ⏰ <strong>Uwaga!</strong> Kod jest ważny tylko do <strong>${expiresAt}</strong> (14 dni).
          </p>
        </div>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6; margin-top: 20px;">
          Aby skorzystać ze zniżki, dodaj produkty do koszyka i wpisz kod przy finalizacji zamówienia.
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="${SITE_URL}/products" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);">
            Rozpocznij zakupy →
          </a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
          Pozdrawiamy,<br>
          <strong>Zespół WB Trade</strong>
        </p>
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Ten email został wysłany automatycznie. Nie odpowiadaj na niego.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Plain text version for email clients that don't support HTML
   */
  private getWelcomeDiscountText(
    firstName: string,
    couponCode: string,
    discountPercent: number,
    expiresAt: string
  ): string {
    return `
Witaj ${firstName}!

Dziękujemy za założenie konta w WB Trade!

Na początek mamy dla Ciebie specjalną zniżkę:

Twój kod rabatowy: ${couponCode}
Zniżka: -${discountPercent}% na pierwsze zakupy

UWAGA: Kod jest ważny tylko do ${expiresAt} (14 dni).

Aby skorzystać ze zniżki, dodaj produkty do koszyka i wpisz kod przy finalizacji zamówienia.

Rozpocznij zakupy: ${SITE_URL}/products

Pozdrawiamy,
Zespół WB Trade
    `.trim();
  }

  /**
   * Send newsletter verification email
   */
  async sendNewsletterVerificationEmail(
    to: string,
    token: string
  ): Promise<EmailResult> {
    try {
      const resend = getResend();
      
      const verifyUrl = `${SITE_URL}/newsletter/verify?token=${token}`;

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: '📬 Potwierdź zapis do newslettera WB Trade',
        html: this.getNewsletterVerificationHtml(verifyUrl),
        text: this.getNewsletterVerificationText(verifyUrl),
      });

      if (error) {
        console.error('[EmailService] Newsletter verification error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Newsletter verification email sent to ${to}, messageId: ${data?.id}`);
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error('[EmailService] Newsletter verification exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * HTML template for newsletter verification email
   */
  private getNewsletterVerificationHtml(verifyUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Logo -->
    <tr>
      <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
        <img src="${SITE_URL}/images/WB-TRADE-logo.png" alt="WBTrade" style="height: 50px; width: auto; margin-bottom: 15px;" />
        <h1 style="color: white; margin: 0; font-size: 28px;">📬 Potwierdź zapis do newslettera</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
          Cześć!
        </p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          Dziękujemy za zainteresowanie naszym newsletterem! 
          Aby potwierdzić swój adres e-mail, kliknij poniższy przycisk:
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);">
            ✅ Potwierdź zapis
          </a>
        </div>
        
        <p style="font-size: 14px; color: #777; line-height: 1.6;">
          Jeśli nie zapisywałeś/aś się do naszego newslettera, zignoruj tę wiadomość.
        </p>
        
        <p style="font-size: 14px; color: #555; line-height: 1.6; margin-top: 30px;">
          <strong>Co zyskujesz jako subskrybent?</strong>
        </p>
        <ul style="font-size: 14px; color: #555; line-height: 1.8;">
          <li>🎁 Ekskluzywne kody rabatowe</li>
          <li>🆕 Informacje o nowościach przed innymi</li>
          <li>💰 Specjalne promocje tylko dla subskrybentów</li>
          <li>📦 Powiadomienia o wyprzedażach</li>
        </ul>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
          Pozdrawiamy,<br>
          <strong>Zespół WB Trade</strong>
        </p>
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Ten email został wysłany automatycznie. Nie odpowiadaj na niego.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Plain text version for newsletter verification
   */
  private getNewsletterVerificationText(verifyUrl: string): string {
    return `
Cześć!

Dziękujemy za zainteresowanie naszym newsletterem!

Aby potwierdzić swój adres e-mail, kliknij poniższy link:
${verifyUrl}

Jeśli nie zapisywałeś/aś się do naszego newslettera, zignoruj tę wiadomość.

Co zyskujesz jako subskrybent?
- Ekskluzywne kody rabatowe
- Informacje o nowościach przed innymi
- Specjalne promocje tylko dla subskrybentów
- Powiadomienia o wyprzedażach

Pozdrawiamy,
Zespół WB Trade
    `.trim();
  }

  /**
   * Send newsletter welcome email after verification with discount code
   */
  async sendNewsletterWelcomeEmail(
    to: string,
    unsubscribeToken: string
  ): Promise<EmailResult> {
    try {
      const resend = getResend();
      
      // Generate 10% discount code for newsletter subscriber
      let discountCode = '';
      let discountExpiry = '';
      try {
        const discount = await discountService.generateNewsletterDiscount(to);
        discountCode = discount.couponCode;
        discountExpiry = discount.expiresAt.toLocaleDateString('pl-PL', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      } catch (discountErr) {
        console.error('[EmailService] Failed to generate newsletter discount:', discountErr);
        // Continue without discount code
      }
      
      const unsubscribeUrl = `${SITE_URL}/newsletter/unsubscribe?token=${unsubscribeToken}`;

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: discountCode ? '🎁 Twój kod -10% czeka! Witaj w newsletterze WB Trade!' : '🎉 Witaj w newsletterze WB Trade!',
        html: this.getNewsletterWelcomeHtml(unsubscribeUrl, discountCode, discountExpiry),
        text: this.getNewsletterWelcomeText(unsubscribeUrl, discountCode, discountExpiry),
      });

      if (error) {
        console.error('[EmailService] Newsletter welcome error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Newsletter welcome email sent to ${to} with discount ${discountCode}, messageId: ${data?.id}`);
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error('[EmailService] Newsletter welcome exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * HTML template for newsletter welcome email with discount code
   */
  private getNewsletterWelcomeHtml(unsubscribeUrl: string, discountCode?: string, discountExpiry?: string): string {
    const discountSection = discountCode ? `
        <!-- Discount Code Section -->
        <tr>
          <td style="padding: 0 30px 30px 30px;">
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px dashed #f59e0b; border-radius: 12px; padding: 25px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">Twój ekskluzywny kod rabatowy</p>
              <div style="background-color: #ffffff; border: 2px solid #d97706; border-radius: 8px; padding: 12px 20px; display: inline-block; margin: 10px 0; cursor: pointer;" title="Kliknij aby zaznaczyć">
                <p style="margin: 0; font-size: 32px; font-weight: bold; color: #78350f; letter-spacing: 4px; font-family: 'Courier New', monospace; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;">${discountCode}</p>
              </div>
              <p style="margin: 5px 0 15px 0; font-size: 12px; color: #a16207;">👆 Kliknij kod aby zaznaczyć, potem Ctrl+C</p>
              <p style="margin: 0 0 5px 0; font-size: 18px; color: #92400e;"><strong>-10%</strong> na Twoje pierwsze zamówienie!</p>
              <p style="margin: 0; font-size: 13px; color: #a16207;">Ważny do: ${discountExpiry} • Jednorazowego użytku</p>
            </div>
          </td>
        </tr>` : '';

    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Logo -->
    <tr>
      <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
        <img src="${SITE_URL}/images/WB-TRADE-logo.png" alt="WBTrade" style="height: 50px; width: auto; margin-bottom: 15px;" />
        <h1 style="color: white; margin: 0; font-size: 28px;">${discountCode ? '🎁 Mamy prezent dla Ciebie!' : '🎉 Dziękujemy za zapis!'}</h1>
      </td>
    </tr>
    
    ${discountSection}
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
          Cześć!
        </p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          ${discountCode 
            ? 'Twój adres e-mail został potwierdzony! Na powitanie mamy dla Ciebie <strong>kod rabatowy -10%</strong> na pierwsze zamówienie. Użyj go podczas składania zamówienia!'
            : 'Twój adres e-mail został potwierdzony!'} Od teraz będziesz otrzymywać od nas:
        </p>
        
        <ul style="font-size: 16px; color: #555; line-height: 2;">
          <li>🎁 <strong>Ekskluzywne kody rabatowe</strong></li>
          <li>🆕 <strong>Informacje o nowościach</strong> przed innymi</li>
          <li>💰 <strong>Specjalne promocje</strong> tylko dla subskrybentów</li>
          <li>📦 <strong>Powiadomienia o wyprzedażach</strong></li>
        </ul>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="${SITE_URL}/products" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);">
            🛒 ${discountCode ? 'Wykorzystaj kod teraz!' : 'Przejdź do sklepu'}
          </a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
          Pozdrawiamy,<br>
          <strong>Zespół WB Trade</strong>
        </p>
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          <a href="${unsubscribeUrl}" style="color: #94a3b8;">Wypisz się z newslettera</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Plain text version for newsletter welcome with discount
   */
  private getNewsletterWelcomeText(unsubscribeUrl: string, discountCode?: string, discountExpiry?: string): string {
    const discountText = discountCode ? `
🎁 TWÓJ KOD RABATOWY: ${discountCode}
-10% na pierwsze zamówienie!
Ważny do: ${discountExpiry} • Jednorazowego użytku

` : '';

    return `
Cześć!

Dziękujemy za zapis do newslettera WB Trade!

${discountText}Twój adres e-mail został potwierdzony. Od teraz będziesz otrzymywać od nas:
- Ekskluzywne kody rabatowe
- Informacje o nowościach przed innymi
- Specjalne promocje tylko dla subskrybentów
- Powiadomienia o wyprzedażach

Przejdź do sklepu: ${SITE_URL}/products

Pozdrawiamy,
Zespół WB Trade

---
Wypisz się z newslettera: ${unsubscribeUrl}
    `.trim();
  }

  /**
   * Send payment reminder email with ordered products
   */
  async sendPaymentReminderEmail(
    to: string,
    customerName: string,
    orderNumber: string,
    orderId: string,
    total: number,
    items: {
      name: string;
      variant: string;
      quantity: number;
      price: number;
      total: number;
      imageUrl: string | null;
    }[],
    reminderNumber: number,
    daysRemaining: number
  ): Promise<EmailResult> {
    try {
      const resend = getResend();
      
      const paymentUrl = `${SITE_URL}/order/${orderId}/payment`;
      
      // Determine urgency based on days remaining
      let urgencyEmoji = '⏰';
      let urgencyText = 'Przypomnienie o płatności';
      let urgencyColor = '#f97316'; // orange
      
      if (daysRemaining <= 2) {
        urgencyEmoji = '🚨';
        urgencyText = 'Pilne! Ostatnie dni na płatność';
        urgencyColor = '#dc2626'; // red
      } else if (daysRemaining <= 4) {
        urgencyEmoji = '⚠️';
        urgencyText = 'Przypomnienie o płatności';
        urgencyColor = '#f59e0b'; // amber
      }

      const subject = `${urgencyEmoji} ${urgencyText} - Zamówienie #${orderNumber}`;

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: this.getPaymentReminderHtml(
          customerName,
          orderNumber,
          orderId,
          total,
          items,
          reminderNumber,
          daysRemaining,
          paymentUrl,
          urgencyColor
        ),
        text: this.getPaymentReminderText(
          customerName,
          orderNumber,
          total,
          items,
          daysRemaining,
          paymentUrl
        ),
      });

      if (error) {
        console.error('[EmailService] Payment reminder error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Payment reminder #${reminderNumber} sent to ${to} for order ${orderNumber}`);
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error('[EmailService] Payment reminder exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * HTML template for payment reminder email
   */
  private getPaymentReminderHtml(
    customerName: string,
    orderNumber: string,
    orderId: string,
    total: number,
    items: {
      name: string;
      variant: string;
      quantity: number;
      price: number;
      total: number;
      imageUrl: string | null;
    }[],
    reminderNumber: number,
    daysRemaining: number,
    paymentUrl: string,
    urgencyColor: string
  ): string {
    // Generate product list HTML
    const productsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center;">
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 12px;" />` : ''}
            <div>
              <p style="margin: 0; font-weight: 600; color: #333;">${item.name}</p>
              ${item.variant ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #666;">${item.variant}</p>` : ''}
            </div>
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #555;">
          ${item.quantity} szt.
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #333;">
          ${item.total.toFixed(2)} zł
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Logo -->
    <tr>
      <td style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); padding: 40px 30px; text-align: center;">
        <img src="${SITE_URL}/images/WB-TRADE-logo.png" alt="WBTrade" style="height: 50px; width: auto; margin-bottom: 15px;" />
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Przypomnienie o płatności</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
          Cześć <strong>${customerName}</strong>!
        </p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          Zauważyliśmy, że Twoje zamówienie <strong>#${orderNumber}</strong> nie zostało jeszcze opłacone.
          Twoje produkty czekają na Ciebie!
        </p>
        
        <!-- Urgency Warning -->
        <div style="background-color: ${daysRemaining <= 2 ? '#fef2f2' : '#fef3e2'}; border-left: 4px solid ${urgencyColor}; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: ${daysRemaining <= 2 ? '#dc2626' : '#92400e'}; font-size: 15px;">
            ${daysRemaining <= 1 
              ? '🚨 <strong>Ostatni dzień!</strong> Twoje zamówienie zostanie anulowane jutro.'
              : daysRemaining <= 2
                ? `⚠️ <strong>Zostały tylko ${daysRemaining} dni!</strong> Opłać zamówienie, aby nie zostało anulowane.`
                : `⏰ Masz jeszcze <strong>${daysRemaining} dni</strong> na opłacenie zamówienia.`
            }
          </p>
        </div>

        <!-- Order Summary Box -->
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">📦 Twoje zamówienie #${orderNumber}</h3>
          
          <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
            <thead>
              <tr style="background-color: #e2e8f0;">
                <th style="padding: 10px 12px; text-align: left; color: #475569;">Produkt</th>
                <th style="padding: 10px 12px; text-align: center; color: #475569;">Ilość</th>
                <th style="padding: 10px 12px; text-align: right; color: #475569;">Cena</th>
              </tr>
            </thead>
            <tbody>
              ${productsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 15px 12px; text-align: right; font-weight: bold; color: #333; font-size: 16px;">
                  Do zapłaty:
                </td>
                <td style="padding: 15px 12px; text-align: right; font-weight: bold; color: ${urgencyColor}; font-size: 20px;">
                  ${total.toFixed(2)} zł
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px ${urgencyColor}50;">
            💳 Opłać teraz
          </a>
        </div>
        
        <p style="font-size: 14px; color: #777; line-height: 1.6; text-align: center;">
          Kliknij przycisk powyżej, aby przejść do bezpiecznej płatności.
        </p>
        
        <!-- Help section -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 14px; color: #666; margin: 0;">
            <strong>Masz pytania?</strong> Skontaktuj się z nami: 
            <a href="mailto:kontakt@wb-trade.pl" style="color: ${urgencyColor};">kontakt@wb-trade.pl</a>
          </p>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
          Pozdrawiamy,<br>
          <strong>Zespół WB Trade</strong>
        </p>
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Ten email został wysłany automatycznie. Nie odpowiadaj na niego.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Plain text version for payment reminder
   */
  private getPaymentReminderText(
    customerName: string,
    orderNumber: string,
    total: number,
    items: {
      name: string;
      variant: string;
      quantity: number;
      price: number;
      total: number;
      imageUrl: string | null;
    }[],
    daysRemaining: number,
    paymentUrl: string
  ): string {
    const productsList = items.map(item => 
      `- ${item.name}${item.variant ? ` (${item.variant})` : ''} x${item.quantity} - ${item.total.toFixed(2)} zł`
    ).join('\n');

    return `
Cześć ${customerName}!

Przypomnienie o płatności - Zamówienie #${orderNumber}

Zauważyliśmy, że Twoje zamówienie nie zostało jeszcze opłacone.

${daysRemaining <= 2 
  ? `⚠️ UWAGA: Zostały tylko ${daysRemaining} dni na opłacenie! Zamówienie zostanie automatycznie anulowane.`
  : `Masz jeszcze ${daysRemaining} dni na opłacenie zamówienia.`
}

Twoje produkty:
${productsList}

Do zapłaty: ${total.toFixed(2)} zł

Opłać zamówienie: ${paymentUrl}

Masz pytania? Napisz do nas: kontakt@wb-trade.pl

Pozdrawiamy,
Zespół WB Trade
    `.trim();
  }

  /**
   * Send order cancelled due to non-payment email
   */
  async sendOrderCancelledDueToNonPaymentEmail(
    to: string,
    customerName: string,
    orderNumber: string,
    total: number
  ): Promise<EmailResult> {
    try {
      const resend = getResend();

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `❌ Zamówienie #${orderNumber} zostało anulowane`,
        html: this.getOrderCancelledHtml(customerName, orderNumber, total),
        text: this.getOrderCancelledText(customerName, orderNumber, total),
      });

      if (error) {
        console.error('[EmailService] Order cancelled email error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Order cancelled email sent to ${to} for order ${orderNumber}`);
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error('[EmailService] Order cancelled exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * HTML template for order cancelled email
   */
  private getOrderCancelledHtml(
    customerName: string,
    orderNumber: string,
    total: number
  ): string {
    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Logo -->
    <tr>
      <td style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 40px 30px; text-align: center;">
        <img src="${SITE_URL}/images/WB-TRADE-logo.png" alt="WBTrade" style="height: 50px; width: auto; margin-bottom: 15px;" />
        <h1 style="color: white; margin: 0; font-size: 24px;">❌ Zamówienie anulowane</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
          Cześć <strong>${customerName}</strong>,
        </p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          Z przykrością informujemy, że Twoje zamówienie <strong>#${orderNumber}</strong> o wartości 
          <strong>${total.toFixed(2)} zł</strong> zostało automatycznie anulowane z powodu braku płatności.
        </p>
        
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">
            Zamówienie oczekiwało na płatność przez 7 dni.
          </p>
        </div>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          Jeśli nadal jesteś zainteresowany/a naszymi produktami, zapraszamy do złożenia nowego zamówienia.
          Wszystkie produkty są nadal dostępne w naszym sklepie!
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="${SITE_URL}/products" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);">
            🛒 Przejdź do sklepu
          </a>
        </div>
        
        <!-- Help section -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 14px; color: #666; margin: 0;">
            Jeśli masz pytania lub wystąpił problem z płatnością, skontaktuj się z nami:
            <a href="mailto:kontakt@wb-trade.pl" style="color: #f97316;">kontakt@wb-trade.pl</a>
          </p>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
          Pozdrawiamy,<br>
          <strong>Zespół WB Trade</strong>
        </p>
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Ten email został wysłany automatycznie. Nie odpowiadaj na niego.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Plain text version for order cancelled email
   */
  private getOrderCancelledText(
    customerName: string,
    orderNumber: string,
    total: number
  ): string {
    return `
Cześć ${customerName},

Zamówienie #${orderNumber} zostało anulowane

Z przykrością informujemy, że Twoje zamówienie o wartości ${total.toFixed(2)} zł zostało automatycznie anulowane z powodu braku płatności.

Zamówienie oczekiwało na płatność przez 7 dni.

Jeśli nadal jesteś zainteresowany/a naszymi produktami, zapraszamy do złożenia nowego zamówienia: ${SITE_URL}/products

Masz pytania? Napisz do nas: kontakt@wb-trade.pl

Pozdrawiamy,
Zespół WB Trade
    `.trim();
  }
}

export const emailService = new EmailService();
