const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'Ikony na aplikację');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

files.forEach(f => {
  const svg = fs.readFileSync(path.join(dir, f), 'utf-8');
  const m = svg.match(/viewBox="([^"]+)"/);
  console.log(f + ': ' + (m ? m[1] : 'none'));
});
