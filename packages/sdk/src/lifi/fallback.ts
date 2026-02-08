/**
 * FallbackProvider — generates estimated quotes, routes, and statuses when
 * the LI.FI SDK is unavailable or returns errors.
 *
 * Ported from `apps/dashboard/src/lib/lifi.ts` for reuse across the SDK.
 *
 * @module
 */

import type { IntentParams } from '../types.js';
import type { LifiFallback, LifiQuotePayload, LifiRoutePayload, LifiStatusPayload } from './types.js';
import { resolveChain } from './chain-map.js';

/**
 * Static exchange rates used when the LI.FI SDK is unavailable.
 * Keys are formatted as `TOKENA:TOKENB` (upper-case).
 */
export const FALLBACK_RATES: Record<string, number> = {
  'USDC:WETH': 0.0004,
  'USDC:ETH': 0.0004,
  'ETH:USDC': 2500,
  'WETH:USDC': 2500,
  'ETH:WETH': 1,
  'WETH:ETH': 1,
};

/**
 * Produce a deterministic, human-readable ID from a seed string using the
 * DJB2 hash algorithm.
 *
 * The result has the form `JK-LIFI-{hash}` where `{hash}` is the unsigned
 * 32-bit DJB2 value encoded in upper-case base-36.
 *
 * @param seed - Arbitrary string to hash
 * @returns A deterministic ID of the form `JK-LIFI-[A-Z0-9]+`
 */
export function deterministicId(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return `JK-LIFI-${(hash >>> 0).toString(36).toUpperCase()}`;
}

/**
 * Build a fallback quote payload when the LI.FI SDK is unavailable.
 *
 * Uses static exchange rates from {@link FALLBACK_RATES} to estimate the
 * output amount. If the token pair is not in the static table the rate
 * defaults to `1`.
 *
 * @param params - The original intent parameters
 * @param reason - Fallback metadata describing why the fallback was triggered
 * @returns A complete {@link LifiQuotePayload} with `provider: 'fallback'`
 */
export function buildFallbackQuote(
  params: IntentParams,
  reason: LifiFallback,
): LifiQuotePayload {
  const fromChainRes = resolveChain(params.sourceChain ?? '');
  const toChainRes = resolveChain(params.destinationChain ?? '');
  const fromChainId = fromChainRes.ok ? fromChainRes.chainId : 0;
  const toChainId = toChainRes.ok ? toChainRes.chainId : 0;

  const rateKey = `${params.tokenIn}:${params.tokenOut}`.toUpperCase();
  const rate = FALLBACK_RATES[rateKey] ?? 1;

  const amountInNum = Number(params.amountIn || '0');
  const amountOut = Number.isFinite(amountInNum)
    ? (amountInNum * rate).toFixed(6)
    : params.amountIn;

  const seed = `${params.sourceChain}-${params.destinationChain}-${params.tokenIn}-${params.tokenOut}-${params.amountIn}`;

  return {
    provider: 'fallback',
    routeId: deterministicId(seed),
    timestamp: Date.now(),
    quote: {
      amountIn: params.amountIn,
      amountOut,
      minAmountOut: params.minAmountOut,
      fromChainId,
      toChainId,
      fromToken: params.tokenIn,
      toToken: params.tokenOut,
      estimatedGasUsd: '0',
    },
    fallback: reason,
  };
}

/**
 * Build a fallback route payload when the LI.FI SDK is unavailable.
 *
 * The route payload contains no execution steps but preserves the chain and
 * token metadata so callers can still display useful information.
 *
 * @param params - The original intent parameters
 * @param reason - Fallback metadata describing why the fallback was triggered
 * @returns A complete {@link LifiRoutePayload} with `provider: 'fallback'`
 */
export function buildFallbackRoute(
  params: IntentParams,
  reason: LifiFallback,
): LifiRoutePayload {
  const fromChainRes = resolveChain(params.sourceChain ?? '');
  const toChainRes = resolveChain(params.destinationChain ?? '');
  const fromChainId = fromChainRes.ok ? fromChainRes.chainId : 0;
  const toChainId = toChainRes.ok ? toChainRes.chainId : 0;

  const seed = `${params.sourceChain}-${params.destinationChain}-${params.tokenIn}-${params.tokenOut}-${params.amountIn}`;

  return {
    provider: 'fallback',
    routeId: deterministicId(seed),
    timestamp: Date.now(),
    route: {
      fromChainId,
      toChainId,
      fromToken: params.tokenIn,
      toToken: params.tokenOut,
      steps: [],
      tags: [],
    },
    fallback: reason,
  };
}

/**
 * Build a fallback status payload when the LI.FI SDK is unavailable.
 *
 * @param txHash  - The transaction hash being queried (may be `undefined`)
 * @param reason  - Fallback metadata describing why the fallback was triggered
 * @returns A complete {@link LifiStatusPayload} with `provider: 'fallback'`
 */
export function buildFallbackStatus(
  txHash: string | undefined,
  reason: LifiFallback,
): LifiStatusPayload {
  return {
    provider: 'fallback',
    timestamp: Date.now(),
    status: {
      state: txHash ? 'UNKNOWN' : 'NOT_AVAILABLE',
      txHash,
    },
    fallback: reason,
  };
}
