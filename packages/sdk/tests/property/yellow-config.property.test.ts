/**
 * Property-based tests for Yellow SDK Configuration
 *
 * Feature: yellow-network-integration
 * Property 1: Challenge duration is converted to BigInt
 *
 * Tests that for any positive integer challenge duration provided in YellowConfig,
 * the NitroliteClient receives it as a BigInt value equal to the original integer.
 *
 * Validates: Requirements 1.3
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { YellowProvider } from '../../src/yellow/yellow-provider.js';
import type { WalletClient } from 'viem';

// ============================================================================
// Generators
// ============================================================================

/**
 * Generates a positive integer challenge duration in seconds.
 * Range: 1 to 2^31 - 1 (max safe positive 32-bit integer).
 * This covers realistic challenge durations from 1 second to ~68 years.
 */
const arbChallengeDuration = fc.integer({ min: 1, max: 2_147_483_647 });

/**
 * Minimal mock WalletClient sufficient for YellowProvider constructor.
 * The constructor only needs walletClient to pass to NitroliteClient config.
 */
const mockWalletClient = {
  account: { address: '0x1234567890abcdef1234567890abcdef12345678' },
} as unknown as WalletClient;

// ============================================================================
// Property 1: Challenge duration is converted to BigInt
// ============================================================================

describe('Feature: yellow-network-integration, Property 1: Challenge duration is converted to BigInt', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * For any positive integer challenge duration, the NitroliteClient
   * receives it as a BigInt equal to the original value.
   */
  it('NitroliteClient receives challengeDuration as BigInt equal to the original integer', () => {
    fc.assert(
      fc.property(arbChallengeDuration, (duration) => {
        const provider = new YellowProvider(
          {
            custodyAddress: '0x0000000000000000000000000000000000000001',
            adjudicatorAddress: '0x0000000000000000000000000000000000000002',
            chainId: 1,
            challengeDuration: duration,
            rpcUrl: 'http://localhost:8545',
          },
          mockWalletClient,
        );

        const client = provider.getNitroliteClient();

        // The NitroliteClient config should have challengeDuration as a BigInt
        expect(typeof client.config.challengeDuration).toBe('bigint');
        expect(client.config.challengeDuration).toBe(BigInt(duration));
      }),
      { numRuns: 100 },
    );
  });
});
