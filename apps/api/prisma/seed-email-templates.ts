/**
 * Seed default email templates for delivery delay notifications.
 * Migrates the 3 hardcoded DELAY_PRESETS into the EmailTemplate table.
 *
 * Usage: npx ts-node prisma/seed-email-templates.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TEMPLATES = [
  {
    slug: 'delay-short-apology',
    name: 'Krótkie przeprosiny',
    description: 'Zwięzła, profesjonalna wiadomość z przeprosinami',
    subject: 'Informacja o zamówieniu #{orderNumber} — WBTrade',
    content: `Szanowny Kliencie,

Pragniemy poinformować, że realizacja Twojego zamówienia nr {orderNumber} może potrwać nieco dłużej niż planowano. Dokładamy wszelkich starań, aby przesyłka dotarła do Ciebie jak najszybciej.

Przepraszamy za niedogodności i dziękujemy za cierpliwość.

Z poważaniem,
Zespół WBTrade`,
    category: 'DELIVERY_DELAY',
    includesDiscount: false,
    sortOrder: 0,
  },
  {
    slug: 'delay-apology-with-discount',
    name: 'Przeprosiny z rabatem',
    description: 'Empatyczna wiadomość z unikalnym kodem rabatowym na następne zakupy',
    subject: 'Informacja o zamówieniu #{orderNumber} — WBTrade',
    content: `Szanowny Kliencie,

Z przykrością informujemy, że wysyłka Twojego zamówienia nr {orderNumber} została opóźniona z przyczyn logistycznych. Rozumiemy, jak ważna jest terminowa dostawa i szczerze przepraszamy za tę sytuację.

Jako wyraz naszych przeprosin, przygotowaliśmy dla Ciebie kod rabatowy {discountCode} na {discountPercent}% zniżki przy kolejnych zakupach w naszym sklepie. Kod jest ważny do {discountExpiry}.

Twoja przesyłka zostanie nadana w najbliższym możliwym terminie. O każdej zmianie statusu poinformujemy Cię mailowo.

Dziękujemy za wyrozumiałość i zaufanie.

Z poważaniem,
Zespół WBTrade`,
    category: 'DELIVERY_DELAY',
    includesDiscount: true,
    discountPercent: 10,
    discountValidDays: 30,
    sortOrder: 1,
  },
  {
    slug: 'delay-informational',
    name: 'Informacyjny — paczka w przygotowaniu',
    description: 'Neutralny ton informujący o statusie przesyłki',
    subject: 'Informacja o zamówieniu #{orderNumber} — WBTrade',
    content: `Szanowny Kliencie,

Chcielibyśmy poinformować Cię o aktualnym statusie Twojego zamówienia nr {orderNumber}. Przesyłka jest obecnie w trakcie przygotowania do wysyłki i zostanie nadana w najbliższych dniach roboczych.

Planowany termin dostawy może ulec niewielkiemu przesunięciu. Po nadaniu paczki otrzymasz wiadomość z numerem śledzenia przesyłki.

W razie pytań zachęcamy do kontaktu z naszym zespołem obsługi klienta.

Pozdrawiamy,
Zespół WBTrade`,
    category: 'DELIVERY_DELAY',
    includesDiscount: false,
    sortOrder: 2,
  },
];

async function main() {
  console.log('🔄 Seeding email templates...');

  for (const template of DEFAULT_TEMPLATES) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { slug: template.slug },
    });

    if (existing) {
      console.log(`  ⏭️  Template "${template.name}" already exists (slug: ${template.slug}), skipping.`);
      continue;
    }

    await prisma.emailTemplate.create({ data: template });
    console.log(`  ✅ Created template: "${template.name}" (slug: ${template.slug})`);
  }

  console.log('✅ Email templates seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
