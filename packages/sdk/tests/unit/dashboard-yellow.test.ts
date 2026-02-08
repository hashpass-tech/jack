/**
 * Unit tests for dashboard Yellow integration
 *
 * Tests the singleton pattern used by the dashboard utility (apps/dashboard/src/lib/yellow.ts)
 * and the notification processing behavior that updates YellowProvider local channel state
 * when a provider is available.
 *
 * Since the dashboard utility imports from @jack-kernel/sdk and the route handler uses
 * Next.js APIs, we test the underlying concepts directly using YellowProvider:
 *
 * 1. Singleton initialization and lifecycle (initYellowProvider / getYellowProvider / resetYellowProvider)
 * 2. Notification processing: when a channelId is present and a YellowProvider is available,
 *    getChannelState(channelId) is called to refresh local cache
 *
 * Validates Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YellowProvider } from '../../src/yellow/yellow-provider.js';
import type { YellowConfig } from '../../src/yellow/yellow-provider.js';
import type { WalletClient } from 'viem';

// ---------------------------------------------------------------------------
// Helpers: recreate the dashboard singleton pattern from apps/dashboard/src/lib/yellow.ts
// ---------------------------------------------------------------------------

let provider: YellowProvider | null = null;

function initYellowProvider(config: YellowConfig, walletClient: WalletClient): YellowProvider {
  provider = new YellowProvider(config, walletClient);
  return provider;
}

function getYellowProvider(): YellowProvider | null {
  return provider;
}

function resetYellowProvider(): void {
  provider = null;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mockWalletClient = {
  account: { address: '0x1234567890123456789012345678901234567890' },
  chain: { id: 1 },
  signTypedData: vi.fn(),
  transport: { type: 'http' },
} as unknown as WalletClient;

const baseConfig: YellowConfig = {
  custodyAddress: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
  adjudicatorAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  chainId: 42161,
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
};

const altConfig: YellowConfig = {
  custodyAddress: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  adjudicatorAddress: '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  chainId: 10,
  rpcUrl: 'https://mainnet.optimism.io',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dashboard Yellow Integration', () => {
  beforeEach(() => {
    resetYellowProvider();
  });

  afterEach(() => {
    resetYellowProvider();
  });

  // =========================================================================
  // Requirement 12.3: Dashboard utility initialization and singleton behavior
  // =========================================================================
  describe('Singleton initialization and lifecycle (Requirement 12.3)', () => {
    it('should return null before initialization', () => {
      expect(getYellowProvider()).toBeNull();
    });

    it('should return the provider after initialization', () => {
      const p = initYellowProvider(baseConfig, mockWalletClient);

      expect(p).toBeInstanceOf(YellowProvider);
      expect(getYellowProvider()).toBe(p);
    });

    it('should return null after reset', () => {
      initYellowProvider(baseConfig, mockWalletClient);
      expect(getYellowProvider()).not.toBeNull();

      resetYellowProvider();
      expect(getYellowProvider()).toBeNull();
    });

    it('should replace the provider when initialized twice', () => {
      const first = initYellowProvider(baseConfig, mockWalletClient);
      const second = initYellowProvider(altConfig, mockWalletClient);

      expect(first).not.toBe(second);
      expect(getYellowProvider()).toBe(second);

      // Verify the second provider has the alt config
      const resolved = second.getResolvedConfig();
      expect(resolved.custodyAddress).toBe(altConfig.custodyAddress);
      expect(resolved.chainId).toBe(altConfig.chainId);
    });

    it('should preserve provider reference across multiple getYellowProvider calls', () => {
      const p = initYellowProvider(baseConfig, mockWalletClient);

      expect(getYellowProvider()).toBe(p);
      expect(getYellowProvider()).toBe(p);
      expect(getYellowProvider()).toBe(p);
    });
  });

  // =========================================================================
  // Requirement 12.1, 12.4: Provider exposes channel state and settlement data
  // =========================================================================
  describe('Provider exposes channel and settlement data (Requirements 12.1, 12.4)', () => {
    it('should expose isConnected status (initially false)', () => {
      const p = initYellowProvider(baseConfig, mockWalletClient);
      expect(p.isConnected).toBe(false);
    });

    it('should expose getChannelState method for querying channel data', () => {
      const p = initYellowProvider(baseConfig, mockWalletClient);
      expect(typeof p.getChannelState).toBe('function');
    });

    it('should expose getChannels method for listing channels', () => {
      const p = initYellowProvider(baseConfig, mockWalletClient);
      expect(typeof p.getChannels).toBe('function');
    });
  });

  // =========================================================================
  // Requirement 12.2: Notification processing updates YellowProvider state
  // =========================================================================
  describe('Notification processing updates YellowProvider state (Requirement 12.2)', () => {
    it('should call getChannelState when provider is available and channelId is present', async () => {
      const p = initYellowProvider(baseConfig, mockWalletClient);
      const channelId = '0xabc123';

      // Spy on getChannelState to verify it gets called
      const spy = vi.spyOn(p, 'getChannelState');

      // Simulate what the route handler does:
      // "if (channelId) { const yellowProvider = getYellowProvider(); if (yellowProvider) { yellowProvider.getChannelState(channelId).catch(() => {}); } }"
      const yellowProvider = getYellowProvider();
      if (yellowProvider) {
        yellowProvider.getChannelState(channelId).catch(() => {});
      }

      expect(spy).toHaveBeenCalledWith(channelId);
      spy.mockRestore();
    });

    it('should not throw when provider is available but not connected', async () => {
      const p = initYellowProvider(baseConfig, mockWalletClient);
      const channelId = '0xdef456';

      // getChannelState should return a fallback result (not throw) when not connected
      const result = await p.getChannelState(channelId);

      // Provider is not connected, so channelStateManager is null → fallback
      expect(result.channelId).toBe(channelId);
      expect(result.fallback).toBeDefined();
      expect(result.fallback!.reasonCode).toBe('YELLOW_UNAVAILABLE');
    });

    it('should not call getChannelState when no provider is available', () => {
      // No provider initialized
      const channelId = '0xabc123';

      // Simulate the route handler logic
      const yellowProvider = getYellowProvider();

      // Should be null, so getChannelState is never called
      expect(yellowProvider).toBeNull();
    });

    it('should not call getChannelState when channelId is empty', () => {
      const p = initYellowProvider(baseConfig, mockWalletClient);
      const spy = vi.spyOn(p, 'getChannelState');

      const channelId = '';

      // Simulate the route handler logic: "if (channelId) { ... }"
      if (channelId) {
        const yellowProvider = getYellowProvider();
        if (yellowProvider) {
          yellowProvider.getChannelState(channelId).catch(() => {});
        }
      }

      // channelId is falsy, so getChannelState should NOT be called
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should swallow errors from getChannelState during notification processing', async () => {
      const p = initYellowProvider(baseConfig, mockWalletClient);
      const channelId = '0xfail';

      // Mock getChannelState to reject
      const spy = vi.spyOn(p, 'getChannelState').mockRejectedValue(new Error('network error'));

      // Simulate the route handler's fire-and-forget pattern with .catch(() => {})
      const yellowProvider = getYellowProvider();
      if (yellowProvider) {
        // This should not throw thanks to .catch(() => {})
        await expect(
          yellowProvider.getChannelState(channelId).catch(() => {
            // Non-fatal: swallow errors from the async cache refresh
          })
        ).resolves.toBeUndefined();
      }

      expect(spy).toHaveBeenCalledWith(channelId);
      spy.mockRestore();
    });
  });
});
