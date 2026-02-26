import { FAQ_DATA } from './faqData';

const BOT_NAME = 'WuBuś';

const POLISH_MAP: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
};

export function normalizePolish(text: string): string {
  return text.replace(/[ąćęłńóśźż]/g, (ch) => POLISH_MAP[ch] || ch);
}

/**
 * Levenshtein distance — minimal edits (insert/delete/replace) to transform a→b.
 * Used for fuzzy keyword matching (typo tolerance).
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // Early exits
  if (m === 0) return n;
  if (n === 0) return m;

  // Single-row DP (space-optimised)
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // delete
        curr[j - 1] + 1,  // insert
        prev[j - 1] + cost // replace
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Check if `word` is a fuzzy match for `keyword`.
 * Rules: word must be >= 4 chars, distance <= 2 AND < 40% of word length.
 */
function isFuzzyMatch(word: string, keyword: string): boolean {
  if (word.length < 4) return false;
  const dist = levenshtein(word, keyword);
  return dist <= 2 && dist < word.length * 0.4;
}

/**
 * Synonym / abbreviation map.
 * Short forms and common misspellings are expanded before matching.
 */
const SYNONYMS: Record<string, string> = {
  // Abbreviations
  'zw': 'zwrot',
  'zam': 'zamowienie',
  'pw': 'powiadomienie',
  'rek': 'reklamacja',
  'dost': 'dostawa',
  'info': 'informacja',
  // Plural / inflected forms → base
  'koszty': 'koszt',
  'zamowienia': 'zamowienie',
  'zwroty': 'zwrot',
  'platnosci': 'platnosc',
  'reklamacje': 'reklamacja',
  'dostawy': 'dostawa',
  'kupony': 'kupon',
  'produkty': 'produkt',
};

/**
 * Expand synonyms / abbreviations in the query.
 * Each word is checked against the SYNONYMS map (after Polish normalisation)
 * and replaced with its canonical form if found.
 */
export function expandSynonyms(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => {
      const norm = normalizePolish(w.toLowerCase());
      return SYNONYMS[norm] ?? w;
    })
    .join(' ');
}

const POLITE_RESPONSES: { patterns: string[]; replies: string[] }[] = [
  {
    patterns: ['dziękuję', 'dziekuje', 'dzięki', 'dzieki', 'dzięks', 'thanks', 'thx', 'wielkie dzięki', 'super dzięki', 'dziękuje bardzo', 'dziekuje bardzo', 'bardzo dziękuję'],
    replies: [
      'Nie ma za co! 😊 Cieszę się, że mogłem pomóc. Gdybyś miał jeszcze pytania — pisz śmiało!',
      'Proszę bardzo! 🙌 Zawsze chętnie pomogę. Miłych zakupów w WBTrade!',
      'Cała przyjemność po mojej stronie! 😄 Jeśli coś jeszcze — jestem tutaj.',
      'Nie ma sprawy! ✨ Życzę udanych zakupów!',
    ],
  },
  {
    patterns: ['miłego dnia', 'milego dnia', 'dobrego dnia', 'miłego wieczoru', 'dobrej nocy', 'dobranoc', 'do widzenia', 'pa pa', 'papa', 'nara', 'cześć', 'hej hej', 'trzymaj się', 'do zobaczenia', 'bye'],
    replies: [
      'Miłego dnia! ☀️ Do zobaczenia w WBTrade!',
      'Nawzajem! 😊 Życzę Ci świetnego dnia i udanych zakupów!',
      'Do zobaczenia! 👋 Gdybyś potrzebował pomocy — zawsze tu jestem!',
      'Trzymaj się ciepło! 🌟 Wpadaj do nas kiedy chcesz!',
    ],
  },
  {
    patterns: ['super', 'świetnie', 'extra', 'ekstra', 'bomba', 'git', 'top', 'zajebiste', 'kozak', 'pięknie', 'rewelacja', 'idealnie', 'genialnie', 'wspaniale'],
    replies: [
      'Cieszę się! 🎉 Jeśli potrzebujesz czegoś jeszcze — pytaj!',
      'Super, że mogłem pomóc! 💪 Miłych zakupów!',
      'To miło słyszeć! 😊 Jestem tu, gdybyś potrzebował pomocy.',
    ],
  },
  {
    patterns: ['hej', 'hejka', 'siema', 'elo', 'yo', 'witam', 'witaj', 'cześć', 'czesc', 'dzień dobry', 'dzien dobry', 'dobry wieczór', 'hello', 'hi'],
    replies: [
      `Hej! 👋 Jestem ${BOT_NAME}. W czym mogę Ci dzisiaj pomóc?`,
      `Cześć! 😊 Jestem ${BOT_NAME}, Twój asystent WBTrade. Zadaj mi pytanie!`,
      `Witaj! 🙌 Jak mogę Ci pomóc? Pytaj o zamówienia, dostawę, kupony i więcej!`,
    ],
  },
  {
    patterns: ['ok', 'okej', 'okay', 'dobra', 'jasne', 'rozumiem', 'zrozumiałem', 'spoko', 'w porządku', 'no dobra'],
    replies: [
      'Jasne! 👍 Gdybyś miał jeszcze pytania — pisz śmiało!',
      'Okej! 😊 Jestem tu, jeśli będziesz potrzebować pomocy.',
      'Super! Jeśli coś jeszcze — pytaj bez wahania! 💬',
    ],
  },
];

export function findBestAnswer(query: string): string | null {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return null;

  // Check polite phrases first
  for (const group of POLITE_RESPONSES) {
    for (const pattern of group.patterns) {
      if (q === pattern || q.includes(pattern)) {
        return group.replies[Math.floor(Math.random() * group.replies.length)];
      }
    }
  }

  // Expand synonyms / abbreviations before scoring
  const qExpanded = expandSynonyms(q);

  // Score each FAQ by keyword match
  let bestScore = 0;
  let bestAnswer: typeof FAQ_DATA[0] | null = null;

  const qNorm = normalizePolish(qExpanded);

  for (const faq of FAQ_DATA) {
    let score = 0;
    let matchedKeywords = 0;
    const words = qExpanded.split(/\s+/);
    const wordsNorm = qNorm.split(/\s+/);

    for (const keyword of faq.keywords) {
      const kw = keyword.toLowerCase();
      const kwNorm = normalizePolish(kw);
      let keywordMatched = false;

      // Exact keyword in query (original — higher weight)
      if (qExpanded.includes(kw)) {
        score += kw.length * 3;
        keywordMatched = true;
      } else if (qNorm.includes(kwNorm)) {
        // Normalized match — slightly lower weight
        score += kwNorm.length * 2.5;
        keywordMatched = true;
      }

      // Individual words overlap (exact → normalized → fuzzy)
      const kwWords = kw.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const wN = wordsNorm[i];
        if (w.length >= 3) {
          if (kw.includes(w)) {
            score += w.length;
            keywordMatched = true;
          } else if (kwNorm.includes(wN)) {
            score += wN.length * 0.8;
            keywordMatched = true;
          } else if (w.length >= 4) {
            // Fuzzy matching — check each keyword word individually
            for (const kwPart of kwWords) {
              if (isFuzzyMatch(wN, normalizePolish(kwPart))) {
                score += w.length * 0.7;
                keywordMatched = true;
                break; // one fuzzy match per query word per keyword
              }
            }
          }
        }
      }

      if (keywordMatched) matchedKeywords++;
    }

    // Contextual bonus: if >50% of FAQ keywords matched → bonus +10
    if (faq.keywords.length > 0 && matchedKeywords / faq.keywords.length > 0.5) {
      score += 10;
    }

    // Bonus for question text match
    if (faq.question.toLowerCase().includes(qExpanded)) {
      score += 20;
    } else if (normalizePolish(faq.question.toLowerCase()).includes(qNorm)) {
      score += 16;
    }

    if (score > bestScore) {
      bestScore = score;
      bestAnswer = faq;
    }
  }

  if (bestScore >= 8 && bestAnswer) {
    return bestAnswer.answer;
  }

  return null;
}
