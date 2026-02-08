/**
 * Channel State Manager for Yellow Network Integration
 *
 * Tracks local channel state and provides on-chain query capabilities.
 * Maintains a local cache of channel states from ClearNode messages and
 * falls back to on-chain queries via viem PublicClient when the WebSocket
 * is disconnected.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import type { PublicClient } from 'viem';
import type { ChannelState } from './types.js';

// ============================================================================
// Custody Contract ABI (minimal)
// ============================================================================

/**
 * Minimal ABI for the custody contract's balance query function.
 *
 * The custody contract exposes a `getChannelBalances` function that returns
 * the token balances held in a specific channel for the given token addresses.
 *
 * Function signature: getChannelBalances(bytes32 channelId, address[] tokens) → uint256[]
 */
const CUSTODY_BALANCE_ABI = [
  {
    name: 'getChannelBalances',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'channelId', type: 'bytes32' },
      { name: 'tokens', type: 'address[]' },
    ],
    outputs: [{ name: 'balances', type: 'uint256[]' }],
  },
] as const;

// ============================================================================
// ChannelStateManager
// ============================================================================

/**
 * Manages local channel state cache and provides on-chain query capabilities.
 *
 * The ChannelStateManager serves two purposes:
 * 1. Maintains a local cache of channel states received from ClearNode messages,
 *    enabling fast lookups without network calls.
 * 2. Provides on-chain balance queries via viem PublicClient for when the
 *    WebSocket connection is unavailable (Requirement 7.4) or when authoritative
 *    on-chain data is needed (Requirement 7.2).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export class ChannelStateManager {
  private readonly publicClient: PublicClient;
  private readonly custodyAddress: `0x${string}`;
  private readonly channels: Map<string, ChannelState>;

  /**
   * @param publicClient - viem PublicClient for on-chain balance queries
   * @param custodyAddress - Address of the custody contract holding channel collateral
   */
  constructor(publicClient: PublicClient, custodyAddress: `0x${string}`) {
    this.publicClient = publicClient;
    this.custodyAddress = custodyAddress;
    this.channels = new Map<string, ChannelState>();
  }

  /**
   * Update the local cache with a channel state from a ClearNode response.
   *
   * This is called when the YellowProvider receives channel state updates
   * from ClearNode messages (create, resize, close, or get_ledger_balances).
   *
   * Requirement 7.1: Maintain local channel state from ClearNode responses.
   *
   * @param channelId - The channel identifier
   * @param state - The channel state to cache
   */
  updateChannel(channelId: string, state: ChannelState): void {
    this.channels.set(channelId, state);
  }

  /**
   * Get a locally cached channel state by channel ID.
   *
   * Returns undefined if the channel is not in the local cache.
   * For authoritative on-chain data, use queryOnChainBalances instead.
   *
   * Requirement 7.2: Query specific channel status by channel ID.
   *
   * @param channelId - The channel identifier
   * @returns The cached channel state, or undefined if not found
   */
  getChannel(channelId: string): ChannelState | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get all locally cached channel states.
   *
   * Returns a snapshot array of all channels currently in the cache.
   * The returned array is a copy; modifications do not affect the cache.
   *
   * Requirement 7.1: Return list of channels with their statuses and allocations.
   *
   * @returns Array of all cached channel states
   */
  getAllChannels(): ChannelState[] {
    return Array.from(this.channels.values());
  }

  /**
   * Query on-chain channel balances from the custody contract.
   *
   * Uses viem PublicClient.readContract to call the custody contract's
   * getChannelBalances function. This provides authoritative on-chain data
   * and is used as a fallback when the ClearNode WebSocket is disconnected.
   *
   * Requirement 7.2: Query on-chain custody contract for channel balances.
   * Requirement 7.4: Fall back to on-chain queries when WebSocket is disconnected.
   *
   * @param channelId - The channel identifier (bytes32 hex string)
   * @param tokens - Array of token addresses to query balances for
   * @returns Array of token balances as bigint values, one per token
   * @throws Error if the on-chain query fails
   */
  async queryOnChainBalances(channelId: string, tokens: string[]): Promise<bigint[]> {
    try {
      const balances = await this.publicClient.readContract({
        address: this.custodyAddress,
        abi: CUSTODY_BALANCE_ABI,
        functionName: 'getChannelBalances',
        args: [channelId as `0x${string}`, tokens as `0x${string}`[]],
      });

      return [...balances];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query on-chain balances for channel ${channelId}: ${message}`);
    }
  }

  /**
   * Find an open (ACTIVE) channel for a given token address.
   *
   * Searches the local cache for a channel with status 'ACTIVE' that
   * matches the specified token address. Returns the first match found.
   *
   * This is used by the YellowProvider to reuse existing channels
   * when executing intents, avoiding unnecessary channel creation.
   *
   * @param token - The token address to find an open channel for
   * @returns The first matching ACTIVE channel, or undefined if none found
   */
  findOpenChannel(token: string): ChannelState | undefined {
    for (const channel of this.channels.values()) {
      if (channel.status === 'ACTIVE' && channel.token === token) {
        return channel;
      }
    }
    return undefined;
  }

  /**
   * Clear all cached channel states.
   *
   * This is typically called when the provider disconnects or when
   * a full state refresh is needed.
   */
  clear(): void {
    this.channels.clear();
  }
}
