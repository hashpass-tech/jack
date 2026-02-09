import { V4Provider } from "@jack-kernel/sdk";
import type { V4Config } from "@jack-kernel/sdk";
import type { WalletClient } from "viem";

// Deployed contract addresses on Sepolia
export const SEPOLIA_V4_ADDRESSES = {
  policyHook: "0xE8142B1Ff0DA631866fec5771f4291CbCe718080" as `0x${string}`,
  settlementAdapter:
    "0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A" as `0x${string}`,
  poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543" as `0x${string}`,
} as const;

let provider: V4Provider | null = null;

/**
 * Initialize the singleton V4Provider instance for the dashboard.
 */
export function initV4Provider(
  walletClient: WalletClient,
  chainId = 11155111,
): V4Provider {
  const config: V4Config = {
    policyHookAddress: SEPOLIA_V4_ADDRESSES.policyHook,
    settlementAdapterAddress: SEPOLIA_V4_ADDRESSES.settlementAdapter,
    poolManagerAddress: SEPOLIA_V4_ADDRESSES.poolManager,
    chainId,
  };
  provider = new V4Provider(config, walletClient);
  return provider;
}

/**
 * Get the current singleton V4Provider instance.
 */
export function getV4Provider(): V4Provider | null {
  return provider;
}

/**
 * Reset the singleton V4Provider instance.
 */
export function resetV4Provider(): void {
  provider = null;
}
