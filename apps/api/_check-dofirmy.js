const fs = require('fs');
const dofirmy = JSON.parse(fs.readFileSync('c:\\Users\\kuba4\\WBTrade-new\\apps\\api\\data\\dofirmy-gpsr-existing.json', 'utf-8'));
// Show structure of first brand
const first = Object.keys(dofirmy)[0];
console.log(`Structure of "${first}":`, JSON.stringify(dofirmy[first], null, 2));

// Show a second brand
const second = Object.keys(dofirmy)[1];
console.log(`\nStructure of "${second}":`, JSON.stringify(dofirmy[second], null, 2));
