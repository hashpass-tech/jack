/**
 * Uniswap v4 integration module for JACK SDK
 * 
 * This module exports all types and classes for interacting with Uniswap v4 hooks.
 * Requirements: 4.1, 4.2, 4.3, 4.6
 */

export { V4Provider, createSepoliaV4Provider } from './V4Provider';
export type {
  V4Config,
  PoolKey,
  SwapParams,
  V4Intent,
  PolicyParams,
  PolicyCheckResult,
  SettlementParams,
  HookDataParams,
} from './types';
export { SEPOLIA_V4_CONFIG, loadV4ConfigFromArtifacts } from './types';
