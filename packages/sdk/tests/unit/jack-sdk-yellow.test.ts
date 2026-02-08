/**
 * Unit tests for JACK_SDK Yellow Network integration
 *
 * Tests that the JACK_SDK properly creates (or omits) a YellowProvider
 * based on the presence of a yellow config, and that all other managers
 * remain initialized when yellow config is provided.
 *
 * Validates Requirements 1.6, 1.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JACK_SDK, YellowProvider } from '../../src/index.js';
import type { WalletClient } from 'viem';

// Mock JackClient to avoid real HTTP requests
vi.mock('../../src/client.js', () => ({
  JackClient: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    post: vi.fn(),
  })),
}));

describe('JACK_SDK Yellow Integration', () => {
  const baseUrl = 'https://api.jack.test';

  const mockWalletClient = {
    account: { address: '0x1234567890123456789012345678901234567890' },
    chain: { id: 1 },
    signTypedData: vi.fn(),
    transport: { type: 'http' },
  } as unknown as WalletClient;

  const yellowConfig = {
    custodyAddress: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' as `0x${string}`,
    adjudicatorAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as `0x${string}`,
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    walletClient: mockWalletClient,
  };

  describe('YellowProvider creation', () => {
    it('should create YellowProvider when yellow config is provided', () => {
      const sdk = new JACK_SDK({
        baseUrl,
        yellow: yellowConfig,
      });

      expect(sdk.yellow).toBeDefined();
      expect(sdk.yellow).toBeInstanceOf(YellowProvider);
      // Provider should not be connected yet (no connect() called)
      expect(sdk.yellow!.isConnected).toBe(false);
    });

    it('should not create YellowProvider when yellow config is omitted', () => {
      const sdk = new JACK_SDK({ baseUrl });

      expect(sdk.yellow).toBeUndefined();
    });
  });

  describe('Manager initialization with yellow config', () => {
    it('should still initialize all other managers when yellow config is provided', () => {
      const sdk = new JACK_SDK({
        baseUrl,
        yellow: yellowConfig,
      });

      expect(sdk.intents).toBeDefined();
      expect(sdk.execution).toBeDefined();
      expect(sdk.costs).toBeDefined();
      expect(sdk.agent).toBeDefined();
    });
  });

  describe('YellowProvider receives correct config values', () => {
    it('should pass provided config values to YellowProvider', () => {
      const sdk = new JACK_SDK({
        baseUrl,
        yellow: yellowConfig,
      });

      const resolvedConfig = sdk.yellow!.getResolvedConfig();

      expect(resolvedConfig.custodyAddress).toBe(yellowConfig.custodyAddress);
      expect(resolvedConfig.adjudicatorAddress).toBe(yellowConfig.adjudicatorAddress);
      expect(resolvedConfig.chainId).toBe(yellowConfig.chainId);
    });

    it('should apply default values for optional config fields', () => {
      const sdk = new JACK_SDK({
        baseUrl,
        yellow: yellowConfig,
      });

      const resolvedConfig = sdk.yellow!.getResolvedConfig();

      expect(resolvedConfig.clearNodeUrl).toBe('wss://clearnet-sandbox.yellow.com/ws');
      expect(resolvedConfig.challengeDuration).toBe(3600);
      expect(resolvedConfig.sessionExpiry).toBe(3600);
    });

    it('should pass challenge duration as BigInt to NitroliteClient', () => {
      const customDuration = 7200;
      const sdk = new JACK_SDK({
        baseUrl,
        yellow: {
          ...yellowConfig,
          challengeDuration: customDuration,
        },
      });

      const nitroliteClient = sdk.yellow!.getNitroliteClient();
      expect(nitroliteClient.config.challengeDuration).toBe(BigInt(customDuration));
    });
  });
});
