/**
 * TokenMap — pure mapping module for token symbol → address resolution.
 *
 * Lookups are case-insensitive via `symbol.toUpperCase()`.
 */

export interface TokenInfo {
  address: string;
  decimals: number;
}

export type TokenResolution =
  | { ok: true; token: TokenInfo }
  | { ok: false; reason: string };

/** Default token mappings per chain ID. Keyed by chain ID → uppercase symbol → TokenInfo. */
const TOKEN_MAP: Record<number, Record<string, TokenInfo>> = {
  // Arbitrum
  42161: {
    USDC: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  },
  // Optimism
  10: {
    USDC: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  },
  // Base
  8453: {
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  },
  // Polygon
  137: {
    USDC: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
    WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  },
};

/**
 * Resolve a token symbol on a given chain to its on-chain address and decimal count.
 *
 * @param chainId - Numeric chain ID (e.g. 42161 for Arbitrum)
 * @param symbol  - Token symbol (case-insensitive), e.g. "usdc", "WETH"
 * @returns A discriminated union: `{ ok: true, token }` on success,
 *          `{ ok: false, reason }` when the token is not supported on the chain.
 */
export function resolveToken(chainId: number, symbol: string): TokenResolution {
  const chainTokens = TOKEN_MAP[chainId];
  if (chainTokens === undefined) {
    return { ok: false, reason: `Unsupported chain ID: ${chainId}` };
  }
  const token = chainTokens[symbol.toUpperCase()];
  if (token !== undefined) {
    return { ok: true, token };
  }
  return { ok: false, reason: `Unsupported token "${symbol}" on chain ${chainId}` };
}

/**
 * Return a copy of the token mappings for a given chain.
 *
 * @param chainId - Numeric chain ID
 * @returns A new `Record<string, TokenInfo>` with all supported token entries for the chain,
 *          or an empty object if the chain is not supported.
 */
export function getSupportedTokens(chainId: number): Record<string, TokenInfo> {
  const chainTokens = TOKEN_MAP[chainId];
  if (chainTokens === undefined) {
    return {};
  }
  // Return a shallow copy so callers cannot mutate the internal map
  const copy: Record<string, TokenInfo> = {};
  for (const [symbol, info] of Object.entries(chainTokens)) {
    copy[symbol] = { ...info };
  }
  return copy;
}
