import { Resend } from 'resend';

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
          <p style="font-size: 32px; font-weight: bold; color: #ea580c; margin: 0 0 15px 0; letter-spacing: 3px; font-family: monospace;">
            ${couponCode}
          </p>
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
   * Send newsletter welcome email after verification
   */
  async sendNewsletterWelcomeEmail(
    to: string,
    unsubscribeToken: string
  ): Promise<EmailResult> {
    try {
      const resend = getResend();
      
      const unsubscribeUrl = `${SITE_URL}/newsletter/unsubscribe?token=${unsubscribeToken}`;

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: '🎉 Witaj w newsletterze WB Trade!',
        html: this.getNewsletterWelcomeHtml(unsubscribeUrl),
        text: this.getNewsletterWelcomeText(unsubscribeUrl),
      });

      if (error) {
        console.error('[EmailService] Newsletter welcome error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [EmailService] Newsletter welcome email sent to ${to}, messageId: ${data?.id}`);
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error('[EmailService] Newsletter welcome exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * HTML template for newsletter welcome email
   */
  private getNewsletterWelcomeHtml(unsubscribeUrl: string): string {
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
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Dziękujemy za zapis!</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
          Cześć!
        </p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          Twój adres e-mail został potwierdzony! Od teraz będziesz otrzymywać od nas:
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
            🛒 Przejdź do sklepu
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
   * Plain text version for newsletter welcome
   */
  private getNewsletterWelcomeText(unsubscribeUrl: string): string {
    return `
Cześć!

Dziękujemy za zapis do newslettera WB Trade!

Twój adres e-mail został potwierdzony. Od teraz będziesz otrzymywać od nas:
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
}

export const emailService = new EmailService();
