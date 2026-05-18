const https = require('https');

const url = 'https://b2bhurtowniasportowa.net/v2/xml/download/format/partner_b2b_full/key/66befd48d0b9e3800ca5d6dc03784db3/lang/pl';
const targets = ['Narzędzia', 'Nawadnianie i opryskiwanie'];
const catCounts = {};
let buf = '';
let total = 0;

https.get(url, res => {
  res.setEncoding('utf8');
  res.on('data', chunk => {
    buf += chunk;
    const re = /<category><!\[CDATA\[([^\]]+)\]\]><\/category>/g;
    let m;
    while ((m = re.exec(buf)) !== null) {
      const cat = m[1];
      if (targets.some(t => cat.startsWith(t))) {
        catCounts[cat] = (catCounts[cat] || 0) + 1;
        total++;
      }
    }
    buf = buf.slice(-500);
  });
  res.on('end', () => {
    const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([cat, count]) => console.log(count.toString().padStart(6) + '  ' + cat));
    console.log('------');
    console.log(total.toString().padStart(6) + '  RAZEM');
  });
});
