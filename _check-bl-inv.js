// Quick script to check Baselinker inventories only
const TOKEN = '6010965-6007581-8JLR71SHB190BOWX9LVHNMA34E71LI0QIRZ902SG33XD0ES0LMM357JD4GCUS1KT';

async function callBL(method, params = {}) {
  const body = new URLSearchParams();
  body.append('method', method);
  body.append('parameters', JSON.stringify(params));
  const res = await fetch('https://api.baselinker.com/connector.php', {
    method: 'POST',
    headers: { 'X-BLToken': TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return res.json();
}

async function main() {
  // 1. Get all inventories
  console.log('=== BASELINKER INVENTORIES ===');
  const inv = await callBL('getInventories');
  if (inv.inventories) {
    for (const i of inv.inventories) {
      console.log(`  ID: ${i.inventory_id} | Name: "${i.name}" | Desc: "${i.description || '-'}"`);
    }
  } else {
    console.log('ERROR:', JSON.stringify(inv));
  }
}

main().catch(console.error);
