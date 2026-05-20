import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all products where product.price != variant.price (mismatch)
  const mismatched = await prisma.product.findMany({
    where: {
      price: { gt: 0 },
      variants: { some: {} },
    },
    include: {
      variants: { select: { id: true, name: true, price: true } },
    },
  });

  let count = 0;
  const toFix: { variantId: string; productPrice: number }[] = [];

  for (const p of mismatched) {
    for (const v of p.variants) {
      const pp = Number(p.price);
      const vp = Number(v.price);
      if (Math.abs(pp - vp) > 0.01 && p.variants.length === 1) {
        count++;
        toFix.push({ variantId: v.id, productPrice: pp });
        if (count <= 10) {
          console.log(`MISMATCH: ${p.sku} | product: ${pp} | variant: ${vp} | diff: ${(vp - pp).toFixed(2)}`);
        }
      }
    }
  }

  console.log(`\nTotal single-variant products with price mismatch: ${count}`);

  if (count > 0 && process.argv.includes('--fix')) {
    console.log(`\nFixing ${count} variants...`);
    let fixed = 0;
    for (const item of toFix) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { price: item.productPrice },
      });
      fixed++;
    }
    console.log(`Fixed ${fixed} variants.`);
  } else if (count > 0) {
    console.log('Run with --fix to update variant prices to match product prices.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
