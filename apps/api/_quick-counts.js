const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();

async function run(){
  const r=await p.$queryRaw`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status='ACTIVE') as active,
      COUNT(*) FILTER (WHERE status='ACTIVE' AND sku LIKE 'HK-%') as hk_active,
      COUNT(*) FILTER (WHERE status='ACTIVE' AND sku LIKE 'LEKER-%') as leker_active,
      COUNT(*) FILTER (WHERE status='ACTIVE' AND sku LIKE 'BTP-%') as btp_active,
      COUNT(*) FILTER (WHERE status='ACTIVE' AND price<=0) as zero_price
    FROM products
  `;
  
  const r2=await p.$queryRaw`
    SELECT
      COUNT(DISTINCT p.id) as feed_eligible
    FROM products p
    INNER JOIN product_images pi ON pi.product_id=p.id
    WHERE p.status='ACTIVE'
      AND p.price>0
      AND NOT (p.tags && ARRAY['błąd zdjęcia','błąd zdjęcia '])
      AND p.tags && ARRAY['Paczkomaty i Kurier','paczkomaty i kurier','Tylko kurier','tylko kurier','do 2 kg','do 5 kg','do 10 kg','do 20 kg','do 31,5 kg']
      AND (
        NOT (p.tags && ARRAY['Paczkomaty i Kurier','paczkomaty i kurier'])
        OR p.tags && ARRAY['produkt w paczce: 1','produkt w paczce: 2','produkt w paczce: 3','produkt w paczce: 4','produkt w paczce: 5']
      )
  `;

  const r3=await p.$queryRaw`
    SELECT
      COUNT(DISTINCT p.id) as hk_feed
    FROM products p
    INNER JOIN product_images pi ON pi.product_id=p.id
    WHERE p.status='ACTIVE'
      AND p.price>0
      AND p.sku LIKE 'HK-%'
      AND NOT (p.tags && ARRAY['błąd zdjęcia','błąd zdjęcia '])
      AND p.tags && ARRAY['Paczkomaty i Kurier','paczkomaty i kurier','Tylko kurier','tylko kurier','do 2 kg','do 5 kg','do 10 kg','do 20 kg','do 31,5 kg']
      AND (
        NOT (p.tags && ARRAY['Paczkomaty i Kurier','paczkomaty i kurier'])
        OR p.tags && ARRAY['produkt w paczce: 1','produkt w paczce: 2','produkt w paczce: 3','produkt w paczce: 4','produkt w paczce: 5']
      )
  `;

  const s=r[0];
  console.log('============================================');
  console.log('       BAZA DANYCH vs FEED');
  console.log('============================================');
  console.log('BAZA:');
  console.log('  Wszystkie:  '+s.total);
  console.log('  Aktywne:    '+s.active);
  console.log('  - LEKER:    '+s.leker_active);
  console.log('  - BTP:      '+s.btp_active);
  console.log('  - HK:       '+s.hk_active);
  console.log('  Cena=0:     '+s.zero_price);
  console.log('');
  console.log('FEED (eligible):');
  console.log('  Lacznie:    '+r2[0].feed_eligible);
  console.log('  - HK:       '+r3[0].hk_feed);
  console.log('');
  console.log('NIE W FEEDZIE: ~'+(BigInt(s.active)-BigInt(r2[0].feed_eligible)));
  console.log('============================================');

  await p.$disconnect();
}
run().catch(e=>{console.error(e);process.exit(1);});
