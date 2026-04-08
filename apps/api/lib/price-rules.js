/**
 * Price Rules Utility
 * 
 * Loads price multiplier rules from the Settings table and applies them.
 * Rules are stored per warehouse: price_rules_leker, price_rules_btp, price_rules_hp
 * 
 * Flow: Cena hurtowa → mnożnik × cena + dodaj → zaokrąglenie do .99 → baza
 */

const { PrismaClient } = require('@prisma/client');

// Cache rules in memory for the lifetime of the process
let _rulesCache = null;
let _rulesCacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

/**
 * Load price rules from Settings table for all warehouses
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Promise<Record<string, Array<{priceFrom: number, priceTo: number, multiplier: number, addToPrice: number}>>>}
 */
async function loadPriceRules(prisma) {
  // Use cache if fresh
  if (_rulesCache && Date.now() - _rulesCacheTime < CACHE_TTL) {
    return _rulesCache;
  }

  const warehouses = ['leker', 'btp', 'hp', 'dofirmy'];
  const rules = {};

  for (const wh of warehouses) {
    try {
      const setting = await prisma.settings.findUnique({
        where: { key: `price_rules_${wh}` },
      });

      if (setting && setting.value) {
        const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sort by priceFrom ascending for correct matching
          rules[wh] = parsed
            .map(r => ({
              priceFrom: parseFloat(r.priceFrom) || 0,
              priceTo: parseFloat(r.priceTo) || 999999,
              multiplier: parseFloat(r.multiplier) || 1,
              addToPrice: parseFloat(r.addToPrice) || 0,
            }))
            .sort((a, b) => a.priceFrom - b.priceFrom);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not load price rules for ${wh}:`, err.message);
    }
  }

  _rulesCache = rules;
  _rulesCacheTime = Date.now();
  return rules;
}

/**
 * Apply price multiplier rules to a raw wholesale price.
 * Returns the modified price (before rounding to .99).
 * If no rules are found for the warehouse, returns the raw price unchanged.
 * 
 * @param {number} rawPrice - wholesale price from Baselinker
 * @param {string} warehouse - warehouse key: 'leker', 'btp', or 'hp'
 * @param {Record<string, Array>} priceRules - loaded price rules
 * @returns {number} - price after applying multiplier and addition
 */
function applyPriceMultiplier(rawPrice, warehouse, priceRules) {
  if (!rawPrice || rawPrice <= 0) return rawPrice;
  if (!priceRules || !priceRules[warehouse]) return rawPrice;

  const rules = priceRules[warehouse];
  for (const rule of rules) {
    if (rawPrice >= rule.priceFrom && rawPrice <= rule.priceTo) {
      return rawPrice * rule.multiplier + rule.addToPrice;
    }
  }

  // No matching rule — return raw price unchanged
  return rawPrice;
}

/**
 * Get warehouse key from inventory name or prefix
 * @param {string} nameOrPrefix - e.g. 'Leker', 'BTP', 'HP', 'leker-', 'btp-', 'hp-'
 * @returns {string|null}
 */
function getWarehouseKey(nameOrPrefix) {
  const lower = (nameOrPrefix || '').toLowerCase().replace(/-$/, '');
  if (lower === 'leker') return 'leker';
  if (lower === 'btp') return 'btp';
  if (lower === 'hp') return 'hp';
  if (lower === 'dofirmy') return 'dofirmy';
  return null;
}

/**
 * Clear the in-memory price rules cache (useful after admin saves new rules)
 */
function clearPriceRulesCache() {
  _rulesCache = null;
  _rulesCacheTime = 0;
}

module.exports = {
  loadPriceRules,
  applyPriceMultiplier,
  getWarehouseKey,
  clearPriceRulesCache,
};
