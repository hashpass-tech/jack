/**
 * Unit conversion utilities for converting between human-readable token amounts
 * and base unit (wei-like) representations.
 *
 * Ported from apps/dashboard/src/lib/lifi.ts for reuse across the SDK.
 */

/**
 * Converts a human-readable token amount to its base unit representation.
 *
 * For example, converting "1.5" USDC (6 decimals) produces "1500000",
 * and converting "1.5" ETH (18 decimals) produces "1500000000000000000".
 *
 * @param amount - The human-readable amount as a string (e.g. "1.5", "100", "0.001")
 * @param decimals - The number of decimal places for the token
 * @returns The amount in base units as a string with no decimal point
 */
export function toBaseUnits(amount: string, decimals: number): string {
  const [whole = '0', fraction = ''] = amount.split('.');
  const normalizedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = `${whole}${normalizedFraction}`;
  
  // Remove leading zeros without using regex to avoid ReDoS vulnerability
  let start = 0;
  while (start < combined.length - 1 && combined[start] === '0') {
    start++;
  }
  const base = combined.slice(start);
  
  return base.length ? base : '0';
}

/**
 * Converts a base unit amount back to a human-readable representation.
 *
 * For example, converting "1500000" with 6 decimals produces "1.5",
 * and converting "1500000000000000000" with 18 decimals produces "1.5".
 *
 * @param amount - The base unit amount as a string (e.g. "1500000", "1000000000000000000")
 * @param decimals - The number of decimal places for the token
 * @returns The human-readable amount as a string with trailing zeros removed
 */
export function fromBaseUnits(amount: string, decimals: number): string {
  if (!amount || amount === '0') return '0';
  const padded = amount.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals) || '0';
  
  // Remove trailing zeros without using regex to avoid ReDoS vulnerability
  let fraction = padded.slice(-decimals);
  let end = fraction.length;
  while (end > 0 && fraction[end - 1] === '0') {
    end--;
  }
  fraction = fraction.slice(0, end);
  
  return fraction ? `${whole}.${fraction}` : whole;
}
