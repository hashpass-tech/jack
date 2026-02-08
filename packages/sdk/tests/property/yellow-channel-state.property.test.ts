/**
 * Property-based tests for ChannelState structural invariant
 *
 * Feature: yellow-network-integration
 * Property 4: ChannelState structural invariant
 *
 * For any ChannelState returned by the provider, it contains non-empty channelId,
 * valid status, at least one allocation with destination/token/amount, token address,
 * and chainId.
 *
 * Validates: Requirements 7.3, 3.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import type { PublicClient } from 'viem';
import type { ChannelState, ChannelAllocation } from '../../src/yellow/types.js';
import { ChannelStateManager } from '../../src/yellow/channel-state-manager.js';

// ============================================================================
// Valid statuses as defined in the ChannelState type
// ============================================================================

const VALID_STATUSES: ChannelState['status'][] = [
  'VOID',
  'INITIAL',
  'ACTIVE',
  'DISPUTE',
  'FINAL',
];

// ============================================================================
// Generators
// ============================================================================

/**
 * Generates a valid Ethereum address: 0x + 40 hex characters.
 */
const arbEthAddress = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex}`);

/**
 * Generates a non-empty hex string suitable for a channelId (bytes32).
 * Produces 0x + 64 hex characters.
 */
const arbChannelId = fc
  .hexaString({ minLength: 64, maxLength: 64 })
  .map((hex) => `0x${hex}`);

/**
 * Generates a valid channel status from the enum.
 */
const arbStatus = fc.constantFrom<ChannelState['status']>(...VALID_STATUSES);

/**
 * Generates a valid positive chain ID.
 */
const arbChainId = fc.integer({ min: 1, max: 100_000 });

/**
 * Generates a valid ChannelAllocation with non-empty destination, token, and amount.
 */
const arbAllocation: fc.Arbitrary<ChannelAllocation> = fc.record({
  destination: arbEthAddress,
  token: arbEthAddress,
  amount: fc.bigUintN(128).map((n) => (n + 1n).toString()),
});

/**
 * Generates a non-empty array of allocations (1–5 elements).
 */
const arbAllocations = fc.array(arbAllocation, { minLength: 1, maxLength: 5 });

/**
 * Generates a valid state intent string.
 */
const arbStateIntent = fc.constantFrom('INITIALIZE', 'OPERATE', 'RESIZE', 'FINALIZE');

/**
 * Generates a valid ChannelState object with all structural invariants satisfied.
 */
const arbChannelState: fc.Arbitrary<ChannelState> = fc.record({
  channelId: arbChannelId,
  status: arbStatus,
  chainId: arbChainId,
  token: arbEthAddress,
  allocations: arbAllocations,
  stateVersion: fc.nat({ max: 1_000_000 }),
  stateIntent: arbStateIntent,
  stateHash: fc.option(
    fc.hexaString({ minLength: 64, maxLength: 64 }).map((hex) => `0x${hex}`),
    { nil: undefined },
  ),
  adjudicator: arbEthAddress,
  challengePeriod: fc.integer({ min: 1, max: 86_400 }),
  challengeExpiration: fc.option(
    fc.integer({ min: 1_000_000_000, max: 4_102_444_800 }),
    { nil: undefined },
  ),
  createdAt: fc.integer({ min: 1_000_000_000, max: 4_102_444_800 }),
  updatedAt: fc.integer({ min: 1_000_000_000, max: 4_102_444_800 }),
});

// ============================================================================
// Mock PublicClient
// ============================================================================

/**
 * Creates a minimal mock PublicClient that satisfies the type.
 * We are testing the cache behavior, not on-chain queries.
 */
function createMockPublicClient(): PublicClient {
  return {} as PublicClient;
}

// ============================================================================
// Property 4: ChannelState structural invariant
// ============================================================================

describe('Feature: yellow-network-integration, Property 4: ChannelState structural invariant', () => {
  let manager: ChannelStateManager;

  beforeEach(() => {
    const mockClient = createMockPublicClient();
    manager = new ChannelStateManager(mockClient, '0x0000000000000000000000000000000000000001');
  });

  /**
   * **Validates: Requirements 7.3, 3.3**
   *
   * For any valid ChannelState stored via updateChannel and retrieved via getChannel,
   * the returned state contains a non-empty channelId.
   */
  it('retrieved ChannelState always has a non-empty channelId', () => {
    fc.assert(
      fc.property(arbChannelState, (state) => {
        manager.updateChannel(state.channelId, state);
        const retrieved = manager.getChannel(state.channelId);

        expect(retrieved).toBeDefined();
        expect(retrieved!.channelId).toBeTruthy();
        expect(retrieved!.channelId.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.3, 3.3**
   *
   * For any valid ChannelState stored and retrieved, the status is one of
   * VOID, INITIAL, ACTIVE, DISPUTE, or FINAL.
   */
  it('retrieved ChannelState always has a valid status', () => {
    fc.assert(
      fc.property(arbChannelState, (state) => {
        manager.updateChannel(state.channelId, state);
        const retrieved = manager.getChannel(state.channelId);

        expect(retrieved).toBeDefined();
        expect(VALID_STATUSES).toContain(retrieved!.status);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.3, 3.3**
   *
   * For any valid ChannelState stored and retrieved, it contains at least one
   * allocation, and each allocation has non-empty destination, token, and amount.
   */
  it('retrieved ChannelState always has at least one valid allocation', () => {
    fc.assert(
      fc.property(arbChannelState, (state) => {
        manager.updateChannel(state.channelId, state);
        const retrieved = manager.getChannel(state.channelId);

        expect(retrieved).toBeDefined();
        expect(retrieved!.allocations.length).toBeGreaterThanOrEqual(1);

        for (const alloc of retrieved!.allocations) {
          expect(alloc.destination).toBeTruthy();
          expect(alloc.destination.length).toBeGreaterThan(0);
          expect(alloc.token).toBeTruthy();
          expect(alloc.token.length).toBeGreaterThan(0);
          expect(alloc.amount).toBeTruthy();
          expect(alloc.amount.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.3, 3.3**
   *
   * For any valid ChannelState stored and retrieved, it contains a non-empty
   * token address and a positive chainId.
   */
  it('retrieved ChannelState always has token address and chainId', () => {
    fc.assert(
      fc.property(arbChannelState, (state) => {
        manager.updateChannel(state.channelId, state);
        const retrieved = manager.getChannel(state.channelId);

        expect(retrieved).toBeDefined();
        expect(retrieved!.token).toBeTruthy();
        expect(retrieved!.token.length).toBeGreaterThan(0);
        expect(retrieved!.chainId).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.3, 3.3**
   *
   * For any set of valid ChannelState objects stored via updateChannel and
   * retrieved via getAllChannels, every returned state satisfies the full
   * structural invariant: non-empty channelId, valid status, at least one
   * allocation with destination/token/amount, token address, and chainId.
   */
  it('all channels from getAllChannels satisfy the full structural invariant', () => {
    fc.assert(
      fc.property(
        fc.array(arbChannelState, { minLength: 1, maxLength: 10 }),
        (states) => {
          // Use a fresh manager for each run
          const mockClient = createMockPublicClient();
          const mgr = new ChannelStateManager(
            mockClient,
            '0x0000000000000000000000000000000000000001',
          );

          // Store all states
          for (const state of states) {
            mgr.updateChannel(state.channelId, state);
          }

          // Retrieve all and verify invariant on each
          const allChannels = mgr.getAllChannels();
          expect(allChannels.length).toBeGreaterThanOrEqual(1);

          for (const channel of allChannels) {
            // Non-empty channelId
            expect(channel.channelId).toBeTruthy();
            expect(channel.channelId.length).toBeGreaterThan(0);

            // Valid status
            expect(VALID_STATUSES).toContain(channel.status);

            // At least one allocation with required fields
            expect(channel.allocations.length).toBeGreaterThanOrEqual(1);
            for (const alloc of channel.allocations) {
              expect(alloc.destination).toBeTruthy();
              expect(alloc.destination.length).toBeGreaterThan(0);
              expect(alloc.token).toBeTruthy();
              expect(alloc.token.length).toBeGreaterThan(0);
              expect(alloc.amount).toBeTruthy();
              expect(alloc.amount.length).toBeGreaterThan(0);
            }

            // Token address
            expect(channel.token).toBeTruthy();
            expect(channel.token.length).toBeGreaterThan(0);

            // Chain ID
            expect(channel.chainId).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.3, 3.3**
   *
   * For any valid ChannelState stored and retrieved, the retrieved state
   * is deeply equal to the stored state — the cache preserves all fields.
   */
  it('retrieved ChannelState is identical to the stored state', () => {
    fc.assert(
      fc.property(arbChannelState, (state) => {
        manager.updateChannel(state.channelId, state);
        const retrieved = manager.getChannel(state.channelId);

        expect(retrieved).toEqual(state);
      }),
      { numRuns: 100 },
    );
  });
});


// ============================================================================
// Property 5: Resize preserves channel identity and updates allocations
// ============================================================================

describe('Feature: yellow-network-integration, Property 5: Resize preserves channel identity and updates allocations', () => {
  let manager: ChannelStateManager;

  beforeEach(() => {
    const mockClient = createMockPublicClient();
    manager = new ChannelStateManager(mockClient, '0x0000000000000000000000000000000000000001');
  });

  /**
   * **Validates: Requirements 4.3**
   *
   * For any ChannelState with status ACTIVE, when we simulate a resize by
   * storing the channel and then updating it with new allocations, the
   * channelId must be preserved and allocations must reflect the change.
   */
  it('resize preserves channelId and updates allocations', () => {
    fc.assert(
      fc.property(
        arbChannelState,
        arbAllocations,
        (originalState, newAllocations) => {
          // Force the original state to be ACTIVE (resize only applies to active channels)
          const activeState: ChannelState = {
            ...originalState,
            status: 'ACTIVE',
          };

          // Store the original active channel
          manager.updateChannel(activeState.channelId, activeState);

          // Simulate a resize: create an updated state with the same channelId but new allocations
          const resizedState: ChannelState = {
            ...activeState,
            allocations: newAllocations,
            stateVersion: activeState.stateVersion + 1,
            stateIntent: 'RESIZE',
            updatedAt: activeState.updatedAt + 1,
          };

          // Update the channel with the resized state
          manager.updateChannel(activeState.channelId, resizedState);

          // Retrieve and verify
          const retrieved = manager.getChannel(activeState.channelId);

          // channelId must be preserved
          expect(retrieved).toBeDefined();
          expect(retrieved!.channelId).toBe(activeState.channelId);

          // Allocations must reflect the new values
          expect(retrieved!.allocations).toEqual(newAllocations);
          expect(retrieved!.allocations.length).toBe(newAllocations.length);

          // State version should be incremented
          expect(retrieved!.stateVersion).toBe(activeState.stateVersion + 1);

          // State intent should be RESIZE
          expect(retrieved!.stateIntent).toBe('RESIZE');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.3**
   *
   * For any set of channels, resizing one channel does not affect other channels
   * in the manager. The channelId acts as a unique key.
   */
  it('resize of one channel does not affect other channels', () => {
    fc.assert(
      fc.property(
        fc.array(arbChannelState, { minLength: 2, maxLength: 5 }),
        arbAllocations,
        (states, newAllocations) => {
          // Use a fresh manager for each run
          const mockClient = createMockPublicClient();
          const mgr = new ChannelStateManager(
            mockClient,
            '0x0000000000000000000000000000000000000001',
          );

          // Ensure unique channelIds by deduplicating
          const uniqueStates = new Map<string, ChannelState>();
          for (const state of states) {
            uniqueStates.set(state.channelId, { ...state, status: 'ACTIVE' });
          }
          const channelList = Array.from(uniqueStates.values());
          if (channelList.length < 2) return; // Need at least 2 unique channels

          // Store all channels
          for (const state of channelList) {
            mgr.updateChannel(state.channelId, state);
          }

          // Resize only the first channel
          const targetChannel = channelList[0]!;
          const resizedState: ChannelState = {
            ...targetChannel,
            allocations: newAllocations,
            stateVersion: targetChannel.stateVersion + 1,
            stateIntent: 'RESIZE',
          };
          mgr.updateChannel(targetChannel.channelId, resizedState);

          // Verify other channels are unaffected
          for (let i = 1; i < channelList.length; i++) {
            const other = mgr.getChannel(channelList[i]!.channelId);
            expect(other).toBeDefined();
            expect(other).toEqual(channelList[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// Property 6: Close produces FINAL status
// ============================================================================

describe('Feature: yellow-network-integration, Property 6: Close produces FINAL status', () => {
  let manager: ChannelStateManager;

  beforeEach(() => {
    const mockClient = createMockPublicClient();
    manager = new ChannelStateManager(mockClient, '0x0000000000000000000000000000000000000001');
  });

  /**
   * **Validates: Requirements 5.3**
   *
   * For any ChannelState, when we simulate a close by creating a new
   * ChannelState with status FINAL and storing it, the retrieved status
   * must be FINAL.
   */
  it('closing a channel produces FINAL status', () => {
    fc.assert(
      fc.property(arbChannelState, (originalState) => {
        // Store the original channel
        manager.updateChannel(originalState.channelId, originalState);

        // Simulate a close: create a state with status FINAL
        const closedState: ChannelState = {
          ...originalState,
          status: 'FINAL',
          stateIntent: 'FINALIZE',
          stateVersion: originalState.stateVersion + 1,
          updatedAt: originalState.updatedAt + 1,
        };

        // Update the channel with the closed state
        manager.updateChannel(originalState.channelId, closedState);

        // Retrieve and verify
        const retrieved = manager.getChannel(originalState.channelId);

        expect(retrieved).toBeDefined();
        expect(retrieved!.status).toBe('FINAL');
        expect(retrieved!.stateIntent).toBe('FINALIZE');
        expect(retrieved!.channelId).toBe(originalState.channelId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.3**
   *
   * For any ChannelState regardless of its initial status, closing always
   * transitions to FINAL. This verifies that close works from any starting status.
   */
  it('close produces FINAL status regardless of initial status', () => {
    fc.assert(
      fc.property(arbChannelState, arbStatus, (state, initialStatus) => {
        // Set the channel to an arbitrary initial status
        const initialState: ChannelState = {
          ...state,
          status: initialStatus,
        };

        // Store the initial state
        manager.updateChannel(initialState.channelId, initialState);

        // Simulate close
        const closedState: ChannelState = {
          ...initialState,
          status: 'FINAL',
          stateIntent: 'FINALIZE',
          stateVersion: initialState.stateVersion + 1,
          updatedAt: initialState.updatedAt + 1,
        };

        manager.updateChannel(initialState.channelId, closedState);

        const retrieved = manager.getChannel(initialState.channelId);

        expect(retrieved).toBeDefined();
        expect(retrieved!.status).toBe('FINAL');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.3**
   *
   * For any ChannelState that is closed, the channel should no longer be
   * found by findOpenChannel (which looks for ACTIVE channels).
   */
  it('closed channel is not found by findOpenChannel', () => {
    fc.assert(
      fc.property(arbChannelState, (state) => {
        // Start with an ACTIVE channel
        const activeState: ChannelState = {
          ...state,
          status: 'ACTIVE',
        };

        manager.updateChannel(activeState.channelId, activeState);

        // Verify it can be found as open
        const foundBefore = manager.findOpenChannel(activeState.token);
        expect(foundBefore).toBeDefined();
        expect(foundBefore!.channelId).toBe(activeState.channelId);

        // Close the channel
        const closedState: ChannelState = {
          ...activeState,
          status: 'FINAL',
          stateIntent: 'FINALIZE',
          stateVersion: activeState.stateVersion + 1,
        };

        manager.updateChannel(activeState.channelId, closedState);

        // Verify it is no longer found as open
        const foundAfter = manager.findOpenChannel(activeState.token);
        // Should either be undefined or a different channel
        if (foundAfter !== undefined) {
          expect(foundAfter.channelId).not.toBe(activeState.channelId);
        }
      }),
      { numRuns: 100 },
    );
  });
});
