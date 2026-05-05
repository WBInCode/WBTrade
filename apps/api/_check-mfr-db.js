const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Check manufacturers table
  const manufacturers = await p.$queryRawUnsafe(`
    SELECT * FROM manufacturers ORDER BY name LIMIT 20
  `);
  console.log('=== Manufacturers table (first 20) ===');
  console.table(manufacturers);

  // Count total
  const count = await p.$queryRawUnsafe(`SELECT COUNT(*)::int as total FROM manufacturers`);
  console.log('Total manufacturers:', count[0].total);

  // Check products with manufacturer_id
  const withMfr = await p.$queryRawUnsafe(`
    SELECT COUNT(*)::int as total FROM products WHERE manufacturer_id IS NOT NULL
  `);
  console.log('\nProducts with manufacturer_id:', withMfr[0].total);

  // Check manufacturer_id column type
  const colInfo = await p.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name IN ('manufacturer_id', 'manufacturer', 'gpsr_data')
  `);
  console.log('\nProduct columns related to manufacturer:');
  console.table(colInfo);

  // Check manufacturers table structure
  const mfrCols = await p.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'manufacturers'
    ORDER BY ordinal_position
  `);
  console.log('\nManufacturers table structure:');
  console.table(mfrCols);

  // Sample join - products with their manufacturers
  const sample = await p.$queryRawUnsafe(`
    SELECT p.name as product_name, m.name as manufacturer_name, p.baselinker_product_id
    FROM products p
    JOIN manufacturers m ON p.manufacturer_id = m.id
    LIMIT 10
  `);
  console.log('\nSample products with manufacturers:');
  console.table(sample);

  await p.$disconnect();
})();
