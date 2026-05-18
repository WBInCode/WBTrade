const fs = require('fs');
const files = [
  ['marketplace_kauflandpl_pl_20260414131804.base', 'Leker'],
  ['marketplace_kauflandpl_pl_20260414131807.base', 'Forcetop'],
  ['marketplace_kauflandpl_pl_20260414131816.base', 'HP (Hurtownia Kuchenna)']
];
const dir = 'C:\\Users\\Pracownik Biuro 1\\Downloads\\';
for (const [file, label] of files) {
  const b64 = fs.readFileSync(dir + file, 'utf8').trim();
  const data = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  console.log('=== ' + file + ' (' + label + ') ===');
  const gpsr_fields = ['GPSR Nazwa producenta', 'GPSR Adres producenta', 'GPSR Email producenta', 'GPSR Numer telefonu producenta'];
  for (const field of gpsr_fields) {
    const entries = data[field] || [];
    console.log('  ' + field + ': ' + entries.length + ' rules');
    for (const e of entries.slice(0, 5)) {
      const cond = e.action_when_params ? ('when brand=' + e.action_when_params) : 'default';
      const val = (e.service_value || '').substring(0, 80);
      console.log('    type=' + e.action_type + ' ' + cond + ' => "' + val + '"');
    }
    if (entries.length > 5) console.log('    ... +' + (entries.length - 5) + ' more');
  }
  console.log('');
}
