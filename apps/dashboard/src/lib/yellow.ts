import { YellowProvider } from '@jack-kernel/sdk';
import type { YellowConfig } from '@jack-kernel/sdk';
import type { WalletClient } from 'viem';

let provider: YellowProvider | null = null;

/**
 * Initialize the singleton YellowProvider instance for the dashboard.
 *
 * Creates a new YellowProvider with the given config and wallet client,
 * replacing any previously initialized instance.
 *
 * @param config - Yellow Network configuration (custody/adjudicator addresses, chain ID, etc.)
 * @param walletClient - viem WalletClient for signing transactions and EIP-712 messages
 * @returns The initialized YellowProvider instance
 *
 * Requirements: 12.3
 */
export function initYellowProvider(config: YellowConfig, walletClient: WalletClient): YellowProvider {
  provider = new YellowProvider(config, walletClient);
  return provider;
}

/**
 * Get the current singleton YellowProvider instance.
 *
 * Returns null if initYellowProvider has not been called yet.
 *
 * @returns The YellowProvider instance, or null if not initialized
 *
 * Requirements: 12.3
 */
export function getYellowProvider(): YellowProvider | null {
  return provider;
}

/**
 * Reset the singleton YellowProvider instance.
 *
 * Useful for testing and cleanup. Sets the internal provider reference to null.
 */
export function resetYellowProvider(): void {
  provider = null;
}
