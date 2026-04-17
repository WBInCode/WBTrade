const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const stats = await p.$queryRawUnsafe(`
    SELECT 
      COUNT(*)::int as total,
      COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END)::int as has_address,
      COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END)::int as has_email,
      COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END)::int as has_phone,
      COUNT(CASE WHEN address IS NOT NULL AND address != '' AND email IS NOT NULL AND email != '' THEN 1 END)::int as complete
    FROM manufacturers
  `);
  console.log('Manufacturers:', stats[0]);
  
  const prodStats = await p.$queryRawUnsafe(`
    SELECT 
      COUNT(CASE WHEN m.address IS NOT NULL AND m.address != '' THEN 1 END)::int as with_data,
      COUNT(CASE WHEN m.address IS NULL OR m.address = '' THEN 1 END)::int as without_data
    FROM products p
    JOIN manufacturers m ON p.manufacturer_id = m.id
    WHERE p.status = 'ACTIVE'
  `);
  console.log('Products with mfr data:', prodStats[0]);
  
  await p.$disconnect();
})();
