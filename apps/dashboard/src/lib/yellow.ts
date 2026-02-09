import { YellowProvider } from "@jack-kernel/sdk";
import type { YellowConfig } from "@jack-kernel/sdk";
import type { WalletClient } from "viem";

// Yellow Network contracts on Sepolia (ClearNode sandbox)
export const SEPOLIA_YELLOW_ADDRESSES = {
  custody: "0x019B65A265EB3363822f2752141b3dF16131b262" as `0x${string}`,
  adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2" as `0x${string}`,
} as const;

export const CLEARNODE_WS_URL = "wss://clearnet-sandbox.yellow.com/ws";
export const CLEARNODE_FAUCET_URL =
  "https://clearnet-sandbox.yellow.com/faucet/requestTokens";

let provider: YellowProvider | null = null;

/**
 * Initialize the singleton YellowProvider instance for the dashboard.
 */
export function initYellowProvider(
  config: YellowConfig,
  walletClient: WalletClient,
): YellowProvider {
  provider = new YellowProvider(config, walletClient);
  return provider;
}

/**
 * Create a default Sepolia YellowConfig.
 */
export function createSepoliaYellowConfig(): YellowConfig {
  return {
    custodyAddress: SEPOLIA_YELLOW_ADDRESSES.custody,
    adjudicatorAddress: SEPOLIA_YELLOW_ADDRESSES.adjudicator,
    chainId: 11155111,
    challengeDuration: 3600,
    clearNodeUrl: CLEARNODE_WS_URL,
  };
}

/**
 * Get the current singleton YellowProvider instance.
 */
export function getYellowProvider(): YellowProvider | null {
  return provider;
}

/**
 * Reset the singleton YellowProvider instance.
 */
export function resetYellowProvider(): void {
  provider = null;
}
