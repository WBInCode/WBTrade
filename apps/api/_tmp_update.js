const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const r1 = await prisma.manufacturer.updateMany({
    where: { name: { equals: 'Brunbeste', mode: 'insensitive' } },
    data: {
      email: 'info@brunbeste.pl',
      phone: '22 720 10 46',
      website: 'https://brunbeste.eu',
    }
  });
  console.log('Brunbeste updated:', r1.count);

  const r2 = await prisma.manufacturer.updateMany({
    where: { name: { equals: 'Klausberg', mode: 'insensitive' } },
    data: {
      address: 'Aleja Krakowska 28a, 05-090 Janki, Polska',
      email: 'info@klausberg.eu',
      phone: '+48 22 720 12 34',
      website: 'https://klausberg.com.pl',
    }
  });
  console.log('Klausberg updated:', r2.count);

  for (const name of ['Brunbeste', 'Klausberg']) {
    const m = await prisma.manufacturer.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { name: true, address: true, email: true, phone: true, website: true } });
    console.log(JSON.stringify(m));
  }
  await prisma.$disconnect();
}
main();
