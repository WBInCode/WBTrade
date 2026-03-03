/**
 * Polish pluralization helper.
 *
 * Polish has 3 forms:
 * - singular: 1 produkt, 1 opinia
 * - plural-few (2-4, 22-24, 32-34...): produkty, opinie
 * - plural-many (0, 5-21, 25-31...): produktów, opinii
 *
 * Rule: use "few" when last digit is 2-4 AND tens digit is NOT 1.
 */
export function pluralize(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const abs = Math.abs(count);
  if (abs === 1) return `${count} ${one}`;

  const lastDigit = abs % 10;
  const lastTwoDigits = abs % 100;

  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return `${count} ${few}`;
  }

  return `${count} ${many}`;
}

/** Common shorthands */
export const pluralizeProducts = (count: number) =>
  pluralize(count, 'produkt', 'produkty', 'produktów');

export const pluralizeReviews = (count: number) =>
  pluralize(count, 'opinia', 'opinie', 'opinii');
