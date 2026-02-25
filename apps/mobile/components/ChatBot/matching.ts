import { FAQ_DATA } from './faqData';

const BOT_NAME = 'WuBuś';

const POLISH_MAP: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
};

export function normalizePolish(text: string): string {
  return text.replace(/[ąćęłńóśźż]/g, (ch) => POLISH_MAP[ch] || ch);
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

  // Score each FAQ by keyword match
  let bestScore = 0;
  let bestAnswer: typeof FAQ_DATA[0] | null = null;

  const qNorm = normalizePolish(q);

  for (const faq of FAQ_DATA) {
    let score = 0;
    const words = q.split(/\s+/);
    const wordsNorm = qNorm.split(/\s+/);

    for (const keyword of faq.keywords) {
      const kw = keyword.toLowerCase();
      const kwNorm = normalizePolish(kw);

      // Exact keyword in query (original — higher weight)
      if (q.includes(kw)) {
        score += kw.length * 3;
      } else if (qNorm.includes(kwNorm)) {
        // Normalized match — slightly lower weight
        score += kwNorm.length * 2.5;
      }

      // Individual words overlap
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const wN = wordsNorm[i];
        if (w.length >= 3) {
          if (kw.includes(w)) {
            score += w.length;
          } else if (kwNorm.includes(wN)) {
            score += wN.length * 0.8;
          }
        }
      }
    }

    // Bonus for question text match
    if (faq.question.toLowerCase().includes(q)) {
      score += 20;
    } else if (normalizePolish(faq.question.toLowerCase()).includes(qNorm)) {
      score += 16;
    }

    if (score > bestScore) {
      bestScore = score;
      bestAnswer = faq;
    }
  }

  if (bestScore >= 6 && bestAnswer) {
    return bestAnswer.answer;
  }

  return null;
}
