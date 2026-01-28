/**
 * Raport ilościowy produktów - eksport do PDF
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function generateReport() {
  console.log('📊 Generowanie raportu...\n');

  // Pobierz wszystkie produkty z wariantami i stanami
  const allProducts = await prisma.product.findMany({
    select: { 
      id: true,
      status: true,
      baselinkerProductId: true,
      categoryId: true,
      price: true,
      variants: {
        select: {
          inventory: {
            select: { quantity: true }
          }
        }
      }
    }
  });

  // Oblicz stan dla każdego produktu
  const productsWithStock = allProducts.map(p => {
    const stock = p.variants.reduce((sum, v) => {
      return sum + v.inventory.reduce((s, inv) => s + inv.quantity, 0);
    }, 0);
    return { ...p, stock };
  });

  const total = productsWithStock.length;
  const active = productsWithStock.filter(p => p.status === 'ACTIVE').length;
  const draft = productsWithStock.filter(p => p.status === 'DRAFT').length;
  const archived = productsWithStock.filter(p => p.status === 'ARCHIVED').length;
  const inStock = productsWithStock.filter(p => p.stock > 0).length;
  const noStock = productsWithStock.filter(p => p.stock <= 0).length;
  const visible = productsWithStock.filter(p => p.status === 'ACTIVE' && p.stock > 0).length;
  const activeNoStock = productsWithStock.filter(p => p.status === 'ACTIVE' && p.stock <= 0).length;

  // Hurtownie
  const warehouseStats = {
    'Ikonka': { total: 0, active: 0, inStock: 0, visible: 0 },
    'HP': { total: 0, active: 0, inStock: 0, visible: 0 },
    'Leker': { total: 0, active: 0, inStock: 0, visible: 0 },
    'BTP': { total: 0, active: 0, inStock: 0, visible: 0 },
  };

  for (const p of productsWithStock) {
    const id = p.baselinkerProductId || '';
    let warehouse = null;
    
    if (id.startsWith('hp-')) warehouse = 'HP';
    else if (id.startsWith('ikonka-') || /^\d+$/.test(id)) warehouse = 'Ikonka';
    else if (id.startsWith('leker-')) warehouse = 'Leker';
    else if (id.startsWith('btp-')) warehouse = 'BTP';

    if (warehouse) {
      warehouseStats[warehouse].total++;
      if (p.status === 'ACTIVE') warehouseStats[warehouse].active++;
      if (p.stock > 0) warehouseStats[warehouse].inStock++;
      if (p.status === 'ACTIVE' && p.stock > 0) warehouseStats[warehouse].visible++;
    }
  }

  // Kategorie
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      _count: { select: { products: true } }
    },
    orderBy: { products: { _count: 'desc' } }
  });

  const visibleByCat = {};
  for (const p of productsWithStock) {
    if (p.categoryId && p.status === 'ACTIVE' && p.stock > 0) {
      visibleByCat[p.categoryId] = (visibleByCat[p.categoryId] || 0) + 1;
    }
  }

  // Stany
  const productsInStock = productsWithStock.filter(p => p.stock > 0);
  const totalStock = productsInStock.reduce((sum, p) => sum + p.stock, 0);
  const avgStock = productsInStock.length > 0 ? totalStock / productsInStock.length : 0;
  const lowStock = productsWithStock.filter(p => p.stock > 0 && p.stock <= 5 && p.status === 'ACTIVE').length;
  const medStock = productsWithStock.filter(p => p.stock > 5 && p.stock <= 20 && p.status === 'ACTIVE').length;
  const highStock = productsWithStock.filter(p => p.stock > 20 && p.status === 'ACTIVE').length;

  // Ceny
  const visibleProducts = productsWithStock.filter(p => p.status === 'ACTIVE' && p.stock > 0);
  const prices = visibleProducts.map(p => parseFloat(p.price)).filter(x => !isNaN(x));
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const now = new Date().toLocaleString('pl-PL');

  // Generuj HTML
  const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Raport produktów - WBTrade</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      margin: 0; 
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .container { 
      max-width: 900px; 
      margin: 0 auto; 
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { 
      text-align: center; 
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .date { 
      text-align: center; 
      color: #7f8c8d; 
      margin-bottom: 30px;
    }
    h2 { 
      color: #34495e; 
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 15px 0;
    }
    th, td { 
      padding: 12px 15px; 
      text-align: left; 
      border-bottom: 1px solid #ddd;
    }
    th { 
      background: #3498db; 
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) { background: #f8f9fa; }
    tr:hover { background: #e8f4fc; }
    .number { text-align: right; font-weight: 500; }
    .highlight { 
      background: #e8f8f5 !important; 
      font-weight: bold;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .summary-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }
    .summary-box.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
    .summary-box.orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .summary-box.blue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .summary-box .value {
      font-size: 32px;
      font-weight: bold;
      display: block;
    }
    .summary-box .label {
      font-size: 14px;
      opacity: 0.9;
    }
    .status-active { color: #27ae60; }
    .status-hidden { color: #e74c3c; }
    .footer {
      text-align: center;
      margin-top: 40px;
      color: #7f8c8d;
      font-size: 12px;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Raport Ilościowy Produktów</h1>
    <p class="date">Wygenerowano: ${now}</p>

    <div class="summary-grid">
      <div class="summary-box">
        <span class="value">${total.toLocaleString('pl-PL')}</span>
        <span class="label">Łącznie w bazie</span>
      </div>
      <div class="summary-box green">
        <span class="value">${visible.toLocaleString('pl-PL')}</span>
        <span class="label">Widoczne na stronie</span>
      </div>
      <div class="summary-box blue">
        <span class="value">${inStock.toLocaleString('pl-PL')}</span>
        <span class="label">Ze stanem > 0</span>
      </div>
      <div class="summary-box orange">
        <span class="value">${noStock.toLocaleString('pl-PL')}</span>
        <span class="label">Bez stanu</span>
      </div>
    </div>

    <h2>📈 Statystyki podstawowe</h2>
    <table>
      <tr><td>Produkty ACTIVE</td><td class="number">${active.toLocaleString('pl-PL')}</td></tr>
      <tr><td>Produkty DRAFT</td><td class="number">${draft.toLocaleString('pl-PL')}</td></tr>
      <tr><td>Produkty ARCHIVED</td><td class="number">${archived.toLocaleString('pl-PL')}</td></tr>
      <tr class="highlight"><td>ACTIVE bez stanu magazynowego</td><td class="number">${activeNoStock.toLocaleString('pl-PL')}</td></tr>
    </table>

    <h2>🏭 Podział wg hurtowni</h2>
    <table>
      <tr>
        <th>Hurtownia</th>
        <th class="number">Łącznie</th>
        <th class="number">ACTIVE</th>
        <th class="number">Ze stanem</th>
        <th class="number">Widoczne</th>
      </tr>
      ${Object.entries(warehouseStats)
        .filter(([_, s]) => s.total > 0)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, s]) => `
          <tr>
            <td>${name}</td>
            <td class="number">${s.total.toLocaleString('pl-PL')}</td>
            <td class="number">${s.active.toLocaleString('pl-PL')}</td>
            <td class="number">${s.inStock.toLocaleString('pl-PL')}</td>
            <td class="number">${s.visible.toLocaleString('pl-PL')}</td>
          </tr>
        `).join('')}
    </table>

    <h2>📂 Podział wg kategorii</h2>
    <table>
      <tr>
        <th>Kategoria</th>
        <th class="number">Łącznie</th>
        <th class="number">Widoczne</th>
        <th>Status</th>
      </tr>
      ${categories.map(cat => `
        <tr>
          <td>${cat.name}</td>
          <td class="number">${cat._count.products.toLocaleString('pl-PL')}</td>
          <td class="number">${(visibleByCat[cat.id] || 0).toLocaleString('pl-PL')}</td>
          <td class="${cat.isActive ? 'status-active' : 'status-hidden'}">${cat.isActive ? '✅ aktywna' : '❌ ukryta'}</td>
        </tr>
      `).join('')}
    </table>

    <h2>💰 Statystyki cenowe</h2>
    <table>
      <tr><td>Średnia cena</td><td class="number">${avgPrice.toFixed(2)} PLN</td></tr>
      <tr><td>Minimalna cena</td><td class="number">${minPrice.toFixed(2)} PLN</td></tr>
      <tr><td>Maksymalna cena</td><td class="number">${maxPrice.toFixed(2)} PLN</td></tr>
    </table>

    <h2>📦 Statystyki stanów magazynowych</h2>
    <table>
      <tr><td>Łączny stan magazynowy</td><td class="number">${totalStock.toLocaleString('pl-PL')} szt.</td></tr>
      <tr><td>Średni stan na produkt</td><td class="number">${avgStock.toFixed(1)} szt.</td></tr>
      <tr><td>Niski stan (1-5 szt.)</td><td class="number">${lowStock.toLocaleString('pl-PL')} produktów</td></tr>
      <tr><td>Średni stan (6-20 szt.)</td><td class="number">${medStock.toLocaleString('pl-PL')} produktów</td></tr>
      <tr><td>Wysoki stan (>20 szt.)</td><td class="number">${highStock.toLocaleString('pl-PL')} produktów</td></tr>
    </table>

    <div class="footer">
      <p>WBTrade - Raport wygenerowany automatycznie</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

async function main() {
  try {
    const html = await generateReport();
    
    const filename = `raport-produktow-${new Date().toISOString().slice(0, 10)}.html`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, html);
    console.log(`✅ Raport zapisany: ${filepath}`);
    console.log(`\n📄 Otwórz plik w przeglądarce i użyj Ctrl+P aby wydrukować do PDF`);
    console.log(`   Lub kliknij prawym i "Drukuj" → "Zapisz jako PDF"\n`);
    
    // Automatycznie otwórz w przeglądarce
    const { exec } = require('child_process');
    exec(`start "" "${filepath}"`);
    
  } catch (err) {
    console.error('Błąd:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
