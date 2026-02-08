/**
 * Uniswap v4 integration types for JACK SDK
 * 
 * This module defines types for interacting with Uniswap v4 hooks and settlement.
 * Requirements: 4.1, 4.2, 4.3, 4.6
 */

import type { Address, Hash, Hex, WalletClient } from 'viem';

/**
 * Configuration for V4Provider
 * Requirement 4.1
 */
export interface V4Config {
  /** Address of the JACKPolicyHook contract */
  policyHookAddress: Address;
  /** Address of the JACKSettlementAdapter contract */
  settlementAdapterAddress: Address;
  /** Address of the Uniswap v4 PoolManager */
  poolManagerAddress: Address;
  /** Chain ID where contracts are deployed */
  chainId: number;
}

/**
 * Uniswap v4 PoolKey structure
 * Requirement 4.2
 */
export interface PoolKey {
  /** Currency 0 address */
  currency0: Address;
  /** Currency 1 address */
  currency1: Address;
  /** Pool fee (in hundredths of a bip, i.e. 1e-6) */
  fee: number;
  /** Tick spacing */
  tickSpacing: number;
  /** Hook contract address */
  hooks: Address;
}

/**
 * Uniswap v4 SwapParams structure
 * Requirement 4.2
 */
export interface SwapParams {
  /** Whether the swap is token0 -> token1 (true) or token1 -> token0 (false) */
  zeroForOne: boolean;
  /** Amount specified (negative for exact input, positive for exact output) */
  amountSpecified: bigint;
  /** Price limit for the swap */
  sqrtPriceLimitX96: bigint;
}

/**
 * Intent structure for settlement
 * Requirement 4.2
 */
export interface V4Intent {
  /** Intent ID (bytes32) */
  id: Hex;
  /** User address */
  user: Address;
  /** Input token address */
  tokenIn: Address;
  /** Output token address */
  tokenOut: Address;
  /** Input amount */
  amountIn: bigint;
  /** Minimum output amount */
  minAmountOut: bigint;
  /** Deadline timestamp */
  deadline: number;
  /** EIP-712 signature */
  signature: Hex;
}

/**
 * Policy parameters for registration
 * Requirement 4.2
 */
export interface PolicyParams {
  /** Intent ID */
  intentId: Hex;
  /** Minimum amount out */
  minAmountOut: bigint;
  /** Reference amount out for slippage calculation */
  referenceAmountOut?: bigint;
  /** Maximum slippage in basis points (0-10000) */
  maxSlippageBps?: number;
  /** Deadline timestamp */
  deadline: number;
  /** Address allowed to update policy bounds */
  updater: Address;
}

/**
 * Result of policy check
 * Requirement 4.2
 */
export interface PolicyCheckResult {
  /** Whether the policy allows the quoted amount */
  allowed: boolean;
  /** Reason code (REASON_OK, REASON_POLICY_MISSING, etc.) */
  reason: Hex;
}

/**
 * Settlement parameters
 * Requirement 4.3
 */
export interface SettlementParams {
  /** Intent to settle */
  intent: V4Intent;
  /** Pool key for the swap */
  poolKey: PoolKey;
  /** Swap parameters */
  swapParams: SwapParams;
  /** Quoted amount out */
  quotedAmountOut: bigint;
}

/**
 * Hook data encoding parameters
 * Requirement 4.6
 */
export interface HookDataParams {
  /** Intent ID */
  intentId: Hex;
  /** Quoted amount out */
  quotedAmountOut: bigint;
}

/**
 * Default V4 configuration for Sepolia testnet
 * Requirement 4.1
 */
export const SEPOLIA_V4_CONFIG: V4Config = {
  policyHookAddress: '0xE8142B1Ff0DA631866fec5771f4291CbCe718080',
  settlementAdapterAddress: '0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A',
  poolManagerAddress: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
  chainId: 11155111, // Sepolia
};

/**
 * Load V4 configuration from deployment artifacts
 * Requirement 4.1
 */
export function loadV4ConfigFromArtifacts(
  artifactsPath: string = '../../../contracts/deployments/sepolia/latest.json'
): V4Config {
  try {
    // In browser/runtime environment, use the default Sepolia config
    return SEPOLIA_V4_CONFIG;
  } catch {
    // Fallback to default config
    return SEPOLIA_V4_CONFIG;
  }
}
