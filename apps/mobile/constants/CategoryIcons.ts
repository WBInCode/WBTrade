/**
 * Category Icons - maps category slugs/names to custom PNG icons
 * PNGs rendered at 1024x1024 from SVG sources in /Ikony na aplikację/
 *
 * SVG filename → category name → slug:
 *   Dla Dziecka.svg     → "Dla dziecka"         → dla-dziecka
 *   Dom.svg             → "Dom"                  → dom
 *   Elektronika i GSM   → "Elektronika i GSM"    → elektronika-i-gsm
 *   Gastronomia.svg     → "Gastronomia"          → gastronomia
 *   Moda i Zdrowie.svg  → "Moda i Zdrowie"       → moda-i-zdrowie
 *   Motoryzacja.svg     → "Motoryzacja"          → motoryzacja
 *   Narzędzia.svg       → "Narzędzia"            → narzedzia
 *   Ogrodnictwo.svg     → "Ogrodnictwo"          → ogrodnictwo
 *   Outlet.svg          → "Outlet"               → outlet
 *   Sport i turystyka   → "Sport i turystyka"    → sport-i-turystyka
 *   Wagi.svg            → "Wagi"                 → wagi
 *   Chemia Profesjonalna.svg → "Chemia profesjonalna" → chemia-profesjonalna
 */
import { ImageSourcePropType } from 'react-native';

// Icon assets
const ICONS = {
  dlaDziecka: require('../assets/images/categories/dla-dziecka.png'),
  dom: require('../assets/images/categories/dom.png'),
  elektronika: require('../assets/images/categories/elektronika-i-gsm.png'),
  gastronomia: require('../assets/images/categories/gastronomia.png'),
  moda: require('../assets/images/categories/moda-i-zdrowie.png'),
  motoryzacja: require('../assets/images/categories/motoryzacja.png'),
  narzedzia: require('../assets/images/categories/narzedzia.png'),
  ogrodnictwo: require('../assets/images/categories/ogrodnictwo.png'),
  outlet: require('../assets/images/categories/outlet.png'),
  sport: require('../assets/images/categories/sport-i-turystyka.png'),
  wagi: require('../assets/images/categories/wagi.png'),
  chemiaProfesjonalna: require('../assets/images/categories/chemia-profesjonalna.png'),
};

const DEFAULT_ICON = ICONS.outlet;

// Exact slug → icon mapping (highest priority)
const SLUG_MAP: Record<string, ImageSourcePropType> = {
  'dla-dziecka': ICONS.dlaDziecka,
  'dom': ICONS.dom,
  'dom-i-ogrod': ICONS.dom,
  'elektronika': ICONS.elektronika,
  'elektronika-i-gsm': ICONS.elektronika,
  'gastronomia': ICONS.gastronomia,
  'moda': ICONS.moda,
  'moda-i-zdrowie': ICONS.moda,
  'motoryzacja': ICONS.motoryzacja,
  'narzedzia': ICONS.narzedzia,
  'ogrodnictwo': ICONS.ogrodnictwo,
  'outlet': ICONS.outlet,
  'sport': ICONS.sport,
  'sport-i-turystyka': ICONS.sport,
  // common aliases
  'dziecko': ICONS.dlaDziecka,
  'zdrowie': ICONS.moda,
  'uroda': ICONS.moda,
  'ogrod': ICONS.ogrodnictwo,
  'narzedzia-i-warsztat': ICONS.narzedzia,
  'wagi': ICONS.wagi,
  'chemia-profesjonalna': ICONS.chemiaProfesjonalna,
  'chemia': ICONS.chemiaProfesjonalna,
};

// Keyword → icon (fallback for partial matching)
const KEYWORD_MAP: Array<[string, ImageSourcePropType]> = [
  ['dziec', ICONS.dlaDziecka],     // "dla-dziecka", "dziecko", "dziecka"
  ['elektron', ICONS.elektronika], // "elektronika", "elektronika-i-gsm"
  ['gsm', ICONS.elektronika],
  ['gastronom', ICONS.gastronomia],
  ['motor', ICONS.motoryzacja],
  ['samochod', ICONS.motoryzacja],
  ['narz', ICONS.narzedzia],       // "narzedzia", "narzędzia"
  ['warsztat', ICONS.narzedzia],
  ['ogrod', ICONS.ogrodnictwo],    // "ogrodnictwo", "ogrod", "dom-i-ogrod"
  ['moda', ICONS.moda],
  ['zdrow', ICONS.moda],           // "zdrowie", "moda-i-zdrowie"
  ['urod', ICONS.moda],
  ['sport', ICONS.sport],
  ['turyst', ICONS.sport],
  ['outlet', ICONS.outlet],
  ['dom', ICONS.dom],              // keep "dom" AFTER "ogrod" so "dom-i-ogrod" matches ogrod first
  ['wag', ICONS.wagi],             // "wagi", "waga"
  ['chemia', ICONS.chemiaProfesjonalna], // "chemia-profesjonalna"
];

/**
 * Get category icon for a given slug.
 * Tries exact match first, then keyword-based fallback.
 */
export function getCategoryIcon(slug?: string): ImageSourcePropType {
  if (!slug) return DEFAULT_ICON;
  const s = slug.toLowerCase();

  // 1. Exact slug match
  if (SLUG_MAP[s]) return SLUG_MAP[s];

  // 2. Keyword match
  for (const [keyword, icon] of KEYWORD_MAP) {
    if (s.includes(keyword)) return icon;
  }

  return DEFAULT_ICON;
}
