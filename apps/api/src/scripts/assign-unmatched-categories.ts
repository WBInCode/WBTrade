/**
 * Przypisz kategorie 929 niedopasowanym produktom BL na podstawie słów kluczowych w nazwie
 * (produkty, których nie ma w XML feedzie Mamezi)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const API_TOKEN = process.env.BASELINKER_API_TOKEN!;
const DOFIRMY_INV_ID = 26423;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceReassign = args.includes('--force');

let requestCount = 0;

async function blRequest(method: string, params: Record<string, any> = {}): Promise<any> {
  const formData = new URLSearchParams();
  formData.append('method', method);
  formData.append('parameters', JSON.stringify(params));
  const response = await fetch(BASELINKER_API_URL, {
    method: 'POST',
    headers: { 'X-BLToken': API_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  const data = await response.json();
  requestCount++;
  if (data.status === 'ERROR') {
    if (data.error_message?.includes('Query limit exceeded') || data.error_message?.includes('token blocked')) {
      const match = data.error_message.match(/until (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
      let waitMs = 65000;
      if (match) { waitMs = Math.max(new Date(match[1]).getTime() - Date.now() + 5000, 10000); }
      console.log(`   ⏳ Rate limit (po ${requestCount} req) - czekam ${Math.round(waitMs / 1000)}s...`);
      await sleep(waitMs);
      return blRequest(method, params);
    }
    throw new Error(`BL API Error: ${data.error_message}`);
  }
  return data;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Reguły klasyfikacji po słowach kluczowych w nazwie (case-insensitive)
// Kolejność ma znaczenie - pierwsza pasująca reguła wygrywa
const NAME_RULES: { patterns: RegExp; slug: string; label: string }[] = [
  // BHP / Obuwie
  { patterns: /buty bezpieczne|obuwie robocze|obuwie ochronne|sandał.*roboczy|sandały.*ochronne|trzewiki.*roboczy|kalosze.*roboczy/i, slug: 'gadzety', label: 'Buty robocze' },
  { patterns: /obuwie ogrodnicze|klapki ogrodnicze|chodaki/i, slug: 'gadzety', label: 'Obuwie ogrodnicze' },
  
  // BHP / Odzież
  { patterns: /kamizelka odblaskowa|kamizelka ochronna|kamizelka ostrzegawcza/i, slug: 'gadzety', label: 'Kamizelki' },
  { patterns: /bluza ochronna|koszula.*robocz|ubranie.*robocz/i, slug: 'akcesoria-1', label: 'Odzież robocza' },
  { patterns: /spodnie ochronne|spodnie.*robocz|ogrodniczki.*ochronne/i, slug: 'akcesoria-1', label: 'Odzież robocza' },
  { patterns: /t-shirt.*stedman|t-shirt.*unisex/i, slug: 'akcesoria-1', label: 'T-shirt roboczy' },
  { patterns: /czapka zimowa|czapka.*polaru/i, slug: 'akcesoria-1', label: 'Czapki BHP' },
  
  // BHP / Rękawice
  { patterns: /rękawice robocze|rękawice ochronne|rękawice.*powlekane|rękawice.*montażowe|rękawice.*spawalnicze/i, slug: 'akcesoria-1', label: 'Rękawice robocze' },
  { patterns: /rękawice winylowe|rękawice nitrylowe|rękawiczki.*jednorazowe|rękawiczki.*nitrylowe|rękawiczki.*winylowe/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Rękawiczki jednorazowe' },
  
  // BHP / Inne
  { patterns: /apteczka.*pierwszej|apteczka.*pomocy/i, slug: 'akcesoria-1', label: 'Apteczki' },
  { patterns: /okulary ochronne|gogle ochronne/i, slug: 'akcesoria-1', label: 'Okulary BHP' },
  { patterns: /półmaska|maska.*filtrując|maseczka.*ochronna|respirator/i, slug: 'akcesoria-1', label: 'Ochrona twarzy' },
  { patterns: /ochronnik.*słuchu|wkładki.*przeciwhałasowe|nausznik/i, slug: 'akcesoria-1', label: 'Ochrona słuchu' },
  
  // Pakowanie i wysyłka 
  { patterns: /karton klapowy|karton.*fasonowy|pudełko.*kartonowe/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Kartony' },
  { patterns: /folia stretch|folia.*paletowa|rolka.*folii/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Folia stretch' },
  { patterns: /taśma pakowa|taśma.*klejąca.*pakow/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Taśmy pakowe' },
  { patterns: /koperta|foliopak.*kuriersk/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Koperty/foliopaki' },
  { patterns: /etykiet.*termiczn|etykiet.*samoprzyl/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Etykiety' },
  { patterns: /woreczki strunowe|toreb.*foliow/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Woreczki' },
  { patterns: /tuba kartonowa/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Tuba kartonowa' },
  
  // Biuro
  { patterns: /segregator|długopis|zszywacz|zszywki|spinacz|dziurkacz|nożyczki.*biurow/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Artykuły biurowe' },
  { patterns: /blok biurowy|notes|koszulk.*a4|teczka|obwolut/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Papiernicze' },
  { patterns: /papier.*a4|papier.*xero|papier.*kopiark/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Papier' },
  { patterns: /druk.*kp|druk.*kw|druk.*faktur|druk.*rachunk/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Druki' },
  { patterns: /rolka.*termiczn|rolka.*kasow|taśma.*kasow/i, slug: 'artykuly-szkolne-i-papiernicze', label: 'Rolki kasowe' },
  
  // Meble
  { patterns: /fotel biurowy|fotel obrotowy|podpórk.*plecy|podnóżek.*biurow/i, slug: 'wyposazenie-i-akcesoria', label: 'Meble biurowe' },
  { patterns: /krzesło.*biurow|krzesło.*konferencyjn/i, slug: 'wyposazenie-lokali', label: 'Krzesła' },
  { patterns: /sejf|szafka na klucze|kasa pancerna|kasetka/i, slug: 'zabezpieczenia', label: 'Sejfy' },
  { patterns: /mata.*ochronna.*krzesł/i, slug: 'wyposazenie-i-akcesoria', label: 'Maty biurowe' },
  
  // Chemia / Czystość
  { patterns: /płyn.*mycia|płyn.*zmywania|środek.*czyszcząc|domestos|ajax|cif/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Chemia gosp.' },
  { patterns: /proszek.*prania|kapsułki.*prania|płyn.*prania|odplamiac/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Środki do prania' },
  { patterns: /tabletki.*zmywar|sól.*zmywar|nabłyszczacz|płyn.*zmywar.*automat/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Zmywarka' },
  { patterns: /mydło|żel.*pod prysznic|szampon(?!.*psa|.*zwierz)/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Higiena' },
  { patterns: /odświeżacz|zapach.*dom/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Odświeżacze' },
  { patterns: /papier toaletowy|ręcznik.*papierow|chusteczk.*higien/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Papier toaletowy' },
  { patterns: /worki na śmieci|worek.*śmieci/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Worki na śmieci' },
  { patterns: /ścierka|ściereczk|gąbka.*zmywak|gąbki|drucia[kn]/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Ścierki' },
  { patterns: /kosz na śmieci|kosz.*segregacj/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Kosze' },
  { patterns: /miotła|zmiotka|szufelka|mop |wkład.*mop/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Miotły/mopy' },
  { patterns: /wiadro|wózek serwisowy/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Wiadra' },
  { patterns: /ściągaczka/i, slug: 'higiena-i-utrzymanie-czystosci', label: 'Ściągaczki' },
  { patterns: /chemia.*profesjonaln|preparat.*profession/i, slug: 'chemia-dla-gastronomii', label: 'Chemia prof.' },
  
  // Kuchnia / Gastronomia
  { patterns: /termos|kubek.*termiczn|bidon/i, slug: 'kuchnia', label: 'Termosy/bidony' },
  { patterns: /pojemnik.*spożywcz|lunch.*box|pojemnik.*na.*żywność/i, slug: 'kuchnia', label: 'Pojemniki kuchen.' },
  { patterns: /miska silikonowa|miska.*kuchenn/i, slug: 'kuchnia', label: 'Miski' },
  { patterns: /talerz|sztucce|widelec|łyżka|nóż.*kuchenn/i, slug: 'kuchnia', label: 'Naczynia' },
  
  // Elektronika
  { patterns: /suszarka do włosów|suszarka.*hair/i, slug: 'sprzet-agd', label: 'Suszarki' },
  { patterns: /odkurzacz|robot.*sprzątaj/i, slug: 'sprzet-agd', label: 'Odkurzacze' },
  { patterns: /żelazko|prasownic/i, slug: 'sprzet-agd', label: 'Żelazka' },
  { patterns: /czajnik|zaparzacz|kawiark/i, slug: 'sprzet-agd', label: 'AGD kuchenne' },
  { patterns: /waga.*kuchenn|waga.*elektron.*kuch/i, slug: 'wagi-kuchenne', label: 'Wagi kuchenne' },
  { patterns: /waga.*magazynow|waga.*przemysłow|waga.*handlow|waga.*platfor/i, slug: 'wagi-przemyslowe', label: 'Wagi przemysłowe' },
  { patterns: /lampa.*led|żarówka|oświetleni/i, slug: 'oswietlenie-domowe', label: 'Oświetlenie' },
  { patterns: /słuchawki|głośnik.*bluetooth/i, slug: 'audio-sluchawki-i-glosniki', label: 'Audio' },
  { patterns: /etui.*telefon|case.*iphone|pokrowiec.*telefon/i, slug: 'na-telefon', label: 'Etui na telefon' },
  { patterns: /folia.*ochronna.*telefon|szkło.*ochronne.*telefon/i, slug: 'do-telefonow', label: 'Folie na telefon' },
  { patterns: /ładowarka|zasilacz|power.*bank|kabel.*usb/i, slug: 'zasilacze-i-ladowarki', label: 'Ładowanie' },
  { patterns: /karta pamięci|pendrive|dysk.*zewn/i, slug: 'komputery-i-akcesoria', label: 'IT akcesoria' },
  
  // Narzędzia
  { patterns: /klej.*montażow|klej.*sekund|klej.*wikol/i, slug: 'akcesoria-1', label: 'Kleje' },
  { patterns: /taśma.*izolacyjn|taśma.*elektr/i, slug: 'narzedzia-reczne', label: 'Taśmy izolacyjne' },
  { patterns: /taśma.*montażow|taśma.*dwustronn/i, slug: 'narzedzia-reczne', label: 'Taśmy montażowe' },
  { patterns: /miara|poziomica|suwmiar|miernik/i, slug: 'narzedzia-reczne', label: 'Przyrządy pomiar.' },
  
  // Ogród / Zwierzęta
  { patterns: /happs|karma.*psa|karma.*kota|obroża.*pchł|szampon.*psa|szampon.*zwierz/i, slug: 'artykuly-dla-zwierzat', label: 'Zwierzęta' },
  { patterns: /bros |expel |mrówko|prusakolep|lep na |spray.*komary|spray.*kleszcze|pułapka na mole/i, slug: 'ogrod-i-narzedzia-ogrodowe', label: 'Środki na owady' },
  
  // Sport
  { patterns: /namiot|śpiwór|karimat|kemping|przebieralnia|prysznic.*camp|prysznic.*kempin/i, slug: 'kemping-i-przetrwanie', label: 'Kemping' },
  { patterns: /rower |hulajnog|kask.*rowerow/i, slug: 'rowery-i-akcesoria', label: 'Rowery' },
  
  // Zabawki
  { patterns: /lego |lego$|klocki.*lego/i, slug: 'zabawki', label: 'LEGO' },
  { patterns: /zabawka|lalka|maskotka|pluszak|figurka.*zabaw/i, slug: 'zabawki', label: 'Zabawki' },
  { patterns: /gra planszowa|puzzle|układanka/i, slug: 'gry-edukacyjne-i-planszowe', label: 'Gry planszowe' },
  
  // Energia
  { patterns: /pellet|brykiet|węgiel|drewno.*opał|rozpałka|podpałka/i, slug: 'energia-i-ogrzewanie', label: 'Opał' },
  
  // Outlet
  { patterns: /outlet/i, slug: 'outlet', label: 'Outlet' },
];

// Główna klasyfikacja
function classifyByName(name: string): { slug: string; label: string } | null {
  for (const rule of NAME_RULES) {
    if (rule.patterns.test(name)) {
      return { slug: rule.slug, label: rule.label };
    }
  }
  return null;
}

// Parse XML to build name+EAN maps for existing matching
function loadXmlNames(): Set<string> {
  const raw = fs.readFileSync(path.resolve(__dirname, '../../data/mamezi-feed.xml'), 'utf-8');
  const names = new Set<string>();
  const re = /<name><!\[CDATA\[(.*?)\]\]><\/name>/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    names.add(m[1].toLowerCase().trim());
  }
  return names;
}

async function main() {
  if (!API_TOKEN) { console.error('❌ Brak BASELINKER_API_TOKEN'); process.exit(1); }
  
  console.log('🔧 Przypisywanie kategorii niedopasowanym produktom (po słowach kluczowych)');
  console.log(dryRun ? '🔍 DRY-RUN\n' : '🚀 PRODUKCJA\n');
  if (forceReassign) console.log('⚡ FORCE: nadpisywanie istniejących\n');
  
  const xmlNames = loadXmlNames();
  console.log(`XML: ${xmlNames.size} nazw produktów`);
  
  // Pobierz slug → BL cat ID
  const dbCategories = await prisma.category.findMany({
    where: { baselinkerCategoryId: { not: null } },
    select: { slug: true, baselinkerCategoryId: true },
  });
  const slugToBlCatId = new Map<string, number>();
  for (const cat of dbCategories) {
    if (cat.baselinkerCategoryId) {
      slugToBlCatId.set(cat.slug, parseInt(cat.baselinkerCategoryId, 10));
    }
  }
  
  // Pobierz produkty
  let page = 1, hasMore = true;
  const allIds: number[] = [];
  while (hasMore) {
    const resp = await blRequest('getInventoryProductsList', { inventory_id: DOFIRMY_INV_ID, page });
    const products = resp.products || {};
    allIds.push(...Object.keys(products).map(Number));
    hasMore = Object.keys(products).length === 1000;
    page++;
  }
  console.log(`BL: ${allIds.length} produktów\n`);
  
  interface Assignment {
    productId: number;
    name: string;
    targetSlug: string;
    targetBlCatId: number;
    label: string;
  }
  
  const assignments: Assignment[] = [];
  let skippedInXml = 0;
  let skippedHasCat = 0;
  let noMatch = 0;
  const noMatchNames: string[] = [];
  
  for (let i = 0; i < allIds.length; i += 1000) {
    const batch = allIds.slice(i, i + 1000);
    const resp = await blRequest('getInventoryProductsData', {
      inventory_id: DOFIRMY_INV_ID,
      products: batch,
    });
    
    for (const [id, data] of Object.entries(resp.products || {}) as [string, any][]) {
      const name = (data.text_fields?.name || '').trim();
      const catId = data.category_id || 0;
      
      // Pomiń już obsłużone przez XML (główny skrypt)
      if (xmlNames.has(name.toLowerCase().trim())) { skippedInXml++; continue; }
      
      // Pomiń już skategoryzowane (chyba że force)
      if (catId > 0 && !forceReassign) { skippedHasCat++; continue; }
      
      // Klasyfikuj po nazwie
      const classification = classifyByName(name);
      if (!classification) {
        noMatch++;
        if (noMatchNames.length < 100) noMatchNames.push(name);
        continue;
      }
      
      const blCatId = slugToBlCatId.get(classification.slug);
      if (!blCatId) {
        console.log(`⚠️ Brak BL ID dla: ${classification.slug}`);
        continue;
      }
      
      assignments.push({
        productId: parseInt(id),
        name,
        targetSlug: classification.slug,
        targetBlCatId: blCatId,
        label: classification.label,
      });
    }
    await sleep(300);
  }
  
  // Podsumowanie
  console.log('='.repeat(60));
  console.log('📊 WYNIKI KLASYFIKACJI PO NAZWACH');
  console.log('='.repeat(60));
  console.log(`W XML (już obsłużone):  ${skippedInXml}`);
  console.log(`Już z kategorią:        ${skippedHasCat}`);
  console.log(`Sklasyfikowane:         ${assignments.length}`);
  console.log(`Bez dopasowania:        ${noMatch}`);
  
  // Rozkład
  const slugCounts = new Map<string, { count: number; label: string }>();
  for (const a of assignments) {
    const key = a.targetSlug;
    const existing = slugCounts.get(key) || { count: 0, label: a.label };
    existing.count++;
    slugCounts.set(key, existing);
  }
  console.log('\n📂 Rozkład:');
  for (const [slug, info] of [...slugCounts.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${slug}: ${info.count} prod. (${info.label}) → BL cat_id ${slugToBlCatId.get(slug)}`);
  }
  
  // Przykłady
  console.log('\n📝 Przykłady przypisań (max 20):');
  for (const a of assignments.slice(0, 20)) {
    console.log(`  "${a.name.substring(0, 55)}" → ${a.targetSlug} (${a.label})`);
  }
  
  // Niedopasowane
  if (noMatchNames.length > 0) {
    console.log(`\n❓ Niedopasowane (${noMatch} prod., max 30):`);
    for (const n of noMatchNames.slice(0, 30)) {
      console.log(`  "${n.substring(0, 80)}"`);
    }
  }
  
  if (dryRun) {
    console.log('\n🔍 DRY-RUN. Uruchom bez --dry-run żeby przypisać.');
    await prisma.$disconnect();
    return;
  }
  
  // Przypisywanie
  console.log(`\n🚀 Przypisuję (${assignments.length} prod.)...`);
  let success = 0, errors = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    try {
      await blRequest('addInventoryProduct', {
        inventory_id: DOFIRMY_INV_ID,
        product_id: a.productId,
        category_id: a.targetBlCatId,
      });
      success++;
    } catch (err: any) {
      errors++;
      if (errors <= 10) console.log(`   ❌ ID:${a.productId}: ${err.message}`);
    }
    
    if ((i + 1) % 100 === 0 || i === assignments.length - 1) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = Math.round(success / (elapsed || 1) * 60);
      console.log(`   [${i + 1}/${assignments.length}] ✅ ${success} | ❌ ${errors} | ${rate}/min | Req: ${requestCount}`);
    }
    
    await sleep(100);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ GOTOWE: ${success} przypisanych, ${errors} błędów`);
  console.log('='.repeat(60));
  
  await prisma.$disconnect();
}

main().catch(console.error);
