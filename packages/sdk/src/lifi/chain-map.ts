/**
 * ChainMap — pure mapping module for chain name → chain ID resolution.
 *
 * Lookups are case-insensitive via `name.toLowerCase()`.
 */

export type ChainResolution =
  | { ok: true; chainId: number }
  | { ok: false; reason: string };

/** Default chain name → chain ID mappings. */
const CHAIN_MAP: Record<string, number> = {
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  polygon: 137,
};

/**
 * Resolve a human-readable chain name to its numeric chain ID.
 *
 * @param name - Chain name (case-insensitive), e.g. "Arbitrum", "OPTIMISM"
 * @returns A discriminated union: `{ ok: true, chainId }` on success,
 *          `{ ok: false, reason }` when the chain is not supported.
 */
export function resolveChain(name: string): ChainResolution {
  const chainId = CHAIN_MAP[name.toLowerCase()];
  if (chainId !== undefined) {
    return { ok: true, chainId };
  }
  return { ok: false, reason: `Unsupported chain: ${name}` };
}

/**
 * Return a copy of the supported chain mappings.
 *
 * @returns A new `Record<string, number>` with all supported chain entries.
 */
export function getSupportedChains(): Record<string, number> {
  return { ...CHAIN_MAP };
}
