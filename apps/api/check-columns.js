const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const cols = await p.$queryRaw`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='products' 
    AND column_name LIKE '%lowest%'
  `;
  console.log('Kolumny lowest w products:', cols);
  
  const cols2 = await p.$queryRaw`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='products' 
    AND column_name LIKE '%price%'
  `;
  console.log('Kolumny price w products:', cols2);
  
  await p.$disconnect();
})();
