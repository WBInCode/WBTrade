/**
 * Currency utility functions for handling Polish złoty (PLN)
 * Handles floating-point precision issues when working with money
 */

/**
 * Round a monetary value to 2 decimal places
 * Uses Math.round to avoid floating-point precision issues
 * Example: 123.456789 -> 123.46, 0.1 + 0.2 = 0.30000000000000004 -> 0.30
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format a price for display in PLN
 * Rounds to 2 decimal places and replaces dot with comma (Polish format)
 */
export function formatPrice(value: number): string {
  return roundMoney(value).toFixed(2).replace('.', ',');
}

/**
 * Format a price with currency suffix
 */
export function formatPriceWithCurrency(value: number): string {
  return `${formatPrice(value)} zł`;
}

/**
 * Safely add multiple monetary values
 * Avoids floating-point precision issues by converting to cents first
 */
export function addMoney(...values: number[]): number {
  const sumInCents = values.reduce((sum, val) => sum + Math.round(val * 100), 0);
  return sumInCents / 100;
}

/**
 * Safely subtract monetary values
 */
export function subtractMoney(a: number, b: number): number {
  return (Math.round(a * 100) - Math.round(b * 100)) / 100;
}

/**
 * Safely multiply a monetary value
 */
export function multiplyMoney(value: number, multiplier: number): number {
  return Math.round(value * multiplier * 100) / 100;
}
