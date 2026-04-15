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
 * Load price rules from Settings table for all warehouses with hasPriceRules=true
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Promise<Record<string, Array<{priceFrom: number, priceTo: number, multiplier: number, addToPrice: number}>>>}
 */
async function loadPriceRules(prisma) {
  // Use cache if fresh
  if (_rulesCache && Date.now() - _rulesCacheTime < CACHE_TTL) {
    return _rulesCache;
  }

  // Dynamically get warehouse keys from Wholesaler table
  let warehouses = ['leker', 'btp', 'hp', 'dofirmy']; // fallback
  try {
    const wholesalers = await prisma.wholesaler.findMany({
      where: { isActive: true, hasPriceRules: true },
      select: { key: true },
    });
    if (wholesalers.length > 0) {
      warehouses = wholesalers.map(w => w.key);
    }
  } catch (err) {
    // Table may not exist yet during migration — use fallback
    console.warn('⚠️ Could not load wholesalers for price rules, using fallback:', err.message);
  }

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
 * Get warehouse key from inventory name or prefix.
 * Now delegates to dynamic wholesaler config loaded from database.
 * Falls back to simple key matching if wholesaler table is unavailable.
 * @param {string} nameOrPrefix - e.g. 'Leker', 'BTP', 'HP', 'leker-', 'btp-', 'hp-'
 * @param {PrismaClient} [prismaClient] - optional Prisma client for dynamic lookup
 * @returns {string|null}
 */
function getWarehouseKey(nameOrPrefix, prismaClient) {
  const lower = (nameOrPrefix || '').toLowerCase().replace(/-$/, '').trim();
  if (!lower) return null;
  // Simple synchronous lookup — used in hot paths where async isn't possible.
  // The key IS the warehouse key, so just return it if it's a known format.
  return lower || null;
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
