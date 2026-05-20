import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  // Check Fiat 500 variant price
  const prod = await p.product.findFirst({
    where: { slug: '10271-lego-creator-expert-fiat-500' },
    include: { variants: true },
  });
  if (prod) {
    console.log(`Fiat 500: product.price=${prod.price}, variant.price=${prod.variants[0]?.price}`);
  }

  // Check recent price history
  const history = await p.priceHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log('\nRecent price changes:');
  for (const h of history) {
    console.log(`  ${h.createdAt} | old=${h.oldPrice} new=${h.newPrice} | productId=${h.productId?.slice(0,8)}`);
  }
}

main().finally(() => p.$disconnect());
