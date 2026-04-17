// Decode .base files and analyze GPSR mapping structure
const fs = require('fs');
const path = require('path');

// Decode the .base files
const files = [
  'c:\\Users\\kuba4\\Downloads\\marketplace_kauflandpl_pl_20260415165729.base',
  'c:\\Users\\kuba4\\Downloads\\marketplace_kauflandpl_pl_20260415165745.base',
];

for (const f of files) {
  if (!fs.existsSync(f)) { console.log(`NOT FOUND: ${f}`); continue; }
  const raw = fs.readFileSync(f, 'utf-8');
  const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
  const basename = path.basename(f);
  
  console.log(`\n========== ${basename} ==========`);
  console.log('Sections:', Object.keys(decoded));
  
  for (const [section, entries] of Object.entries(decoded)) {
    console.log(`\n--- ${section} (${entries.length} entries) ---`);
    // Show first 3 entries as samples
    entries.slice(0, 3).forEach(e => {
      console.log(`  brand: "${e.action_when_params}" → value: "${e.service_value?.substring(0, 80)}${e.service_value?.length > 80 ? '...' : ''}"`);
    });
  }
}

// Also check existing astralomza gpsr file
const astralomza = JSON.parse(fs.readFileSync('c:\\Users\\kuba4\\WBTrade-new\\apps\\api\\data\\astralomza_gpsr_import.json', 'utf-8'));
console.log('\n========== astralomza_gpsr_import.json ==========');
console.log('Sections:', Object.keys(astralomza));
for (const [section, entries] of Object.entries(astralomza)) {
  console.log(`  ${section}: ${entries.length} entries`);
}

// Check dofirmy existing gpsr
const dofirmy = JSON.parse(fs.readFileSync('c:\\Users\\kuba4\\WBTrade-new\\apps\\api\\data\\dofirmy-gpsr-existing.json', 'utf-8'));
console.log('\n========== dofirmy-gpsr-existing.json ==========');
if (Array.isArray(dofirmy)) {
  console.log(`Array with ${dofirmy.length} entries`);
  console.log('Sample:', JSON.stringify(dofirmy[0], null, 2));
} else {
  console.log('Sections:', Object.keys(dofirmy));
  for (const [section, entries] of Object.entries(dofirmy)) {
    console.log(`  ${section}: ${Array.isArray(entries) ? entries.length + ' entries' : typeof entries}`);
  }
}
