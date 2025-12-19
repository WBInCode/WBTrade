/**
 * Email Worker
 * Processes email sending jobs from the queue
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, queueConnection } from '../lib/queue';

interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

// Email templates
const EMAIL_TEMPLATES: Record<string, (context: Record<string, any>) => { subject: string; html: string; text: string }> = {
  'order-confirmation': (ctx) => ({
    subject: `Potwierdzenie zamówienia #${ctx.orderId}`,
    html: `
      <h1>Dziękujemy za zamówienie!</h1>
      <p>Twoje zamówienie #${ctx.orderId} zostało przyjęte.</p>
      <p>Wartość zamówienia: ${ctx.total} PLN</p>
      <p>Status: ${ctx.status}</p>
    `,
    text: `Dziękujemy za zamówienie! Zamówienie #${ctx.orderId}, wartość: ${ctx.total} PLN`,
  }),
  
  'order-shipped': (ctx) => ({
    subject: `Twoje zamówienie #${ctx.orderId} zostało wysłane`,
    html: `
      <h1>Twoja paczka jest w drodze!</h1>
      <p>Zamówienie #${ctx.orderId} zostało wysłane.</p>
      <p>Numer przesyłki: ${ctx.trackingNumber}</p>
      <p>Przewoźnik: ${ctx.carrier}</p>
      <a href="${ctx.trackingUrl}">Śledź przesyłkę</a>
    `,
    text: `Zamówienie #${ctx.orderId} wysłane. Numer przesyłki: ${ctx.trackingNumber}`,
  }),
  
  'password-reset': (ctx) => ({
    subject: 'Reset hasła - WBTrade',
    html: `
      <h1>Reset hasła</h1>
      <p>Kliknij w poniższy link, aby zresetować hasło:</p>
      <a href="${ctx.resetUrl}">${ctx.resetUrl}</a>
      <p>Link jest ważny przez 1 godzinę.</p>
    `,
    text: `Reset hasła. Link: ${ctx.resetUrl}. Ważny 1 godzinę.`,
  }),
  
  'email-verification': (ctx) => ({
    subject: 'Potwierdź swój email - WBTrade',
    html: `
      <h1>Witaj ${ctx.name}!</h1>
      <p>Kliknij w poniższy link, aby potwierdzić swój adres email:</p>
      <a href="${ctx.verifyUrl}">${ctx.verifyUrl}</a>
    `,
    text: `Potwierdź email: ${ctx.verifyUrl}`,
  }),
  
  'low-stock-alert': (ctx) => ({
    subject: `Niski stan magazynowy - ${ctx.productName}`,
    html: `
      <h1>Uwaga: Niski stan magazynowy</h1>
      <p>Produkt: ${ctx.productName}</p>
      <p>SKU: ${ctx.sku}</p>
      <p>Aktualny stan: ${ctx.currentStock}</p>
      <p>Minimum: ${ctx.minimumStock}</p>
    `,
    text: `Niski stan: ${ctx.productName} (${ctx.currentStock}/${ctx.minimumStock})`,
  }),
  
  'newsletter': (ctx) => ({
    subject: ctx.subject || 'Newsletter WBTrade',
    html: ctx.content || '',
    text: ctx.textContent || '',
  }),
};

/**
 * Send email using configured provider
 * In production, replace with actual email service (Nodemailer, Resend, SendGrid, etc.)
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  // TODO: Replace with actual email sending implementation
  // Example with Nodemailer:
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({ from, to, subject, html, text });
  
  console.log(`[EmailWorker] Sending email to ${to}`);
  console.log(`[EmailWorker] Subject: ${subject}`);
  console.log(`[EmailWorker] Text preview: ${text.substring(0, 100)}...`);
  
  // Simulate sending delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  console.log(`[EmailWorker] Email sent successfully to ${to}`);
}

/**
 * Create and start the email worker
 */
export function startEmailWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.EMAIL,
    async (job: Job<EmailJobData>) => {
      console.log(`[EmailWorker] Processing job: ${job.name} (${job.id})`);
      
      const { to, template, context } = job.data;
      
      // Get template function
      const templateFn = EMAIL_TEMPLATES[template];
      
      if (!templateFn) {
        throw new Error(`Unknown email template: ${template}`);
      }
      
      // Generate email content
      const { subject, html, text } = templateFn(context);
      
      // Send email
      await sendEmail(to, subject, html, text);
      
      return { sent: true, to, template };
    },
    {
      connection: queueConnection,
      concurrency: 10, // Process up to 10 emails concurrently
    }
  );

  worker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[EmailWorker] Worker error:', err);
  });

  console.log('✓ Email worker started');
  return worker;
}
