/**
 * Price Sync — BTP, Leker, HP — FULLY batch optimized
 * All comparisons in memory, bulk DB writes
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Client } = require('pg');
const crypto = require('crypto');

const BL_API = 'https://api.baselinker.com/connector.php';
const PLN_GROUP = '10034';
const INVENTORIES = ['Leker', 'BTP', 'HP'];
const PREFIX = { 'HP': 'hp-', 'BTP': 'btp-', 'Leker': 'leker-' };
const WH_KEY = { 'HP': 'hp', 'BTP': 'btp', 'Leker': 'leker' };

function decrypt(enc, iv, tag, key) {
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  d.setAuthTag(Buffer.from(tag, 'hex'));
  return d.update(enc, 'hex', 'utf8') + d.final('utf8');
}

function priceTo99(p) { return p <= 0 ? 0 : Math.floor(p) + 0.99; }

// Price rules loaded from settings table
let priceRules = {};

async function loadPriceRulesFromDb(db) {
  for (const wh of ['leker', 'btp', 'hp']) {
    try {
      const res = await db.query('SELECT value FROM settings WHERE key = $1', [`price_rules_${wh}`]);
      if (res.rows.length > 0 && res.rows[0].value) {
        const parsed = JSON.parse(res.rows[0].value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          priceRules[wh] = parsed
            .map(r => ({ priceFrom: parseFloat(r.priceFrom) || 0, priceTo: parseFloat(r.priceTo) || 999999, multiplier: parseFloat(r.multiplier) || 1, addToPrice: parseFloat(r.addToPrice) || 0 }))
            .sort((a, b) => a.priceFrom - b.priceFrom);
        }
      }
    } catch (e) { console.warn(`  Warning: Could not load price rules for ${wh}:`, e.message); }
  }
}

function applyPriceMultiplier(rawPrice, warehouse) {
  if (!rawPrice || rawPrice <= 0 || !priceRules[warehouse]) return rawPrice;
  for (const rule of priceRules[warehouse]) {
    if (rawPrice >= rule.priceFrom && rawPrice <= rule.priceTo) {
      return rawPrice * rule.multiplier + rule.addToPrice;
    }
  }
  return rawPrice;
}

let rc = 0;
async function bl(token, method, params = {}) {
  rc++;
  if (rc > 1 && rc % 5 === 0) await new Promise(r => setTimeout(r, 3000));
  const body = new URLSearchParams();
  body.append('method', method);
  body.append('parameters', JSON.stringify(params));
  for (let a = 0; a < 4; a++) {
    try {
      const res = await fetch(BL_API, {
        method: 'POST',
        headers: { 'X-BLToken': token, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(), signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.status === 'ERROR') {
        if (data.error_message?.includes('limit') || data.error_message?.includes('blocked')) {
          const m = data.error_message.match(/until (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
          const w = m ? Math.max(new Date(m[1]).getTime() - Date.now() + 5000, 10000) : 60000;
          console.log(`  Rate limit, waiting ${Math.round(w/1000)}s...`);
          await new Promise(r => setTimeout(r, w)); continue;
        }
        throw new Error(data.error_message);
      }
      const { status, error_code, error_message, ...rest } = data;
      return rest;
    } catch (e) {
      if (a < 3) await new Promise(r => setTimeout(r, 2000 * Math.pow(2, a)));
      else throw e;
    }
  }
}

async function main() {
  const t0 = Date.now();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  console.log('=== PRICE SYNC: Leker, BTP, HP ===\n');

  // Load price multiplier rules from DB
  await loadPriceRulesFromDb(db);
  for (const wh of ['leker', 'btp', 'hp']) {
    const count = priceRules[wh] ? priceRules[wh].length : 0;
    console.log(`  Reguły cenowe ${wh}: ${count} ${count > 0 ? '(aktywne)' : '(brak)'}`);
  }
  console.log('');

  const cfg = (await db.query('SELECT * FROM baselinker_configs LIMIT 1')).rows[0];
  const token = decrypt(cfg.api_token_encrypted, cfg.encryption_iv, cfg.auth_tag, process.env.BASELINKER_ENCRYPTION_KEY);
  console.log('Token OK');

  const invs = ((await bl(token, 'getInventories')).inventories || []).filter(i => INVENTORIES.includes(i.name));
  console.log(`Inventories: ${invs.map(i=>i.name).join(', ')}\n`);

  const logId = (await db.query("INSERT INTO baselinker_sync_logs (id,type,status,started_at) VALUES (gen_random_uuid(),'PRICE','RUNNING',NOW()) RETURNING id")).rows[0].id;

  let totalProc = 0, totalChanged = 0;
  const changes = [], errors = [];

  for (const inv of invs) {
    const pfx = PREFIX[inv.name];
    const whKey = WH_KEY[inv.name];
    console.log(`--- ${inv.name} (prefix: "${pfx}", rules: ${priceRules[whKey] ? priceRules[whKey].length : 0}) ---`);

    try {
      // 1. Fetch all BL prices (paginated)
      const blPrices = new Map(); // prefixedId -> newPrice
      let page = 1, more = true;
      while (more) {
        process.stdout.write(`  Page ${page}...`);
        const d = await bl(token, 'getInventoryProductsPrices', { inventory_id: parseInt(inv.inventory_id), page });
        const p = d.products || {};
        const entries = Object.entries(p);
        for (const [id, pg] of entries) {
          let raw = 0;
          const priceObj = pg.prices || pg; // BL returns {product_id, prices: {groupId: price}}
          const pln = priceObj[PLN_GROUP];
          if (pln > 0) raw = pln;
          else for (const v of Object.values(priceObj)) { if (typeof v === 'number' && v > 0) { raw = v; break; } }
          // Apply price multiplier rules, then round to .99
          const withMarkup = applyPriceMultiplier(raw, whKey);
          const np = priceTo99(withMarkup);
          if (np > 0 && np < 99999999 && isFinite(np)) blPrices.set(`${pfx}${id}`, np);
          else if (np >= 99999999 || !isFinite(np)) console.log(`  SKIP overflow price: ${id} raw=${raw} np=${np}`);
        }
        more = entries.length === 1000;
        page++;
        console.log(` ${entries.length}`);
        if (more) await new Promise(r => setTimeout(r, 2000));
      }
      console.log(`  BL prices: ${blPrices.size}`);

      // 2. Batch fetch ALL matching products + variants from DB (one query each)
      const allIds = [...blPrices.keys()];
      
      console.log('  Fetching DB products...');
      const prodRes = await db.query(
        'SELECT id, baselinker_product_id, price, sku FROM products WHERE baselinker_product_id = ANY($1)',
        [allIds]
      );
      console.log(`  DB products: ${prodRes.rows.length}`);
      
      console.log('  Fetching DB variants...');
      const varRes = await db.query(
        'SELECT id, baselinker_variant_id, price, sku, product_id FROM product_variants WHERE baselinker_variant_id = ANY($1)',
        [allIds]
      );
      console.log(`  DB variants: ${varRes.rows.length}`);

      // 3. Compare in memory — collect changes
      const prodChanges = []; // {id, oldPrice, newPrice, sku, blId}
      const varChanges = [];  // {id, productId, oldPrice, newPrice, sku, blId}
      const prodNoChange = new Set(); // track products already updated

      for (const p of prodRes.rows) {
        const np = blPrices.get(p.baselinker_product_id);
        if (!np) continue;
        totalProc++;
        const op = parseFloat(p.price);
        if (Math.abs(op - np) > 0.01) {
          prodChanges.push({ id: p.id, old: op, new: np, sku: p.sku || p.baselinker_product_id, blId: p.baselinker_product_id });
          prodNoChange.add(p.baselinker_product_id);
        }
      }

      for (const v of varRes.rows) {
        const np = blPrices.get(v.baselinker_variant_id);
        if (!np) continue;
        const op = parseFloat(v.price);
        if (Math.abs(op - np) > 0.01) {
          varChanges.push({ id: v.id, productId: v.product_id, old: op, new: np, sku: v.sku || v.baselinker_variant_id, blId: v.baselinker_variant_id, isExtra: !prodNoChange.has(v.baselinker_variant_id) });
        }
      }

      console.log(`  Product price changes: ${prodChanges.length}`);
      console.log(`  Variant price changes: ${varChanges.length}`);

      // 4. BULK write — batches of 200
      const BATCH = 200;

      // --- Products ---
      for (let i = 0; i < prodChanges.length; i += BATCH) {
        const batch = prodChanges.slice(i, i + BATCH);
        
        // Bulk insert price_history
        if (batch.length > 0) {
          const vals = batch.map((c, j) => {
            const off = j * 3;
            return `(gen_random_uuid(), $${off+1}::text, NULL, $${off+2}::numeric, $${off+3}::numeric, 'BASELINKER', 'BL price sync', NOW())`;
          }).join(',');
          const params = batch.flatMap(c => [c.id, c.old, c.new]);
          await db.query(`INSERT INTO price_history (id,product_id,variant_id,old_price,new_price,source,reason,changed_at) VALUES ${vals}`, params);

          // Bulk update prices — use unnest for efficient batch update
          const ids = batch.map(c => c.id);
          const prices = batch.map(c => c.new);
          await db.query(`
            UPDATE products SET price = u.new_price, 
              lowest_price_30_days = LEAST(COALESCE(lowest_price_30_days, u.new_price), u.new_price), 
              lowest_price_30_days_at = COALESCE(lowest_price_30_days_at, NOW()), updated_at = NOW()
            FROM (SELECT unnest($1::text[]) as id, unnest($2::numeric[]) as new_price) u
            WHERE products.id = u.id
          `, [ids, prices]);
        }

        if (i + BATCH < prodChanges.length) process.stdout.write(`  Products: ${i + BATCH}/${prodChanges.length}\r`);
      }
      if (prodChanges.length > 0) console.log(`  Products updated: ${prodChanges.length}`);

      // --- Variants ---
      for (let i = 0; i < varChanges.length; i += BATCH) {
        const batch = varChanges.slice(i, i + BATCH);
        
        if (batch.length > 0) {
          const vals = batch.map((c, j) => {
            const off = j * 4;
            return `(gen_random_uuid(), $${off+1}::text, $${off+2}::text, $${off+3}::numeric, $${off+4}::numeric, 'BASELINKER', 'BL price sync', NOW())`;
          }).join(',');
          const params = batch.flatMap(c => [c.productId, c.id, c.old, c.new]);
          await db.query(`INSERT INTO price_history (id,product_id,variant_id,old_price,new_price,source,reason,changed_at) VALUES ${vals}`, params);

          const ids = batch.map(c => c.id);
          const prices = batch.map(c => c.new);
          await db.query(`
            UPDATE product_variants SET price = u.new_price, 
              lowest_price_30_days = LEAST(COALESCE(lowest_price_30_days, u.new_price), u.new_price),
              lowest_price_30_days_at = COALESCE(lowest_price_30_days_at, NOW()), updated_at = NOW()
            FROM (SELECT unnest($1::text[]) as id, unnest($2::numeric[]) as new_price) u
            WHERE product_variants.id = u.id
          `, [ids, prices]);
        }

        if (i + BATCH < varChanges.length) process.stdout.write(`  Variants: ${i + BATCH}/${varChanges.length}\r`);
      }
      if (varChanges.length > 0) console.log(`  Variants updated: ${varChanges.length}`);

      // Collect for report
      for (const c of prodChanges) {
        changes.push({ sku: c.sku, old: c.old, new: c.new, inv: inv.name });
      }
      for (const c of varChanges) {
        if (c.isExtra) changes.push({ sku: c.sku, old: c.old, new: c.new, inv: inv.name });
      }
      totalChanged += prodChanges.length + varChanges.filter(v => v.isExtra).length;
      console.log(`  => ${totalProc} checked, ${prodChanges.length + varChanges.length} price updates\n`);

    } catch (e) {
      console.error(`  ERROR: ${e.message}\n`);
      errors.push(`${inv.name}: ${e.message}`);
    }
  }

  // Finalize
  const st = errors.length > 0 ? 'FAILED' : 'SUCCESS';
  await db.query('UPDATE baselinker_sync_logs SET status=$1,items_processed=$2,items_changed=$3,changed_skus=$4,errors=$5,completed_at=NOW() WHERE id=$6',
    [st, totalProc, totalChanged,
     changes.length > 0 ? JSON.stringify(changes.slice(0,200)) : null,
     errors.length > 0 ? JSON.stringify(errors) : null, logId]);
  await db.query('UPDATE baselinker_configs SET last_sync_at=NOW()');

  const sec = ((Date.now()-t0)/1000).toFixed(1);
  console.log('='.repeat(50));
  console.log(`DONE ${sec}s | ${rc} API calls | ${st}`);
  console.log(`Checked: ${totalProc} | Changed: ${totalChanged} | Errors: ${errors.length}`);

  if (changes.length > 0) {
    console.log(`\nChanged (first 25):`);
    changes.slice(0,25).forEach(c => console.log(`  ${c.sku}: ${c.old} -> ${c.new} PLN (${c.inv})`));
    if (changes.length > 25) console.log(`  ... +${changes.length-25} more`);
  }

  await db.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
