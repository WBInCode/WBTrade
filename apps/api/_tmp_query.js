const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const names = ['Kinghoff', 'Klausberg', 'Brunbeste', 'RETOO', 'Berlinger Haus'];
  for (const name of names) {
    const m = await prisma.manufacturer.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { name: true, address: true, email: true, phone: true, website: true } });
    if (m) console.log(JSON.stringify(m));
    else console.log('NOT FOUND: ' + name);
  }
  await prisma.$disconnect();
}
main();
