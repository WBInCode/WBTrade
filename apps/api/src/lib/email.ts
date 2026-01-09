/**
 * Email Service
 * Handles email sending using Nodemailer
 * Supports both SMTP and Resend API
 */

import nodemailer, { Transporter } from 'nodemailer';

// Email configuration from environment
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
  },
  from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'WBTrade <noreply@wbtrade.pl>',
};

// Resend configuration (alternative)
const resendApiKey = process.env.RESEND_API_KEY || '';

let transporter: Transporter | null = null;

/**
 * Initialize email transporter
 */
function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  // Check if using Resend API
  if (resendApiKey) {
    // Resend uses SMTP with their own server
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: resendApiKey,
      },
    });
    console.log('✓ Email transporter initialized (Resend)');
    return transporter;
  }

  // Use standard SMTP
  console.log('[Email Debug] SMTP_USER:', process.env.SMTP_USER);
  console.log('[Email Debug] SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET');
  console.log('[Email Debug] emailConfig.auth.user:', emailConfig.auth.user);
  console.log('[Email Debug] emailConfig.auth.pass:', emailConfig.auth.pass ? '***SET***' : 'NOT SET');
  
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
    });
    console.log('✓ Email transporter initialized (SMTP)');
    return transporter;
  }

  // Development mode - log only
  console.warn('⚠ Email transporter not configured - emails will be logged only');
  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
  });
  
  return transporter;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Send an email
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transport = getTransporter();

  const mailOptions = {
    from: options.from || emailConfig.from,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ''),
    replyTo: options.replyTo,
    attachments: options.attachments,
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`[Email] Sent to ${options.to}: ${info.messageId || 'OK'}`);
    
    // Log email content in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n==================== EMAIL PREVIEW ====================');
      console.log(`To: ${mailOptions.to}`);
      console.log(`From: ${mailOptions.from}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('-------------------------------------------------------');
      console.log(mailOptions.text || 'No text content');
      console.log('=======================================================\n');
    }
    
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send to ${options.to}:`, error);
    
    // Still log content even if sending failed
    if (process.env.NODE_ENV === 'development') {
      console.log('\n==================== EMAIL (NOT SENT) =================');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('-------------------------------------------------------');
      console.log(mailOptions.text || 'No text content');
      console.log('=======================================================\n');
    }
    
    throw error;
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  to: string,
  order: {
    orderNumber: string;
    total: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    shippingMethod: string;
    paymentMethod: string;
  }
): Promise<boolean> {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(2)} zł</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0;">WBTrade</h1>
      </div>
      
      <h2>Dziękujemy za zamówienie! 🎉</h2>
      
      <p>Twoje zamówienie <strong>#${order.orderNumber}</strong> zostało przyjęte do realizacji.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Podsumowanie zamówienia</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="padding: 10px; text-align: left;">Produkt</th>
              <th style="padding: 10px; text-align: center;">Ilość</th>
              <th style="padding: 10px; text-align: right;">Cena</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold;">Razem:</td>
              <td style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 18px; color: #2563eb;">${order.total.toFixed(2)} zł</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <p><strong>Metoda dostawy:</strong> ${order.shippingMethod}</p>
      <p><strong>Metoda płatności:</strong> ${order.paymentMethod}</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/account/orders" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Zobacz swoje zamówienie
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #666; font-size: 14px;">
        Masz pytania? Odpowiedz na ten email lub skontaktuj się z nami.
      </p>
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} WBTrade. Wszystkie prawa zastrzeżone.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Potwierdzenie zamówienia #${order.orderNumber}`,
    html,
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(
  to: string,
  order: {
    orderNumber: string;
    total: number;
    transactionId?: string;
  }
): Promise<boolean> {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0;">WBTrade</h1>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">
          ✓
        </div>
      </div>
      
      <h2 style="text-align: center;">Płatność potwierdzona! 💳</h2>
      
      <p style="text-align: center;">
        Otrzymaliśmy płatność za zamówienie <strong>#${order.orderNumber}</strong>.
      </p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #666;">Kwota</p>
        <p style="font-size: 28px; font-weight: bold; color: #2563eb; margin: 10px 0;">${order.total.toFixed(2)} zł</p>
        ${order.transactionId ? `<p style="margin: 0; color: #999; font-size: 12px;">ID transakcji: ${order.transactionId}</p>` : ''}
      </div>
      
      <p style="text-align: center;">
        Twoje zamówienie jest teraz przetwarzane. Poinformujemy Cię, gdy zostanie wysłane.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/account/orders" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Śledź zamówienie
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} WBTrade. Wszystkie prawa zastrzeżone.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Płatność potwierdzona - Zamówienie #${order.orderNumber}`,
    html,
  });
}

/**
 * Send order shipped email
 */
export async function sendOrderShippedEmail(
  to: string,
  order: {
    orderNumber: string;
    trackingNumber: string;
    carrier: string;
    trackingUrl?: string;
  }
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0;">WBTrade</h1>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="font-size: 60px;">📦</div>
      </div>
      
      <h2 style="text-align: center;">Twoja paczka jest w drodze! 🚚</h2>
      
      <p style="text-align: center;">
        Zamówienie <strong>#${order.orderNumber}</strong> zostało wysłane.
      </p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Przewoźnik:</strong> ${order.carrier}</p>
        <p style="margin: 5px 0;"><strong>Numer przesyłki:</strong> ${order.trackingNumber}</p>
      </div>
      
      ${
        order.trackingUrl
          ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${order.trackingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Śledź przesyłkę
          </a>
        </div>
      `
          : ''
      }
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} WBTrade. Wszystkie prawa zastrzeżone.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Twoje zamówienie #${order.orderNumber} zostało wysłane!`,
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<boolean> {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0;">WBTrade</h1>
      </div>
      
      <h2>Reset hasła 🔐</h2>
      
      <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.</p>
      
      <p>Kliknij poniższy przycisk, aby ustawić nowe hasło:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Resetuj hasło
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Link jest ważny przez <strong>1 godzinę</strong>.
      </p>
      
      <p style="color: #666; font-size: 14px;">
        Jeśli nie prosiłeś o reset hasła, zignoruj ten email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px;">
        Jeśli przycisk nie działa, skopiuj i wklej ten link w przeglądarce:<br>
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} WBTrade. Wszystkie prawa zastrzeżone.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Reset hasła - WBTrade',
    html,
  });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  to: string,
  verificationToken: string,
  name?: string
): Promise<boolean> {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0;">WBTrade</h1>
      </div>
      
      <h2>Witaj${name ? ` ${name}` : ''}! 👋</h2>
      
      <p>Dziękujemy za rejestrację w WBTrade.</p>
      
      <p>Kliknij poniższy przycisk, aby potwierdzić swój adres email:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Potwierdź email
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Link jest ważny przez <strong>24 godziny</strong>.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px;">
        Jeśli przycisk nie działa, skopiuj i wklej ten link w przeglądarce:<br>
        <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
      </p>
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} WBTrade. Wszystkie prawa zastrzeżone.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Potwierdź swój email - WBTrade',
    html,
  });
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<{
  configured: boolean;
  provider: 'smtp' | 'resend' | 'none';
  canSend: boolean;
  error?: string;
}> {
  if (resendApiKey) {
    try {
      const transport = getTransporter();
      await transport.verify();
      return { configured: true, provider: 'resend', canSend: true };
    } catch (error) {
      return {
        configured: true,
        provider: 'resend',
        canSend: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  if (emailConfig.auth.user && emailConfig.auth.pass) {
    try {
      const transport = getTransporter();
      await transport.verify();
      return { configured: true, provider: 'smtp', canSend: true };
    } catch (error) {
      return {
        configured: true,
        provider: 'smtp',
        canSend: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return { configured: false, provider: 'none', canSend: false };
}
