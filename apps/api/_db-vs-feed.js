const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();

async function run(){
  const total=await p.product.count();
  const active=await p.product.count({where:{status:'ACTIVE'}});
  const hk=await p.product.count({where:{status:'ACTIVE',sku:{startsWith:'HK-'}}});
  const leker=await p.product.count({where:{status:'ACTIVE',sku:{startsWith:'LEKER-'}}});
  const btp=await p.product.count({where:{status:'ACTIVE',sku:{startsWith:'BTP-'}}});

  const HIDDEN=['błąd zdjęcia','błąd zdjęcia '];
  const DELIV=['Paczkomaty i Kurier','paczkomaty i kurier','Tylko kurier','tylko kurier','do 2 kg','do 5 kg','do 10 kg','do 20 kg','do 31,5 kg'];
  const PACZK=['Paczkomaty i Kurier','paczkomaty i kurier'];
  const PACK=['produkt w paczce: 1','produkt w paczce: 2','produkt w paczce: 3','produkt w paczce: 4','produkt w paczce: 5'];

  const feedWhere={
    status:'ACTIVE',price:{gt:0},
    NOT:{tags:{hasSome:HIDDEN}},
    tags:{hasSome:DELIV},
    images:{some:{}},
    OR:[{NOT:{tags:{hasSome:PACZK}}},{tags:{hasSome:PACK}}]
  };

  const feed=await p.product.count({where:feedWhere});
  const hkFeed=await p.product.count({where:{...feedWhere,sku:{startsWith:'HK-'}}});
  const lekerFeed=await p.product.count({where:{...feedWhere,sku:{startsWith:'LEKER-'}}});
  const btpFeed=await p.product.count({where:{...feedWhere,sku:{startsWith:'BTP-'}}});

  const noImg=await p.product.count({where:{status:'ACTIVE',images:{none:{}}}});
  const noDeliv=await p.product.count({where:{status:'ACTIVE',NOT:{tags:{hasSome:DELIV}}}});
  const hidden=await p.product.count({where:{status:'ACTIVE',tags:{hasSome:HIDDEN}}});
  const zero=await p.product.count({where:{status:'ACTIVE',price:{lte:0}}});

  console.log('============================================');
  console.log('       BAZA DANYCH vs FEED');
  console.log('============================================');
  console.log('BAZA (aktywne):');
  console.log('  Wszystkie:  '+total);
  console.log('  Aktywne:    '+active);
  console.log('  - LEKER:    '+leker);
  console.log('  - BTP:      '+btp);
  console.log('  - HK:       '+hk);
  console.log('');
  console.log('W FEEDZIE (eligible):');
  console.log('  Lacznie:    '+feed);
  console.log('  - LEKER:    '+lekerFeed);
  console.log('  - BTP:      '+btpFeed);
  console.log('  - HK:       '+hkFeed);
  console.log('');
  console.log('WYKLUCZONE Z FEEDA:');
  console.log('  Brak zdjec:       '+noImg);
  console.log('  Brak tagu dost.:  '+noDeliv);
  console.log('  Blad zdjecia:     '+hidden);
  console.log('  Cena=0:           '+zero);
  console.log('  RAZEM:           ~'+(active-feed));
  console.log('============================================');

  await p.$disconnect();
}
run().catch(e=>{console.error(e);process.exit(1);});
