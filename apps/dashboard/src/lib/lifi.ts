/**
 * LI.FI integration — thin wrapper around the SDK-level LifiProvider.
 *
 * Preserves the same export signatures so dashboard consumers don't need changes.
 */

import { LifiProvider, resolveChain, resolveToken, toBaseUnits } from '@jack-kernel/sdk';
import type {
  IntentParams,
  LifiQuotePayload,
  LifiRoutePayload,
  LifiStatusPayload,
  LifiReasonCode,
  LifiFallback,
} from '@jack-kernel/sdk';

// Re-export types for dashboard consumers
export type { LifiQuotePayload, LifiRoutePayload, LifiStatusPayload, LifiReasonCode, LifiFallback };

const provider = new LifiProvider({ integrator: 'jackkernel' });

export const fetchLifiQuote = (params: IntentParams): Promise<LifiQuotePayload> =>
  provider.fetchQuote(params);

export const fetchLifiRoute = (params: IntentParams): Promise<LifiRoutePayload> =>
  provider.fetchRoute(params);

export const fetchLifiStatus = (txHash?: string): Promise<LifiStatusPayload> =>
  provider.fetchStatus(txHash);

/**
 * Validate and resolve intent params into a quote request.
 *
 * This is a thin wrapper that uses the SDK's chain/token resolution and
 * unit conversion utilities. Preserved for backward compatibility with
 * the dashboard's `/api/quote` route.
 */
export const buildQuoteRequest = (params: IntentParams) => {
  if (!params?.sourceChain || !params?.destinationChain || !params?.tokenIn || !params?.tokenOut || !params?.amountIn) {
    return { ok: false as const, reason: 'MISSING_PARAMS' as LifiReasonCode, message: 'Missing quote parameters.' };
  }

  const fromChainRes = resolveChain(params.sourceChain);
  if (!fromChainRes.ok) {
    return { ok: false as const, reason: 'UNSUPPORTED_CHAIN' as LifiReasonCode, message: 'Unsupported chain.' };
  }
  const fromChainId = fromChainRes.chainId;

  const toChainRes = resolveChain(params.destinationChain);
  if (!toChainRes.ok) {
    return { ok: false as const, reason: 'UNSUPPORTED_CHAIN' as LifiReasonCode, message: 'Unsupported chain.' };
  }
  const toChainId = toChainRes.chainId;

  const fromTokenRes = resolveToken(fromChainId, params.tokenIn);
  if (!fromTokenRes.ok) {
    return { ok: false as const, reason: 'UNSUPPORTED_TOKEN' as LifiReasonCode, message: 'Unsupported token.' };
  }
  const fromToken = fromTokenRes.token;

  const toTokenRes = resolveToken(toChainId, params.tokenOut);
  if (!toTokenRes.ok) {
    return { ok: false as const, reason: 'UNSUPPORTED_TOKEN' as LifiReasonCode, message: 'Unsupported token.' };
  }
  const toToken = toTokenRes.token;

  const amount = Number(params.amountIn);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, reason: 'INVALID_AMOUNT' as LifiReasonCode, message: 'Amount must be greater than zero.' };
  }

  return {
    ok: true as const,
    fromChainId,
    toChainId,
    fromToken,
    toToken,
    fromAmount: toBaseUnits(params.amountIn, fromToken.decimals),
    minAmountOut: params.minAmountOut,
  };
};
