/**
 * Barrel export for the LI.FI integration submodule.
 *
 * Re-exports all public types, classes, and functions from the lifi submodule
 * so consumers can import from a single entry point.
 *
 * @module
 */

// LifiProvider class and config
export { LifiProvider } from './lifi-provider.js';
export type { LifiConfig } from './lifi-provider.js';

// Types
export type {
  LifiProviderType,
  LifiReasonCode,
  LifiFallback,
  LifiQuotePayload,
  LifiRoutePayload,
  LifiStatusPayload,
} from './types.js';

// Chain resolution
export { resolveChain, getSupportedChains } from './chain-map.js';
export type { ChainResolution } from './chain-map.js';

// Token resolution
export { resolveToken, getSupportedTokens } from './token-map.js';
export type { TokenInfo, TokenResolution } from './token-map.js';

// Unit conversion utilities
export { toBaseUnits, fromBaseUnits } from './utils.js';

// Fallback provider
export {
  buildFallbackQuote,
  buildFallbackRoute,
  buildFallbackStatus,
  deterministicId,
  FALLBACK_RATES,
} from './fallback.js';
