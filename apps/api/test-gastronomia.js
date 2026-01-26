const { CategoryTagMapper } = require('./src/services/category-tag-mapper.service.js');
const mapper = new CategoryTagMapper();

console.log('=== TEST MAPOWANIA GASTRONOMIA ===\n');

// Test 1: Tylko gastronomia
const result1 = mapper.mapTags(['gastronomia', 'Paczkomaty i Kurier', 'Hurtownia Przemysłowa']);
console.log('Test 1 - gastronomia:', result1);

// Test 2: Gastronomiczne
const result2 = mapper.mapTags(['Gastronomiczne', 'Paczkomaty i Kurier']);
console.log('Test 2 - Gastronomiczne:', result2);

// Test 3: Biurowe
const result3 = mapper.mapTags(['Biurowe i papiernicze', 'Paczkomaty i Kurier']);
console.log('Test 3 - Biurowe i papiernicze:', result3);

// Test 4: Normalizacja
console.log('\n=== NORMALIZACJA ===');
console.log('gastronomia ->', mapper.normalizeTag('gastronomia'));
console.log('isMainCategory(gastronomia):', mapper.isMainCategory('gastronomia'));
console.log('isMainCategory(Gastronomiczne):', mapper.isMainCategory('Gastronomiczne'));

console.log('\nmainCategoryTags:', [...mapper.mainCategoryTags]);
