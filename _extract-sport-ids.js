const https = require('https');
const fs = require('fs');

const url = 'https://b2bhurtowniasportowa.net/v2/xml/download/format/partner_b2b_full/key/66befd48d0b9e3800ca5d6dc03784db3/lang/pl';

const targetPatterns = [
  /komputer/i,
  /notebook/i,
  /netbook/i,
  /ultrabook/i,
];

const ids = [];
const matchedCategories = {};
let buffer = '';
let processed = 0;

console.log('Downloading and extracting IDs for: Komputery i akcesoria...');

const req = https.get(url, (res) => {
  res.setEncoding('utf8');
  
  res.on('data', (chunk) => {
    buffer += chunk;
    
    let startIdx;
    while ((startIdx = buffer.indexOf('<product>')) !== -1) {
      const endIdx = buffer.indexOf('</product>', startIdx);
      if (endIdx === -1) {
        buffer = buffer.substring(startIdx);
        break;
      }
      
      const productXml = buffer.substring(startIdx, endIdx + '</product>'.length);
      buffer = buffer.substring(endIdx + '</product>'.length);
      processed++;
      
      const catMatch = productXml.match(/<category><!\[CDATA\[([^\]]*)\]\]><\/category>/);
      if (!catMatch) continue;
      
      const category = catMatch[1];
      const matches = targetPatterns.some(p => p.test(category));
      
      if (matches) {
        const idMatch = productXml.match(/<id>(\d+)<\/id>/);
        if (idMatch) {
          ids.push(idMatch[1]);
          matchedCategories[category] = (matchedCategories[category] || 0) + 1;
        }
      }
      
      if (processed % 10000 === 0) {
        process.stdout.write(`\rProcessed: ${processed} products, found: ${ids.length} matching...`);
      }
    }
  });
  
  res.on('end', () => {
    console.log(`\nDone! Processed ${processed} products.`);
    console.log(`\nMatched categories:`);
    Object.entries(matchedCategories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} products`);
    });
    console.log(`\nTotal matching IDs: ${ids.length}`);
    
    fs.writeFileSync('sport-hurtownia-ids-komputery.txt', ids.join(','), 'utf8');
    console.log('Saved to sport-hurtownia-ids-komputery.txt');
  });
});

req.on('error', (e) => console.error('Error:', e));
