const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://b2bhurtowniasportowa.net/v2/xml/download/format/partner_b2b_full/key/66befd48d0b9e3800ca5d6dc03784db3/lang/pl';

// Load categories from file
const targets = fs.readFileSync(path.join(__dirname, 'sport-kategorie.txt'), 'utf8')
  .split('\n').map(l => l.trim()).filter(Boolean);
const outFile = 'sport-hurtownia-ids-all.txt';
console.log('Loaded ' + targets.length + ' categories from sport-kategorie.txt');

const ids = [];
const catCounts = {};
let currentId = null;
let remainder = '';

https.get(url, res => {
  res.setEncoding('utf8');
  res.on('data', chunk => {
    const text = remainder + chunk;
    
    // Single pass - find both product IDs and categories in order
    const re = /(?:<id>(\d+)<\/id>)|(?:<category><!\[CDATA\[([^\]]+)\]\]><\/category>)/g;
    let m;
    let lastPos = 0;
    while ((m = re.exec(text)) !== null) {
      if (m[1]) {
        currentId = m[1];
      } else if (m[2]) {
        const cat = m[2];
        if (currentId && targets.some(t => cat.startsWith(t))) {
          ids.push(currentId);
          catCounts[cat] = (catCounts[cat] || 0) + 1;
        }
        currentId = null;
      }
      lastPos = re.lastIndex;
    }
    
    // Keep tail for partial tag matches
    remainder = lastPos > 200 ? text.slice(lastPos - 200) : text.slice(-200);
  });
  res.on('end', () => {
    const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([cat, count]) => console.log(count.toString().padStart(6) + '  ' + cat));
    console.log('------');
    console.log(ids.length.toString().padStart(6) + '  RAZEM');

    const outPath = path.join(__dirname, '..', '..', outFile);
    fs.writeFileSync(outPath, ids.join(','), 'utf8');
    console.log('\nZapisano ' + ids.length + ' ID do ' + outFile);
  });
});
