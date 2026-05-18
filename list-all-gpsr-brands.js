const fs = require('fs');
const dir = 'C:\\Users\\Pracownik Biuro 1\\Downloads\\';

// All .base files that may contain GPSR mappings
const files = fs.readdirSync(dir).filter(f => f.endsWith('.base'));

const gpsrMap = {}; // brand => { name, address, email, phone }

for (const file of files) {
  const b64 = fs.readFileSync(dir + file, 'utf8').trim();
  let data;
  try {
    data = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch(e) { continue; }

  const fieldMap = {
    'GPSR Nazwa producenta': 'name',
    'GPSR Adres producenta': 'address',
    'GPSR Email producenta': 'email',
    'GPSR Numer telefonu producenta': 'phone'
  };

  for (const [blField, ourField] of Object.entries(fieldMap)) {
    const rules = data[blField] || [];
    for (const rule of rules) {
      // type=2 means "set fixed value when brand matches"
      if (rule.action_type === '2' && rule.action_when_params && rule.service_value) {
        const brand = rule.action_when_params.trim();
        if (!gpsrMap[brand]) gpsrMap[brand] = {};
        if (!gpsrMap[brand][ourField]) {
          gpsrMap[brand][ourField] = rule.service_value;
        }
      }
    }
  }
}

const brands = Object.keys(gpsrMap).sort();
console.log('=== Total unique brands with GPSR: ' + brands.length + ' ===\n');

for (const brand of brands) {
  const d = gpsrMap[brand];
  console.log(brand + ':');
  if (d.name) console.log('  Nazwa: ' + d.name);
  if (d.address) console.log('  Adres: ' + d.address);
  if (d.email) console.log('  Email: ' + d.email);
  if (d.phone) console.log('  Tel: ' + d.phone);
}
