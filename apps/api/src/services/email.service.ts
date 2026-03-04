import { Resend } from 'resend';
import { discountService } from './discount.service';

// ============================================
// EMAIL SERVICE
// Wysyłka emaili przez Resend
// ============================================

// Structured logger (console only, no file)
function debugLog(msg: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EmailService] ${msg}`);
  }
}

// HTML entity escaping to prevent XSS in email templates
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    debugLog('sendWelcomeDiscountEmail called');
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
        console.error('[EmailService] Resend error:', error.message);
        return { success: false, error: error.message };
      }

      debugLog(`Welcome discount email sent, messageId: ${data?.id}`);
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
          Cześć <strong>${escapeHtml(firstName)}</strong>!
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
            <p style="font-size: 32px; font-weight: bold; color: #ea580c; margin: 0; letter-spacing: 4px; font-family: 'Courier New', monospace; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;">${escapeHtml(couponCode)}</p>
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
    debugLog('sendNewsletterWelcomeEmail called');
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
        debugLog('Newsletter discount generated');
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
        console.error('[EmailService] Newsletter welcome error:', error.message);
        return { success: false, error: error.message };
      }

      debugLog(`Newsletter welcome email sent, messageId: ${data?.id}`);
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
                <p style="margin: 0; font-size: 32px; font-weight: bold; color: #78350f; letter-spacing: 4px; font-family: 'Courier New', monospace; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;">${escapeHtml(discountCode)}</p>
              </div>
              <p style="margin: 5px 0 15px 0; font-size: 12px; color: #a16207;">👆 Kliknij kod aby zaznaczyć, potem Ctrl+C</p>
              <p style="margin: 0 0 5px 0; font-size: 18px; color: #92400e;"><strong>-10%</strong> na Twoje kolejne zakupy!</p>
              <p style="margin: 0 0 5px 0; font-size: 13px; color: #6b7280;">Ważny do: <span style="color: #dc2626; font-weight: bold;">${discountExpiry}</span> • Jednorazowego użytku</p>
              <p style="margin: 0; font-size: 11px; color: #b45309;">⚠️ Nie łączy się z rabatem za rejestrację (20%) ani kuponami promocyjnymi (30%)</p>
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
            ? 'Twój adres e-mail został potwierdzony! Na powitanie mamy dla Ciebie <strong>kod rabatowy -10%</strong> na kolejne zakupy. Użyj go podczas składania zamówienia! Uwaga: kod nie łączy się z rabatem za rejestrację (20%) oraz kuponami promocyjnymi (30%).'
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
-10% na kolejne zakupy!
Ważny do: ${discountExpiry} • Jednorazowego użytku
⚠️ Nie łączy się z rabatem za rejestrację (20%) ani kuponami promocyjnymi (30%)

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

  // ============================================
  // ORDER CONFIRMATION EMAIL
  // ============================================

  /**
   * Send order confirmation email after successful payment
   * Works for both logged-in users and guest checkout
   */
  async sendOrderConfirmationEmail(
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
    shippingAddress: {
      firstName: string;
      lastName: string;
      street: string;
      city: string;
      postalCode: string;
      phone?: string;
    },
    shippingMethod: string,
    paymentMethod: string,
    isPaid: boolean
  ): Promise<EmailResult> {
    try {
      const resend = getResend();
      
      const orderUrl = `${SITE_URL}/order/${orderId}/confirmation`;
      
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: `✅ Potwierdzenie zamówienia #${orderNumber}`,
        html: this.getOrderConfirmationHtml(
          customerName,
          orderNumber,
          orderId,
          total,
          items,
          shippingAddress,
          shippingMethod,
          paymentMethod,
          isPaid,
          orderUrl
        ),
        text: this.getOrderConfirmationText(
          customerName,
          orderNumber,
          total,
          items,
          shippingAddress,
          shippingMethod,
          paymentMethod,
          isPaid,
          orderUrl
        ),
      });

      if (error) {
        console.error('[EmailService] Order confirmation email error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Order confirmation email sent to ${to} for order ${orderNumber}`);
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error('[EmailService] Order confirmation exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * HTML template for order confirmation email
   */
  private getOrderConfirmationHtml(
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
    shippingAddress: {
      firstName: string;
      lastName: string;
      street: string;
      city: string;
      postalCode: string;
      phone?: string;
    },
    shippingMethod: string,
    paymentMethod: string,
    isPaid: boolean,
    orderUrl: string
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
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #666;">
          ${item.quantity} szt.
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #333;">
          ${item.total.toFixed(2)} zł
        </td>
      </tr>
    `).join('');

    // Map shipping method to display name
    const shippingMethodNames: Record<string, string> = {
      'inpost_courier': 'Kurier InPost',
      'inpost_locker': 'Paczkomat InPost',
      'dpd': 'Kurier DPD',
      'dhl': 'Kurier DHL',
      'orlen': 'Paczka Orlen',
      'pickup': 'Odbiór osobisty',
    };
    const shippingMethodDisplay = shippingMethodNames[shippingMethod] || shippingMethod;

    // Map payment method to display name
    const paymentMethodNames: Record<string, string> = {
      'cod': 'Płatność przy odbiorze',
      'blik': 'BLIK',
      'card': 'Karta płatnicza',
      'transfer': 'Przelew bankowy',
      'przelewy24': 'Przelewy24',
      'payu': 'PayU',
    };
    const paymentMethodDisplay = paymentMethodNames[paymentMethod] || paymentMethod;

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
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
        <img src="${SITE_URL}/images/WB-TRADE-logo.png" alt="WBTrade" style="height: 50px; width: auto; margin-bottom: 15px;" />
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Dziękujemy za zamówienie!</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
          Cześć <strong>${customerName}</strong>,
        </p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          Twoje zamówienie <strong>#${orderNumber}</strong> zostało przyjęte${isPaid ? ' i opłacone' : ''}.
        </p>
        
        <!-- Order Number Box -->
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
          <p style="font-size: 14px; color: #666; margin: 0 0 5px 0;">Numer zamówienia</p>
          <p style="font-size: 28px; font-weight: bold; color: #059669; margin: 0; letter-spacing: 2px;">#${orderNumber}</p>
        </div>
        
        <!-- Products Table -->
        <h3 style="color: #333; margin: 25px 0 15px 0; font-size: 16px;">📦 Zamówione produkty</h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 12px; text-align: left; font-size: 13px; color: #667;">Produkt</th>
              <th style="padding: 12px; text-align: center; font-size: 13px; color: #666;">Ilość</th>
              <th style="padding: 12px; text-align: right; font-size: 13px; color: #666;">Cena</th>
            </tr>
          </thead>
          <tbody>
            ${productsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8fafc;">
              <td colspan="2" style="padding: 15px; text-align: right; font-weight: bold; color: #333;">
                Razem do zapłaty:
              </td>
              <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #059669;">
                ${total.toFixed(2)} zł
              </td>
            </tr>
          </tfoot>
        </table>
        
        <!-- Shipping & Payment Info -->
        <div style="display: flex; gap: 20px; margin-top: 25px;">
          <div style="flex: 1; background-color: #f8fafc; border-radius: 8px; padding: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">📍 Adres dostawy</h4>
            <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.5;">
              ${shippingAddress.firstName} ${shippingAddress.lastName}<br>
              ${shippingAddress.street}<br>
              ${shippingAddress.postalCode} ${shippingAddress.city}
              ${shippingAddress.phone ? `<br>Tel: ${shippingAddress.phone}` : ''}
            </p>
          </div>
        </div>
        
        <div style="margin-top: 15px; background-color: #f8fafc; border-radius: 8px; padding: 15px;">
          <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;">
            <strong>🚚 Metoda dostawy:</strong> ${shippingMethodDisplay}
          </p>
          <p style="margin: 0; color: #333; font-size: 14px;">
            <strong>💳 Płatność:</strong> ${paymentMethodDisplay} ${isPaid ? '<span style="color: #10b981;">✓ Opłacone</span>' : '<span style="color: #f59e0b;">⏳ Oczekuje na płatność</span>'}
          </p>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="${orderUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);">
            📋 Szczegóły zamówienia
          </a>
        </div>
        
        <!-- Help section -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 14px; color: #666; margin: 0;">
            Masz pytania? Skontaktuj się z nami:
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
          Ten email został wysłany automatycznie.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Plain text version for order confirmation email
   */
  private getOrderConfirmationText(
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
    shippingAddress: {
      firstName: string;
      lastName: string;
      street: string;
      city: string;
      postalCode: string;
      phone?: string;
    },
    shippingMethod: string,
    paymentMethod: string,
    isPaid: boolean,
    orderUrl: string
  ): string {
    const itemsList = items.map(item => 
      `- ${item.name}${item.variant ? ` (${item.variant})` : ''} x ${item.quantity} = ${item.total.toFixed(2)} zł`
    ).join('\n');

    return `
Cześć ${customerName},

Dziękujemy za zamówienie #${orderNumber}!

Twoje zamówienie zostało przyjęte${isPaid ? ' i opłacone' : ''}.

ZAMÓWIONE PRODUKTY:
${itemsList}

RAZEM DO ZAPŁATY: ${total.toFixed(2)} zł

ADRES DOSTAWY:
${shippingAddress.firstName} ${shippingAddress.lastName}
${shippingAddress.street}
${shippingAddress.postalCode} ${shippingAddress.city}
${shippingAddress.phone ? `Tel: ${shippingAddress.phone}` : ''}

Metoda dostawy: ${shippingMethod}
Płatność: ${paymentMethod} ${isPaid ? '(Opłacone)' : '(Oczekuje na płatność)'}

Szczegóły zamówienia: ${orderUrl}

Masz pytania? Napisz do nas: kontakt@wb-trade.pl

Pozdrawiamy,
Zespół WB Trade
    `.trim();
  }

  // ============================================
  // CONTACT & COMPLAINT EMAILS
  // ============================================

  /**
   * Send complaint email to support
   */
  async sendComplaintEmail(data: {
    customerEmail: string;
    subject: string;
    description: string;
    orderNumber?: string;
    images?: string[];
  }): Promise<EmailResult> {
    try {
      const resend = getResend();
      const { customerEmail, subject, description, orderNumber, images = [] } = data;

      // Prepare attachments from base64 images
      const attachments: { filename: string; content: Buffer }[] = [];
      
      for (let i = 0; i < Math.min(images.length, 5); i++) {
        const img = images[i];
        if (img && img.startsWith('data:image')) {
          const matches = img.match(/^data:image\/(\w+);base64,(.+)$/);
          if (matches) {
            const ext = matches[1];
            const content = matches[2];
            attachments.push({
              filename: `zdjecie_${i + 1}.${ext}`,
              content: Buffer.from(content, 'base64'),
            });
          }
        }
      }

      const htmlContent = this.getComplaintEmailHtml({
        customerEmail,
        subject,
        description,
        orderNumber,
        hasImages: attachments.length > 0,
        imageCount: attachments.length,
      });

      const { data: responseData, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: ['support@wb-partners.pl'],
        replyTo: customerEmail,
        subject: `[Reklamacja] ${subject}`,
        html: htmlContent,
        text: this.getComplaintEmailText({ customerEmail, subject, description, orderNumber }),
        ...(attachments.length > 0 && { attachments }),
      });

      if (error) {
        console.error('[EmailService] Complaint email error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Complaint email sent, messageId: ${responseData?.id}`);
      return { success: true, messageId: responseData?.id };
    } catch (err: any) {
      console.error('[EmailService] Complaint email exception:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * HTML template for complaint email
   */
  private getComplaintEmailHtml(data: {
    customerEmail: string;
    subject: string;
    description: string;
    orderNumber?: string;
    hasImages: boolean;
    imageCount: number;
  }): string {
    const { customerEmail, subject, description, orderNumber, hasImages, imageCount } = data;
    const now = new Date().toLocaleString('pl-PL', { 
      dateStyle: 'long', 
      timeStyle: 'short' 
    });

    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Nowe zgłoszenie reklamacyjne</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Data zgłoszenia:</p>
              <p style="margin: 5px 0 0; color: #1e293b; font-size: 16px; font-weight: 600;">${now}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Email klienta:</p>
              <p style="margin: 5px 0 0;"><a href="mailto:${customerEmail}" style="color: #f97316; font-size: 16px; font-weight: 600; text-decoration: none;">${customerEmail}</a></p>
            </td>
          </tr>
          ${orderNumber ? `
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Numer zamówienia:</p>
              <p style="margin: 5px 0 0; color: #1e293b; font-size: 16px; font-weight: 600;">${orderNumber}</p>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Temat reklamacji:</p>
              <p style="margin: 5px 0 0; color: #1e293b; font-size: 18px; font-weight: 700;">${subject}</p>
            </td>
          </tr>
        </table>

        <!-- Description Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 10px;">
          <p style="margin: 0 0 10px; color: #64748b; font-size: 14px; font-weight: 600;">Opis problemu:</p>
          <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>

        ${hasImages ? `
        <!-- Images Notice -->
        <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin-top: 20px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            📎 Do zgłoszenia załączono <strong>${imageCount}</strong> ${imageCount === 1 ? 'zdjęcie' : imageCount < 5 ? 'zdjęcia' : 'zdjęć'}. 
            Sprawdź załączniki tego emaila.
          </p>
        </div>
        ` : ''}

        <!-- Action Button -->
        <div style="text-align: center; margin-top: 30px;">
          <a href="mailto:${customerEmail}?subject=Re: ${encodeURIComponent(subject)}" 
             style="display: inline-block; background-color: #f97316; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Odpowiedz klientowi
          </a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #1e293b; padding: 20px; text-align: center;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          WB Trade - Zgłoszenie reklamacyjne
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Plain text version for complaint email
   */
  private getComplaintEmailText(data: {
    customerEmail: string;
    subject: string;
    description: string;
    orderNumber?: string;
  }): string {
    const { customerEmail, subject, description, orderNumber } = data;
    const now = new Date().toLocaleString('pl-PL');

    return `
NOWE ZGŁOSZENIE REKLAMACYJNE
============================

Data: ${now}
Email klienta: ${customerEmail}
${orderNumber ? `Numer zamówienia: ${orderNumber}` : ''}

TEMAT: ${subject}

OPIS PROBLEMU:
${description}

---
Odpowiedz na ten email, aby skontaktować się z klientem.
    `.trim();
  }

  /**
   * Send general contact form email
   */
  async sendContactFormEmail(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<EmailResult> {
    try {
      const resend = getResend();
      const { name, email, subject, message } = data;

      const htmlContent = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📬 Nowa wiadomość ze strony</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p style="margin: 0 0 10px; color: #64748b;">Od:</p>
        <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px;"><strong>${name}</strong> (${email})</p>
        
        <p style="margin: 0 0 10px; color: #64748b;">Temat:</p>
        <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; font-weight: 600;">${subject}</p>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px;">
          <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">Treść wiadomości:</p>
          <p style="margin: 0; color: #334155; line-height: 1.6; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" 
             style="display: inline-block; background-color: #f97316; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
            Odpowiedz
          </a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const { data: responseData, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: ['kontakt@wb-trade.pl'],
        replyTo: email,
        subject: `[Kontakt] ${subject}`,
        html: htmlContent,
        text: `Od: ${name} (${email})\nTemat: ${subject}\n\n${message}`,
      });

      if (error) {
        console.error('[EmailService] Contact form error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: responseData?.id };
    } catch (err: any) {
      console.error('[EmailService] Contact form exception:', err);
      return { success: false, error: err.message };
    }
  }

  // ─── Support Messaging Notifications ───

  async sendSupportNewTicketToAdmin(ticket: {
    ticketNumber: string;
    subject: string;
    category: string;
    userName?: string;
    userEmail?: string;
    message: string;
  }): Promise<EmailResult> {
    try {
      const adminEmail = process.env.SUPPORT_EMAIL || 'support@wb-partners.pl';
      const resend = getResend();

      const categoryLabels: Record<string, string> = {
        ORDER: 'Zamówienie',
        DELIVERY: 'Dostawa',
        COMPLAINT: 'Reklamacja',
        PAYMENT: 'Płatność',
        ACCOUNT: 'Konto',
        GENERAL: 'Ogólne',
      };

      const { data, error } = await resend.emails.send({
        from: `WBTrade Support <${FROM_EMAIL}>`,
        to: adminEmail,
        subject: `[${ticket.ticketNumber}] Nowa wiadomość: ${ticket.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f97316; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0;">📩 Nowa wiadomość od klienta</h2>
            </div>
            <div style="padding: 20px; background: #1e293b; color: #e2e8f0; border-radius: 0 0 8px 8px;">
              <p><strong>Ticket:</strong> ${ticket.ticketNumber}</p>
              <p><strong>Od:</strong> ${ticket.userName || 'Nieznany'} (${ticket.userEmail || 'brak emaila'})</p>
              <p><strong>Kategoria:</strong> ${categoryLabels[ticket.category] || ticket.category}</p>
              <p><strong>Temat:</strong> ${escapeHtml(ticket.subject)}</p>
              <hr style="border-color: #475569;" />
              <p>${escapeHtml(ticket.message).replace(/\\n/g, '<br>')}</p>
              <hr style="border-color: #475569;" />
              <p style="text-align: center;">
                <a href="${SITE_URL.replace('wb-trade.pl', 'admin.wb-trade.pl')}/messages" 
                   style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Odpowiedz w panelu
                </a>
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('[EmailService] Support ticket notification error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Support ticket notification sent for ${ticket.ticketNumber}`);
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error('[EmailService] Support notification exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  async sendSupportReplyToCustomer(data: {
    to: string;
    ticketNumber: string;
    subject: string;
    customerName: string;
  }): Promise<EmailResult> {
    try {
      const resend = getResend();

      const { data: responseData, error } = await resend.emails.send({
        from: `WBTrade Support <${FROM_EMAIL}>`,
        to: data.to,
        subject: `[${data.ticketNumber}] Odpowiedź na Twoją wiadomość`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f97316; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0;">💬 Masz nową odpowiedź</h2>
            </div>
            <div style="padding: 20px; background: #1e293b; color: #e2e8f0; border-radius: 0 0 8px 8px;">
              <p>Cześć ${escapeHtml(data.customerName)}!</p>
              <p>Otrzymaliśmy odpowiedź na Twoją wiadomość <strong>${data.ticketNumber}</strong>.</p>
              <p><strong>Temat:</strong> ${escapeHtml(data.subject)}</p>
              <hr style="border-color: #475569;" />
              <p>Aby zobaczyć szczegóły odpowiedzi, zaloguj się do swojego konta.</p>
              <p style="text-align: center;">
                <a href="${SITE_URL}/account/messages" 
                   style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Zobacz wiadomości
                </a>
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('[EmailService] Support reply notification error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Support reply notification sent to ${data.to}`);
      return { success: true, messageId: responseData?.id };
    } catch (err: any) {
      console.error('[EmailService] Support reply exception:', err.message);
      return { success: false, error: err.message };
    }
  }
}

export const emailService = new EmailService();
