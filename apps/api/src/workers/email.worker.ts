/**
 * Email Worker
 * Processes email sending jobs from the queue
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, queueConnection } from '../lib/queue';
import { sendEmail as sendEmailService } from '../lib/email';

interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

// Email templates
// NOTE: Order-related emails (confirmation, shipping, status updates) are handled by Baselinker
// This worker only handles account and system emails
const EMAIL_TEMPLATES: Record<string, (context: Record<string, any>) => { subject: string; html: string; text: string }> = {
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ff6b35;">Witaj ${ctx.name}!</h1>
        <p>Dziękujemy za rejestrację w WBTrade. Aby aktywować swoje konto, kliknij w poniższy link:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctx.verifyUrl}" style="background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Potwierdź adres email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Link jest ważny przez 24 godziny.</p>
        <p style="color: #666; font-size: 14px;">Jeśli to nie Ty rejestrowałeś konto, zignoruj tę wiadomość.</p>
      </div>
    `,
    text: `Witaj ${ctx.name}! Potwierdź email: ${ctx.verifyUrl}`,
  }),

  'welcome': (ctx) => ({
    subject: 'Witaj w WBTrade! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ff6b35;">Witaj ${ctx.name}! 🎉</h1>
        <p>Cieszymy się, że dołączyłeś do WBTrade!</p>
        <p>Twoje konto zostało pomyślnie utworzone. Możesz teraz:</p>
        <ul style="line-height: 1.8;">
          <li>Przeglądać tysiące produktów</li>
          <li>Dodawać produkty do ulubionych</li>
          <li>Śledzić swoje zamówienia</li>
          <li>Korzystać z ekskluzywnych promocji</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctx.shopUrl}" style="background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Rozpocznij zakupy
          </a>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Pozdrawiamy,<br>
          Zespół WBTrade
        </p>
      </div>
    `,
    text: `Witaj ${ctx.name}! Twoje konto w WBTrade zostało utworzone. Rozpocznij zakupy: ${ctx.shopUrl}`,
  }),

  'email-verification': (ctx) => ({
    subject: 'Potwierdź swój adres email - WBTrade',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">Witaj ${ctx.name}!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Dziękujemy za rejestrację w WBTrade. Aby dokończyć proces rejestracji, 
          potwierdź swój adres email klikając w poniższy przycisk:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctx.verificationUrl}" 
             style="background-color: #f97316; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold; 
                    display: inline-block;">
            Potwierdź Email
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Lub skopiuj poniższy link do przeglądarki:<br>
          <a href="${ctx.verificationUrl}" style="color: #f97316;">${ctx.verificationUrl}</a>
        </p>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Link jest ważny przez 24 godziny. Jeśli nie rejestrowałeś się w naszym sklepie, 
          zignoruj tę wiadomość.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Pozdrawiamy,<br>
          Zespół WBTrade
        </p>
      </div>
    `,
    text: `Witaj ${ctx.name}! Potwierdź swój email klikając w link: ${ctx.verificationUrl}. Link jest ważny 24h.`,
  }),

  'email-verified': (ctx) => ({
    subject: 'Email zweryfikowany! - WBTrade',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Email zweryfikowany!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Witaj ${ctx.name},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Twój adres email został pomyślnie zweryfikowany. Możesz teraz w pełni 
          korzystać ze wszystkich funkcji naszego sklepu!
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctx.shopUrl}" 
             style="background-color: #f97316; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold; 
                    display: inline-block;">
            Rozpocznij Zakupy
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Dziękujemy za dołączenie do WBTrade!
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Pozdrawiamy,<br>
          Zespół WBTrade
        </p>
      </div>
    `,
    text: `Witaj ${ctx.name}! Twój email został zweryfikowany. Rozpocznij zakupy: ${ctx.shopUrl}`,
  }),
  
  'newsletter': (ctx) => ({
    subject: ctx.subject || 'Newsletter WBTrade',
    html: ctx.content || '',
    text: ctx.textContent || '',
  }),

  'newsletter-confirmation': (ctx) => ({
    subject: 'Potwierdź subskrypcję newslettera - WBTrade',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">Witaj!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Dziękujemy za zainteresowanie naszym newsletterem. 
          Aby potwierdzić subskrypcję, kliknij w poniższy przycisk:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctx.verificationUrl}" 
             style="background-color: #f97316; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold; 
                    display: inline-block;">
            Potwierdź Subskrypcję
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Po potwierdzeniu będziesz otrzymywać:
        </p>
        <ul style="font-size: 14px; color: #666;">
          <li>Informacje o nowościach i promocjach</li>
          <li>Ekskluzywne rabaty dla subskrybentów</li>
          <li>Wcześniejszy dostęp do wyprzedaży</li>
        </ul>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Jeśli nie zapisywałeś się do newslettera, zignoruj tę wiadomość.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Pozdrawiamy,<br>
          Zespół WBTrade
        </p>
      </div>
    `,
    text: `Potwierdź subskrypcję newslettera: ${ctx.verificationUrl}`,
  }),

  'newsletter-welcome': (ctx) => ({
    subject: 'Witaj w newsletterze WBTrade! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Subskrypcja potwierdzona!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Dziękujemy za potwierdzenie! Od teraz będziesz otrzymywać nasz newsletter 
          z najlepszymi ofertami i nowościami.
        </p>
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0; color: #f59e0b;">🎁 Twój rabat -10%</h2>
          <p style="margin: 10px 0 0 0;">
            Użyj kodu: <strong style="font-size: 20px; color: #f97316;">NEWSLETTER10</strong>
            <br>przy pierwszych zakupach!
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctx.shopUrl}" 
             style="background-color: #f97316; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold; 
                    display: inline-block;">
            Rozpocznij Zakupy
          </a>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">
          Możesz zrezygnować z newslettera w dowolnym momencie klikając link w stopce każdego maila.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Pozdrawiamy,<br>
          Zespół WBTrade
        </p>
      </div>
    `,
    text: `Subskrypcja potwierdzona! Twój kod rabatowy: NEWSLETTER10. Rozpocznij zakupy: ${ctx.shopUrl}`,
  }),
  
  'contact-general': (ctx) => ({
    subject: `[Kontakt] ${ctx.subject}`,
    html: `
      <h1>Nowa wiadomość kontaktowa</h1>
      <p><strong>Od:</strong> ${ctx.name} (${ctx.email})</p>
      ${ctx.phone ? `<p><strong>Telefon:</strong> ${ctx.phone}</p>` : ''}
      <p><strong>Temat:</strong> ${ctx.subject}</p>
      <p><strong>Wiadomość:</strong></p>
      <p>${ctx.message.replace(/\n/g, '<br>')}</p>
      ${ctx.ticketId ? `<p><strong>ID zgłoszenia Responso:</strong> ${ctx.ticketId}</p>` : ''}
      <hr>
      <p style="color: #666; font-size: 12px;">
        Odpowiedz bezpośrednio na adres: ${ctx.email}
      </p>
    `,
    text: `Nowa wiadomość od: ${ctx.name} (${ctx.email})\nTemat: ${ctx.subject}\n\n${ctx.message}`,
  }),

  'contact-product': (ctx) => ({
    subject: `[Zapytanie] Produkt: ${ctx.productName}`,
    html: `
      <h1>Zapytanie o produkt</h1>
      <p><strong>Od:</strong> ${ctx.name} (${ctx.email})</p>
      ${ctx.phone ? `<p><strong>Telefon:</strong> ${ctx.phone}</p>` : ''}
      <p><strong>Produkt:</strong> ${ctx.productName}</p>
      <p><strong>ID produktu:</strong> ${ctx.productId}</p>
      <p><strong>Wiadomość:</strong></p>
      <p>${ctx.message.replace(/\n/g, '<br>')}</p>
      ${ctx.ticketId ? `<p><strong>ID zgłoszenia Responso:</strong> ${ctx.ticketId}</p>` : ''}
      <hr>
      <p style="color: #666; font-size: 12px;">
        Odpowiedz bezpośrednio na adres: ${ctx.email}
      </p>
    `,
    text: `Zapytanie o produkt: ${ctx.productName}\nOd: ${ctx.name} (${ctx.email})\n\n${ctx.message}`,
  }),

  'contact-order': (ctx) => ({
    subject: `[Pomoc] Zamówienie #${ctx.orderId}`,
    html: `
      <h1>Pomoc z zamówieniem</h1>
      <p><strong>Od:</strong> ${ctx.name} (${ctx.email})</p>
      ${ctx.phone ? `<p><strong>Telefon:</strong> ${ctx.phone}</p>` : ''}
      <p><strong>Zamówienie:</strong> #${ctx.orderId}</p>
      <p><strong>Typ problemu:</strong> ${ctx.issueType}</p>
      <p><strong>Wiadomość:</strong></p>
      <p>${ctx.message.replace(/\n/g, '<br>')}</p>
      ${ctx.ticketId ? `<p><strong>ID zgłoszenia Responso:</strong> ${ctx.ticketId}</p>` : ''}
      <hr>
      <p style="color: #666; font-size: 12px;">
        Odpowiedz bezpośrednio na adres: ${ctx.email}
      </p>
    `,
    text: `Pomoc z zamówieniem #${ctx.orderId}\nOd: ${ctx.name} (${ctx.email})\nProblem: ${ctx.issueType}\n\n${ctx.message}`,
  }),

  'contact-support': (ctx) => ({
    subject: `[Wsparcie] ${ctx.subject}`,
    html: `
      <h1>Zgłoszenie wsparcia technicznego</h1>
      <p><strong>Od:</strong> ${ctx.name} (${ctx.email})</p>
      ${ctx.phone ? `<p><strong>Telefon:</strong> ${ctx.phone}</p>` : ''}
      <p><strong>Temat:</strong> ${ctx.subject}</p>
      <p><strong>Wiadomość:</strong></p>
      <p>${ctx.message.replace(/\n/g, '<br>')}</p>
      ${ctx.browserInfo ? `<p><strong>Przeglądarka:</strong> ${ctx.browserInfo}</p>` : ''}
      ${ctx.pageUrl ? `<p><strong>Strona:</strong> ${ctx.pageUrl}</p>` : ''}
      ${ctx.ticketId ? `<p><strong>ID zgłoszenia Responso:</strong> ${ctx.ticketId}</p>` : ''}
      <hr>
      <p style="color: #666; font-size: 12px;">
        Odpowiedz bezpośrednio na adres: ${ctx.email}
      </p>
    `,
    text: `Wsparcie: ${ctx.subject}\nOd: ${ctx.name} (${ctx.email})\n\n${ctx.message}`,
  }),

  'contact-confirmation': (ctx) => ({
    subject: 'Potwierdzenie otrzymania wiadomości - WBTrade',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ff6b35;">Dziękujemy za kontakt!</h1>
        <p>Witaj ${ctx.name},</p>
        <p>Otrzymaliśmy Twoją wiadomość:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Temat:</strong> ${ctx.subject}</p>
          ${ctx.ticketId ? `<p><strong>Numer zgłoszenia:</strong> ${ctx.ticketId}</p>` : ''}
        </div>
        <p>Nasz zespół odpowie najszybciej jak to możliwe, zazwyczaj w ciągu 24 godzin roboczych.</p>
        <p>W nagłych przypadkach możesz skontaktować się z nami telefonicznie.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 14px;">
          Pozdrawiamy,<br>
          <strong>Zespół WBTrade</strong><br>
          kontakt@wbtrade.pl
        </p>
      </div>
    `,
    text: `Witaj ${ctx.name},\n\nDziękujemy za wiadomość: ${ctx.subject}\n${ctx.ticketId ? `Numer zgłoszenia: ${ctx.ticketId}\n` : ''}\nOdpowiemy wkrótce!\n\nZespół WBTrade`,
  }),
};

/**
 * Send email using configured provider (lib/email.ts)
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  console.log(`[EmailWorker] Sending email to ${to}`);
  console.log(`[EmailWorker] Subject: ${subject}`);
  
  await sendEmailService({
    to,
    subject,
    html,
    text,
  });
  
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
