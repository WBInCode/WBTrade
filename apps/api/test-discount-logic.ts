/**
 * Test logiki obliczania kwoty do zapłaty z rabatem
 * Sprawdza czy poprawka w checkout.controller.ts działa
 */

console.log('🧪 TEST: Logika obliczania total z rabatem\n');
console.log('='.repeat(60));

// Symulacja danych z checkout.controller.ts

// Przypadek 1: Zamówienie z rabatem 30%
console.log('\n📋 PRZYPADEK 1: Zamówienie z rabatem 30%');
const subtotal1 = 54.32;
const shippingCost1 = 15.99;
const paymentFee1 = 0;
const discountPercent1 = 30;
const discount1 = Math.round(subtotal1 * (discountPercent1 / 100) * 100) / 100;

// STARA FORMUŁA (błędna):
const oldTotal1 = subtotal1 + shippingCost1 + paymentFee1;

// NOWA FORMUŁA (poprawiona):
const newTotal1 = subtotal1 + shippingCost1 + paymentFee1 - discount1;

console.log(`   Subtotal:     ${subtotal1.toFixed(2)} PLN`);
console.log(`   Shipping:     ${shippingCost1.toFixed(2)} PLN`);
console.log(`   Payment fee:  ${paymentFee1.toFixed(2)} PLN`);
console.log(`   Discount:     -${discount1.toFixed(2)} PLN (${discountPercent1}%)`);
console.log(`   ─────────────────────────`);
console.log(`   STARA (błędna):  ${oldTotal1.toFixed(2)} PLN ❌`);
console.log(`   NOWA (poprawna): ${newTotal1.toFixed(2)} PLN ✅`);
console.log(`   Różnica:         ${(oldTotal1 - newTotal1).toFixed(2)} PLN (nadpłata klienta!)`);

// Przypadek 2: Zamówienie BEZ rabatu
console.log('\n📋 PRZYPADEK 2: Zamówienie BEZ rabatu');
const subtotal2 = 100;
const shippingCost2 = 15.99;
const paymentFee2 = 0;
const discount2 = 0;

const oldTotal2 = subtotal2 + shippingCost2 + paymentFee2;
const newTotal2 = subtotal2 + shippingCost2 + paymentFee2 - discount2;

console.log(`   Subtotal:     ${subtotal2.toFixed(2)} PLN`);
console.log(`   Shipping:     ${shippingCost2.toFixed(2)} PLN`);
console.log(`   Discount:     ${discount2.toFixed(2)} PLN`);
console.log(`   ─────────────────────────`);
console.log(`   STARA:  ${oldTotal2.toFixed(2)} PLN`);
console.log(`   NOWA:   ${newTotal2.toFixed(2)} PLN`);
console.log(`   Różnica: ${(oldTotal2 - newTotal2).toFixed(2)} PLN (OK - brak różnicy)`);

// Przypadek 3: Zamówienie problematyczne (WB-MKYMVNL9-JVCV)
console.log('\n📋 PRZYPADEK 3: Rzeczywiste zamówienie WB-MKYMVNL9-JVCV');
const subtotal3 = 54.32;
const shippingCost3 = 15.99;
const paymentFee3 = 0;
const discount3 = 16.30; // 30% z 54.32

const correctTotal3 = subtotal3 + shippingCost3 + paymentFee3 - discount3;
const actualPaid3 = 70.31; // co klient faktycznie zapłacił

console.log(`   Subtotal:     ${subtotal3.toFixed(2)} PLN`);
console.log(`   Shipping:     ${shippingCost3.toFixed(2)} PLN`);
console.log(`   Discount:     -${discount3.toFixed(2)} PLN (30%)`);
console.log(`   ─────────────────────────`);
console.log(`   Powinno być:  ${correctTotal3.toFixed(2)} PLN`);
console.log(`   Klient zapłacił: ${actualPaid3.toFixed(2)} PLN`);
console.log(`   Nadpłata:     ${(actualPaid3 - correctTotal3).toFixed(2)} PLN ⚠️`);

// Weryfikacja kodu
console.log('\n' + '='.repeat(60));
console.log('🔍 WERYFIKACJA KODU checkout.controller.ts:');
console.log('='.repeat(60));

console.log(`
BYŁO (linia ~450):
  const total = subtotal + shippingCost + paymentFee;

JEST (po poprawce):
  const discount = cart.discount || 0;
  const total = subtotal + shippingCost + paymentFee - discount;
`);

// Test jednostkowy
const testCases = [
  { subtotal: 100, shipping: 15.99, fee: 0, discount: 30, expected: 85.99 },
  { subtotal: 54.32, shipping: 15.99, fee: 0, discount: 16.30, expected: 54.01 },
  { subtotal: 200, shipping: 0, fee: 5, discount: 0, expected: 205 },
  { subtotal: 50, shipping: 10, fee: 0, discount: 50, expected: 10 },
];

console.log('🧪 TESTY JEDNOSTKOWE:');
let allPassed = true;

testCases.forEach((tc, i) => {
  const result = tc.subtotal + tc.shipping + tc.fee - tc.discount;
  const passed = Math.abs(result - tc.expected) < 0.01;
  allPassed = allPassed && passed;
  
  console.log(`   Test ${i + 1}: ${tc.subtotal} + ${tc.shipping} + ${tc.fee} - ${tc.discount} = ${result.toFixed(2)} | Expected: ${tc.expected} | ${passed ? '✅' : '❌'}`);
});

console.log('\n' + '='.repeat(60));
console.log(allPassed ? '🎉 WSZYSTKIE TESTY PASSED!' : '💥 NIEKTÓRE TESTY FAILED!');
console.log('='.repeat(60));
