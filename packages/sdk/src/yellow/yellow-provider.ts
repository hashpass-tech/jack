/**
 * YellowProvider - Main entry point for Yellow Network operations
 *
 * Orchestrates session management, channel lifecycle, clearing, and event mapping.
 * Follows the same standalone-class pattern as LifiProvider.
 *
 * Key design decisions:
 * - Constructor MAY throw if NitroliteClient initialization fails
 * - All other public methods return result objects (never throw)
 * - WebSocket connection management is encapsulated in ClearNodeConnection
 * - Session key management is handled internally via SessionKeyManager
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 10.1
 */

import type { WalletClient, PublicClient } from 'viem';
import { createPublicClient, http } from 'viem';
import { ClearNodeConnection } from './clear-node-connection.js';
import { SessionKeyManager } from './session-key-manager.js';
import type { AuthParams } from './session-key-manager.js';
import { ChannelStateManager } from './channel-state-manager.js';
import type { IntentParams } from '../types.js';
import type {
  YellowConnectionResult,
  YellowChannelResult,
  YellowTransferResult,
  YellowExecutionResult,
  YellowChannelsResult,
  YellowEvent,
  YellowEventHandler,
  YellowProviderStatus,
  YellowReasonCode,
  YellowQuote,
  ClearingResult,
  ChannelState,
  ChannelAllocation,
  CreateChannelParams,
  ResizeChannelParams,
  CloseChannelParams,
  TransferParams,
} from './types.js';
import {
  toSerializableChannelState,
  toSerializableYellowQuote,
} from './serialization.js';

// ============================================================================
// Error-to-ReasonCode Mapping
// ============================================================================

/**
 * Centralized error-to-reason-code mapping for all YellowProvider methods.
 *
 * Classifies an unknown error into the appropriate YellowReasonCode based on
 * the error message content. This ensures consistent error classification
 * across all provider methods.
 *
 * Mapping rules (Requirements 13.1, 13.2, 13.3, 13.4, 13.5):
 * - WebSocket errors → YELLOW_UNAVAILABLE
 * - On-chain transaction reverts → YELLOW_TX_FAILED
 * - Authentication failures → YELLOW_AUTH_FAILED
 * - Message timeouts → YELLOW_TIMEOUT
 * - ClearNode unavailable / all reconnection attempts exhausted → YELLOW_UNAVAILABLE
 *
 * @param error - The error to classify (may be Error, string, or unknown)
 * @returns The appropriate YellowReasonCode for the error
 */
export function mapErrorToReasonCode(error: unknown): YellowReasonCode {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Timeout errors → YELLOW_TIMEOUT (Requirement 13.4)
  if (
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed_out')
  ) {
    return 'YELLOW_TIMEOUT';
  }

  // Authentication failures → YELLOW_AUTH_FAILED (Requirement 13.3)
  if (
    lowerMessage.includes('auth') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('eip-712 signing') ||
    lowerMessage.includes('session expired') ||
    lowerMessage.includes('session invalid')
  ) {
    return 'YELLOW_AUTH_FAILED';
  }

  // On-chain transaction reverts → YELLOW_TX_FAILED (Requirement 13.2)
  if (
    lowerMessage.includes('revert') ||
    lowerMessage.includes('transaction failed') ||
    lowerMessage.includes('tx failed') ||
    lowerMessage.includes('execution reverted') ||
    lowerMessage.includes('on-chain') ||
    lowerMessage.includes('onchain') ||
    lowerMessage.includes('contract call')
  ) {
    return 'YELLOW_TX_FAILED';
  }

  // WebSocket errors → YELLOW_UNAVAILABLE (Requirement 13.1)
  // Also covers ClearNode unavailable and reconnection exhaustion (Requirement 13.5)
  if (
    lowerMessage.includes('websocket') ||
    lowerMessage.includes('ws ') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('reconnect') ||
    lowerMessage.includes('disconnected') ||
    lowerMessage.includes('not connected') ||
    lowerMessage.includes('clearnode') ||
    lowerMessage.includes('unavailable') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('socket hang up')
  ) {
    return 'YELLOW_UNAVAILABLE';
  }

  // Channel dispute errors
  if (lowerMessage.includes('dispute')) {
    return 'YELLOW_CHANNEL_DISPUTE';
  }

  // Insufficient balance errors
  if (
    lowerMessage.includes('insufficient') &&
    lowerMessage.includes('channel')
  ) {
    return 'INSUFFICIENT_CHANNEL_BALANCE';
  }

  if (lowerMessage.includes('insufficient') || lowerMessage.includes('balance')) {
    return 'INSUFFICIENT_BALANCE';
  }

  // Default: treat unknown errors as provider unavailable
  // This ensures the JACK_SDK can fall back to alternative providers (Requirement 13.5)
  return 'YELLOW_UNAVAILABLE';
}

/**
 * Extract a revert reason from an on-chain transaction error, if available.
 *
 * Attempts to parse the revert reason from common error formats produced by
 * viem and other Ethereum libraries.
 *
 * @param error - The error to extract the revert reason from
 * @returns The revert reason string, or undefined if not found
 */
export function extractRevertReason(error: unknown): string | undefined {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Match common revert reason patterns
  // viem format: "execution reverted: <reason>"
  const executionPrefix = 'execution reverted';
  const executionIndex = lowerMessage.indexOf(executionPrefix);
  if (executionIndex !== -1) {
    const reason = extractRevertReasonFromSuffix(
      message.slice(executionIndex + executionPrefix.length),
    );
    if (reason) {
      return reason;
    }
  }

  // Generic revert pattern: "revert <reason>" or "reverted with reason: <reason>"
  const revertIndex = lowerMessage.indexOf('revert');
  if (revertIndex !== -1) {
    const reason = extractRevertReasonFromSuffix(
      message.slice(revertIndex + 'revert'.length),
    );
    if (reason) {
      return reason;
    }
  }

  return undefined;
}

function extractRevertReasonFromSuffix(suffix: string): string | undefined {
  let text = suffix;
  if (!text) return undefined;

  const trimmedStart = text.trimStart();
  const lowerTrimmed = trimmedStart.toLowerCase();
  if (lowerTrimmed.startsWith('ed')) {
    text = trimmedStart.slice(2).trimStart();
  } else {
    text = trimmedStart;
  }

  const lowerText = text.toLowerCase();
  if (lowerText.startsWith('with reason')) {
    text = text.slice('with reason'.length).trimStart();
  }

  if (text.startsWith(':') || text.startsWith('-')) {
    text = text.slice(1).trimStart();
  }

  const newlineIndex = findFirstLineBreak(text);
  const reason = (newlineIndex === -1 ? text : text.slice(0, newlineIndex))
    .trim();
  return reason.length ? reason : undefined;
}

function findFirstLineBreak(text: string): number {
  const newlineIndex = text.indexOf('\n');
  const carriageIndex = text.indexOf('\r');
  if (newlineIndex === -1) return carriageIndex;
  if (carriageIndex === -1) return newlineIndex;
  return Math.min(newlineIndex, carriageIndex);
}

// ============================================================================
// ClearNode Response Types
// ============================================================================

/**
 * Expected shape of ClearNode responses for channel lifecycle operations.
 * ClearNode returns channel parameters, state data, and optional error info.
 */
interface ClearNodeChannelResponse {
  method?: string;
  channelId?: string;
  error?: string;
  data?: {
    channelId?: string;
    allocations?: ChannelAllocation[];
    stateVersion?: number;
    stateHash?: string;
    serverSignature?: string;
  };
}

/**
 * Expected shape of ClearNode responses for intent submission and solver matching.
 * ClearNode returns solver quotes and clearing results for submitted intents.
 */
interface ClearNodeIntentResponse {
  method?: string;
  error?: string;
  data?: {
    intentId?: string;
    quote?: {
      solverId?: string;
      amountIn?: string;
      amountOut?: string;
      estimatedTime?: number;
    };
    clearing?: {
      channelId?: string;
      matchedAmountIn?: string;
      matchedAmountOut?: string;
      netSettlement?: string;
      settlementProof?: {
        stateHash?: string;
        signatures?: string[];
        txHash?: string;
        finalAllocations?: ChannelAllocation[];
      };
    };
  };
}

// ============================================================================
// NitroliteClient Stub
// ============================================================================

/**
 * Local stub interface for @erc7824/nitrolite NitroliteClient.
 *
 * This captures the expected API surface of the NitroliteClient from the
 * @erc7824/nitrolite package. The real package is NOT installed; this stub
 * allows the code to be structurally correct and ready to swap in the real
 * package later.
 */
export interface NitroliteClientConfig {
  publicClient: PublicClient;
  walletClient: WalletClient;
  custodyAddress: `0x${string}`;
  adjudicatorAddress: `0x${string}`;
  challengeDuration: bigint;
}

/**
 * Stub NitroliteClient class.
 *
 * Provides the constructor interface expected by the real @erc7824/nitrolite package.
 * Channel lifecycle methods (createChannel, resizeChannel, closeChannel) are stubs
 * that will be replaced when the real package is installed.
 */
export class NitroliteClient {
  public readonly config: NitroliteClientConfig;

  constructor(config: NitroliteClientConfig) {
    this.config = config;
  }

  // Stub methods for channel lifecycle - to be implemented in tasks 6.2-6.4
  // when the real @erc7824/nitrolite package is integrated.
}

// ============================================================================
// YellowConfig
// ============================================================================

/**
 * Configuration object for initializing the YellowProvider.
 *
 * Requirement 1.8: Accepts fields for ClearNode WebSocket URL, custody contract address,
 * adjudicator contract address, chain ID, challenge duration, RPC URL, and session expiry.
 */
export interface YellowConfig {
  /** ClearNode WebSocket URL. Default: "wss://clearnet-sandbox.yellow.com/ws" */
  clearNodeUrl?: string;
  /** Custody contract address (required) */
  custodyAddress: `0x${string}`;
  /** Adjudicator contract address (required) */
  adjudicatorAddress: `0x${string}`;
  /** Chain ID for on-chain operations (required) */
  chainId: number;
  /** RPC URL for the chain (optional, used to create a PublicClient if needed) */
  rpcUrl?: string;
  /** Challenge period in seconds. Default: 3600 */
  challengeDuration?: number;
  /** Session key expiry in seconds. Default: 3600 */
  sessionExpiry?: number;
  /** WebSocket message timeout in ms. Default: 30000 */
  messageTimeout?: number;
  /** Max WebSocket reconnection attempts. Default: 5 */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in ms. Default: 1000 */
  reconnectDelay?: number;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CLEAR_NODE_URL = 'wss://clearnet-sandbox.yellow.com/ws';
const DEFAULT_CHALLENGE_DURATION = 3600;
const DEFAULT_SESSION_EXPIRY = 3600;
const DEFAULT_MESSAGE_TIMEOUT = 30000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY = 1000;

// ============================================================================
// YellowProvider
// ============================================================================

/**
 * Main provider class for Yellow Network operations.
 *
 * Orchestrates session management, channel lifecycle, clearing, and event mapping.
 * The constructor initializes the NitroliteClient with viem clients and contract addresses.
 * The connect() method establishes the WebSocket and completes the auth handshake.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 10.1
 */
export class YellowProvider {
  // Internal components
  private readonly nitroliteClient: NitroliteClient;
  private readonly walletClient: WalletClient;
  private readonly publicClient: PublicClient;
  private readonly config: Required<
    Pick<YellowConfig, 'clearNodeUrl' | 'challengeDuration' | 'sessionExpiry' | 'messageTimeout' | 'maxReconnectAttempts' | 'reconnectDelay'>
  > & YellowConfig;

  private connection: ClearNodeConnection | null = null;
  private sessionManager: SessionKeyManager | null = null;
  private channelStateManager: ChannelStateManager | null = null;

  // Event emitter state
  private readonly eventHandlers: Map<YellowEvent, Set<YellowEventHandler>> = new Map();

  // Provider status
  private _status: YellowProviderStatus = 'disconnected';

  /**
   * Creates a new YellowProvider instance.
   *
   * Requirement 1.1: Initialize NitroliteClient with custody/adjudicator addresses and viem clients.
   * Requirement 1.2: Default clearNodeUrl to "wss://clearnet-sandbox.yellow.com/ws".
   * Requirement 1.3: Convert challengeDuration to BigInt when passing to NitroliteClient.
   * Requirement 1.4: Default challengeDuration to 3600 seconds.
   * Requirement 1.5: Throw descriptive error if NitroliteClient initialization fails.
   * Requirement 1.8: Accept all YellowConfig fields.
   *
   * @param config - Yellow Network configuration
   * @param walletClient - viem WalletClient for signing transactions and EIP-712 messages
   * @throws Error if NitroliteClient initialization fails
   */
  constructor(config: YellowConfig, walletClient: WalletClient) {
    // Store wallet client
    this.walletClient = walletClient;

    // Apply defaults (Requirements 1.2, 1.4)
    this.config = {
      ...config,
      clearNodeUrl: config.clearNodeUrl ?? DEFAULT_CLEAR_NODE_URL,
      challengeDuration: config.challengeDuration ?? DEFAULT_CHALLENGE_DURATION,
      sessionExpiry: config.sessionExpiry ?? DEFAULT_SESSION_EXPIRY,
      messageTimeout: config.messageTimeout ?? DEFAULT_MESSAGE_TIMEOUT,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
      reconnectDelay: config.reconnectDelay ?? DEFAULT_RECONNECT_DELAY,
    };

    // Create PublicClient from rpcUrl if provided, otherwise use a minimal one
    if (config.rpcUrl) {
      this.publicClient = createPublicClient({
        transport: http(config.rpcUrl),
      });
    } else {
      // Create a minimal public client - operations requiring on-chain queries
      // will need a valid rpcUrl to be provided
      this.publicClient = createPublicClient({
        transport: http(),
      });
    }

    // Initialize NitroliteClient (Requirements 1.1, 1.3, 1.5)
    try {
      this.nitroliteClient = new NitroliteClient({
        publicClient: this.publicClient,
        walletClient: this.walletClient,
        custodyAddress: this.config.custodyAddress,
        adjudicatorAddress: this.config.adjudicatorAddress,
        challengeDuration: BigInt(this.config.challengeDuration), // Requirement 1.3
      });
    } catch (error) {
      // Requirement 1.5: Throw descriptive error
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to initialize NitroliteClient: ${message}. ` +
        `Check custody address (${this.config.custodyAddress}), ` +
        `adjudicator address (${this.config.adjudicatorAddress}), ` +
        `and chain ID (${this.config.chainId}).`
      );
    }
  }

  /**
   * Connect to ClearNode and authenticate.
   *
   * Establishes a WebSocket connection via ClearNodeConnection, then authenticates
   * using SessionKeyManager with the configured session expiry.
   *
   * Requirement 10.1: Establish WebSocket connection and emit connected event.
   *
   * @returns Connection result with session address on success, or fallback on failure
   */
  async connect(): Promise<YellowConnectionResult> {
    try {
      this._status = 'connecting';

      // Create ClearNodeConnection
      this.connection = new ClearNodeConnection(this.config.clearNodeUrl, {
        maxReconnectAttempts: this.config.maxReconnectAttempts,
        reconnectDelay: this.config.reconnectDelay,
        messageTimeout: this.config.messageTimeout,
      });

      // Wire up connection events to our event emitter
      this.connection.on('connected', () => {
        this._status = 'connected';
        this.emit('connected', undefined);
      });

      this.connection.on('disconnected', () => {
        this._status = 'disconnected';
        this.emit('disconnected', undefined);
      });

      // Establish WebSocket connection
      await this.connection.connect();

      // Create SessionKeyManager and authenticate
      this.sessionManager = new SessionKeyManager(this.walletClient, this.connection);

      const authParams: AuthParams = {
        allowances: [],
        expiresAt: Math.floor(Date.now() / 1000) + this.config.sessionExpiry,
        scope: 'jack-kernel',
      };

      const sessionInfo = await this.sessionManager.authenticate(authParams);

      // Create ChannelStateManager
      this.channelStateManager = new ChannelStateManager(
        this.publicClient,
        this.config.custodyAddress
      );

      this._status = 'connected';

      return {
        connected: true,
        sessionAddress: sessionInfo.sessionAddress,
      };
    } catch (error) {
      this._status = 'error';
      const message = error instanceof Error ? error.message : String(error);

      // Use centralized error-to-reason-code mapping (Requirements 13.1, 13.3, 13.5)
      const reasonCode = mapErrorToReasonCode(error);

      this.emit('error', { message, reasonCode });

      return {
        connected: false,
        fallback: {
          enabled: true,
          reasonCode,
          message: `Failed to connect to ClearNode: ${message}`,
        },
      };
    }
  }

  /**
   * Disconnect from ClearNode and clean up all resources.
   *
   * Closes the WebSocket connection, invalidates the session, clears channel state,
   * and removes all event handlers from internal components.
   *
   * Requirement 10.4: Close WebSocket and clean up all pending message handlers.
   */
  async disconnect(): Promise<void> {
    // Close WebSocket connection
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }

    // Invalidate session
    if (this.sessionManager) {
      this.sessionManager.invalidate();
      this.sessionManager = null;
    }

    // Clear channel state cache
    if (this.channelStateManager) {
      this.channelStateManager.clear();
      this.channelStateManager = null;
    }

    this._status = 'disconnected';
  }

  /**
   * Check if the provider is connected and authenticated.
   */
  get isConnected(): boolean {
    return (
      this._status === 'connected' &&
      this.connection !== null &&
      this.connection.isConnected &&
      this.sessionManager !== null &&
      this.sessionManager.isAuthenticated
    );
  }

  /**
   * Get the current provider status.
   */
  get status(): YellowProviderStatus {
    return this._status;
  }

  /**
   * Register an event listener for YellowProvider events.
   *
   * @param event - The event type to listen for
   * @param handler - The handler function to call when the event fires
   */
  on(event: YellowEvent, handler: YellowEventHandler): void {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(handler);
  }

  /**
   * Remove an event listener.
   *
   * @param event - The event type to stop listening for
   * @param handler - The handler function to remove
   */
  off(event: YellowEvent, handler: YellowEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  // ============================================================================
  // Channel lifecycle methods (task 6.2)
  // ============================================================================

  /**
   * Create a new state channel.
   *
   * Two-phase operation:
   * 1. Send create_channel message to ClearNode via sendAndWait
   * 2. Submit channel creation on-chain via NitroliteClient (simulated)
   *
   * After success, updates the ChannelStateManager cache and emits channel_created.
   *
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   *
   * @param params - Channel creation parameters (chainId, token)
   * @returns YellowChannelResult with channelId, state, and txHash on success; fallback on failure
   */
  async createChannel(params: CreateChannelParams): Promise<YellowChannelResult> {
    // Check connection state
    if (!this.connection || !this.connection.isConnected) {
      return {
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Not connected to ClearNode',
        },
      };
    }

    // Ensure session is authenticated (auto-reauthenticate if expired)
    if (!this.sessionManager) {
      return {
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Session manager not initialized - call connect() first',
        },
      };
    }

    try {
      await this.sessionManager.ensureAuthenticated();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_AUTH_FAILED',
          message: `Authentication failed: ${message}`,
        },
      };
    }

    try {
      // Phase 1: Send create_channel to ClearNode (Requirement 3.1)
      const createMsg = JSON.stringify({
        method: 'create_channel',
        params: {
          chainId: params.chainId,
          token: params.token,
        },
      });

      let clearNodeResponse: ClearNodeChannelResponse;
      try {
        clearNodeResponse = await this.connection.sendAndWait<ClearNodeChannelResponse>(
          createMsg,
          'create_channel',
          this.config.messageTimeout
        );
      } catch (error) {
        // Requirement 3.5: Timeout reason code; Requirement 13.1: WebSocket errors
        const message = error instanceof Error ? error.message : String(error);
        const reasonCode = mapErrorToReasonCode(error);
        return {
          fallback: {
            enabled: true,
            reasonCode,
            message: `ClearNode create_channel failed: ${message}`,
          },
        };
      }

      // Extract channel data from ClearNode response (Requirement 3.2)
      const channelId = clearNodeResponse.data?.channelId
        ?? clearNodeResponse.channelId
        ?? `0x${Date.now().toString(16).padStart(64, '0')}`;

      // Phase 2: Submit on-chain via NitroliteClient (simulated since NitroliteClient is a stub)
      // In production, this would call this.nitroliteClient.createChannel(...)
      let txHash: string;
      try {
        txHash = this.simulateOnChainTransaction('createChannel', channelId);
      } catch (error) {
        // Requirement 3.4: On-chain transaction failure with revert reason (Requirement 13.2)
        const message = error instanceof Error ? error.message : String(error);
        const revertReason = extractRevertReason(error);
        return {
          channelId,
          fallback: {
            enabled: true,
            reasonCode: 'YELLOW_TX_FAILED',
            message: revertReason
              ? `On-chain channel creation failed: ${revertReason}`
              : `On-chain channel creation failed: ${message}`,
          },
        };
      }

      // Build ChannelState (Requirement 3.3)
      // Apply toSerializableChannelState to ensure BigInt values from NitroliteClient
      // are converted to strings for JSON compatibility (Requirements 11.1, 11.5)
      const now = Math.floor(Date.now() / 1000);
      const walletAddress = this.walletClient.account?.address ?? '0x0';
      const channelState: ChannelState = toSerializableChannelState({
        channelId,
        status: 'ACTIVE',
        chainId: params.chainId,
        token: params.token,
        allocations: clearNodeResponse.data?.allocations ?? [
          {
            destination: walletAddress,
            token: params.token,
            amount: '0',
          },
        ],
        stateVersion: clearNodeResponse.data?.stateVersion ?? 1,
        stateIntent: 'INITIALIZE',
        stateHash: clearNodeResponse.data?.stateHash,
        adjudicator: this.config.adjudicatorAddress,
        challengePeriod: this.config.challengeDuration,
        createdAt: now,
        updatedAt: now,
      });

      // Update local cache
      if (this.channelStateManager) {
        this.channelStateManager.updateChannel(channelId, channelState);
      }

      // Emit event
      this.emit('channel_created', { channelId, state: channelState, txHash });

      return {
        channelId,
        state: channelState,
        txHash,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reasonCode = mapErrorToReasonCode(error);
      return {
        fallback: {
          enabled: true,
          reasonCode,
          message: `Channel creation failed: ${message}`,
        },
      };
    }
  }

  /**
   * Resize a channel's allocations.
   *
   * Two-phase operation:
   * 1. Send resize_channel message to ClearNode via sendAndWait
   * 2. Submit resize on-chain via NitroliteClient (simulated)
   *
   * After success, updates the ChannelStateManager cache and emits channel_resized.
   *
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   *
   * @param params - Resize parameters (channelId, allocateAmount, optional fundsDestination)
   * @returns YellowChannelResult with updated state on success; fallback on failure
   */
  async resizeChannel(params: ResizeChannelParams): Promise<YellowChannelResult> {
    // Check connection state
    if (!this.connection || !this.connection.isConnected) {
      return {
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Not connected to ClearNode',
        },
      };
    }

    // Ensure session is authenticated
    if (!this.sessionManager) {
      return {
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Session manager not initialized - call connect() first',
        },
      };
    }

    try {
      await this.sessionManager.ensureAuthenticated();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_AUTH_FAILED',
          message: `Authentication failed: ${message}`,
        },
      };
    }

    // Requirement 4.5: Check for insufficient balance
    // Validate the allocateAmount is a valid non-negative value
    try {
      const amount = BigInt(params.allocateAmount);
      if (amount < 0n) {
        return {
          channelId: params.channelId,
          fallback: {
            enabled: true,
            reasonCode: 'INSUFFICIENT_BALANCE',
            message: 'Resize allocation amount cannot be negative',
          },
        };
      }
    } catch {
      return {
        channelId: params.channelId,
        fallback: {
          enabled: true,
          reasonCode: 'INSUFFICIENT_BALANCE',
          message: `Invalid allocation amount: ${params.allocateAmount}`,
        },
      };
    }

    try {
      // Phase 1: Send resize_channel to ClearNode (Requirement 4.1)
      const resizeMsg = JSON.stringify({
        method: 'resize_channel',
        params: {
          channelId: params.channelId,
          allocateAmount: params.allocateAmount,
          fundsDestination: params.fundsDestination,
        },
      });

      let clearNodeResponse: ClearNodeChannelResponse;
      try {
        clearNodeResponse = await this.connection.sendAndWait<ClearNodeChannelResponse>(
          resizeMsg,
          'resize_channel',
          this.config.messageTimeout
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Check if ClearNode reported insufficient balance
        if (message.toLowerCase().includes('insufficient') || message.toLowerCase().includes('balance')) {
          return {
            channelId: params.channelId,
            fallback: {
              enabled: true,
              reasonCode: 'INSUFFICIENT_BALANCE',
              message: `Insufficient balance for resize: ${message}`,
            },
          };
        }

        // Use centralized mapping for timeout/ws errors (Requirements 13.1, 13.4)
        const reasonCode = mapErrorToReasonCode(error);
        return {
          channelId: params.channelId,
          fallback: {
            enabled: true,
            reasonCode,
            message: `ClearNode resize_channel failed: ${message}`,
          },
        };
      }

      // Check if ClearNode response indicates insufficient balance
      if (clearNodeResponse.error?.includes('insufficient') || clearNodeResponse.error?.includes('balance')) {
        return {
          channelId: params.channelId,
          fallback: {
            enabled: true,
            reasonCode: 'INSUFFICIENT_BALANCE',
            message: `Insufficient balance for resize: ${clearNodeResponse.error}`,
          },
        };
      }

      // Phase 2: Submit on-chain resize via NitroliteClient (simulated) (Requirement 4.2)
      let txHash: string;
      try {
        txHash = this.simulateOnChainTransaction('resizeChannel', params.channelId);
      } catch (error) {
        // Requirement 4.4: On-chain resize failure with revert reason (Requirement 13.2)
        const message = error instanceof Error ? error.message : String(error);
        const revertReason = extractRevertReason(error);
        return {
          channelId: params.channelId,
          fallback: {
            enabled: true,
            reasonCode: 'YELLOW_TX_FAILED',
            message: revertReason
              ? `On-chain channel resize failed: ${revertReason}`
              : `On-chain channel resize failed: ${message}`,
          },
        };
      }

      // Build updated ChannelState (Requirement 4.3)
      // Apply toSerializableChannelState to ensure BigInt values from NitroliteClient
      // are converted to strings for JSON compatibility (Requirements 11.1, 11.5)
      const now = Math.floor(Date.now() / 1000);
      const existingState = this.channelStateManager?.getChannel(params.channelId);
      const walletAddress = this.walletClient.account?.address ?? '0x0';

      const updatedAllocations = clearNodeResponse.data?.allocations ?? [
        {
          destination: params.fundsDestination ?? walletAddress,
          token: existingState?.token ?? '',
          amount: params.allocateAmount,
        },
      ];

      const channelState: ChannelState = toSerializableChannelState({
        channelId: params.channelId,
        status: existingState?.status ?? 'ACTIVE',
        chainId: existingState?.chainId ?? this.config.chainId,
        token: existingState?.token ?? '',
        allocations: updatedAllocations,
        stateVersion: (existingState?.stateVersion ?? 0) + 1,
        stateIntent: 'RESIZE',
        stateHash: clearNodeResponse.data?.stateHash,
        adjudicator: this.config.adjudicatorAddress,
        challengePeriod: this.config.challengeDuration,
        createdAt: existingState?.createdAt ?? now,
        updatedAt: now,
      });

      // Update local cache
      if (this.channelStateManager) {
        this.channelStateManager.updateChannel(params.channelId, channelState);
      }

      // Emit event
      this.emit('channel_resized', { channelId: params.channelId, state: channelState, txHash });

      return {
        channelId: params.channelId,
        state: channelState,
        txHash,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reasonCode = mapErrorToReasonCode(error);
      return {
        channelId: params.channelId,
        fallback: {
          enabled: true,
          reasonCode,
          message: `Channel resize failed: ${message}`,
        },
      };
    }
  }

  /**
   * Close a channel and optionally withdraw funds.
   *
   * Two-phase operation:
   * 1. Send close_channel message to ClearNode via sendAndWait
   * 2. Submit close on-chain via NitroliteClient (simulated)
   * 3. Optionally call custody withdrawal for the channel's tokens
   *
   * After success, updates the ChannelStateManager cache and emits channel_closed.
   *
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   *
   * @param params - Close parameters (channelId, optional withdraw flag defaulting to true)
   * @returns YellowChannelResult with FINAL status on success; fallback on failure
   */
  async closeChannel(params: CloseChannelParams): Promise<YellowChannelResult> {
    // Check connection state
    if (!this.connection || !this.connection.isConnected) {
      return {
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Not connected to ClearNode',
        },
      };
    }

    // Ensure session is authenticated
    if (!this.sessionManager) {
      return {
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Session manager not initialized - call connect() first',
        },
      };
    }

    try {
      await this.sessionManager.ensureAuthenticated();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_AUTH_FAILED',
          message: `Authentication failed: ${message}`,
        },
      };
    }

    // Requirement 5.5: Check if channel is in DISPUTE status
    const existingState = this.channelStateManager?.getChannel(params.channelId);
    if (existingState?.status === 'DISPUTE') {
      return {
        channelId: params.channelId,
        state: existingState,
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_CHANNEL_DISPUTE',
          message: 'Cannot close channel: channel is in DISPUTE status. Wait for dispute resolution before closing.',
        },
      };
    }

    try {
      // Phase 1: Send close_channel to ClearNode (Requirement 5.1)
      const closeMsg = JSON.stringify({
        method: 'close_channel',
        params: {
          channelId: params.channelId,
        },
      });

      let clearNodeResponse: ClearNodeChannelResponse;
      try {
        clearNodeResponse = await this.connection.sendAndWait<ClearNodeChannelResponse>(
          closeMsg,
          'close_channel',
          this.config.messageTimeout
        );
      } catch (error) {
        // Use centralized mapping for timeout/ws errors (Requirements 13.1, 13.4)
        const message = error instanceof Error ? error.message : String(error);
        const reasonCode = mapErrorToReasonCode(error);
        return {
          channelId: params.channelId,
          fallback: {
            enabled: true,
            reasonCode,
            message: `ClearNode close_channel failed: ${message}`,
          },
        };
      }

      // Phase 2: Submit on-chain close via NitroliteClient (simulated) (Requirement 5.2)
      let txHash: string;
      try {
        txHash = this.simulateOnChainTransaction('closeChannel', params.channelId);
      } catch (error) {
        // On-chain close failure with revert reason (Requirement 13.2)
        const message = error instanceof Error ? error.message : String(error);
        const revertReason = extractRevertReason(error);
        return {
          channelId: params.channelId,
          fallback: {
            enabled: true,
            reasonCode: 'YELLOW_TX_FAILED',
            message: revertReason
              ? `On-chain channel close failed: ${revertReason}`
              : `On-chain channel close failed: ${message}`,
          },
        };
      }

      // Phase 3: Optionally call custody withdrawal (Requirement 5.4)
      const shouldWithdraw = params.withdraw !== false; // default: true
      if (shouldWithdraw) {
        try {
          this.simulateOnChainTransaction('withdraw', params.channelId);
        } catch {
          // Withdrawal failure is non-fatal - the channel is still closed
          // The user can retry withdrawal separately
        }
      }

      // Build ChannelState with FINAL status (Requirement 5.3)
      // Apply toSerializableChannelState to ensure BigInt values from NitroliteClient
      // are converted to strings for JSON compatibility (Requirements 11.1, 11.5)
      const now = Math.floor(Date.now() / 1000);
      const walletAddress = this.walletClient.account?.address ?? '0x0';

      const channelState: ChannelState = toSerializableChannelState({
        channelId: params.channelId,
        status: 'FINAL',
        chainId: existingState?.chainId ?? this.config.chainId,
        token: existingState?.token ?? '',
        allocations: clearNodeResponse.data?.allocations ?? existingState?.allocations ?? [
          {
            destination: walletAddress,
            token: existingState?.token ?? '',
            amount: '0',
          },
        ],
        stateVersion: (existingState?.stateVersion ?? 0) + 1,
        stateIntent: 'FINALIZE',
        stateHash: clearNodeResponse.data?.stateHash,
        adjudicator: this.config.adjudicatorAddress,
        challengePeriod: this.config.challengeDuration,
        createdAt: existingState?.createdAt ?? now,
        updatedAt: now,
      });

      // Update local cache
      if (this.channelStateManager) {
        this.channelStateManager.updateChannel(params.channelId, channelState);
      }

      // Emit event
      this.emit('channel_closed', { channelId: params.channelId, state: channelState, txHash });

      return {
        channelId: params.channelId,
        state: channelState,
        txHash,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reasonCode = mapErrorToReasonCode(error);
      return {
        channelId: params.channelId,
        fallback: {
          enabled: true,
          reasonCode,
          message: `Channel close failed: ${message}`,
        },
      };
    }
  }

  /**
   * Send an offchain transfer through an open state channel.
   *
   * Validates the transfer amount against the sender's channel allocation,
   * sends a signed transfer message to ClearNode, and returns the updated allocations.
   *
   * Requirements: 6.1, 6.2, 6.3, 6.4
   *
   * @param params - Transfer parameters (destination, allocations with asset/amount)
   * @returns YellowTransferResult with success and updated allocations, or fallback on failure
   */
  async transfer(params: TransferParams): Promise<YellowTransferResult> {
    // Check connection state
    if (!this.connection || !this.connection.isConnected) {
      return {
        success: false,
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Not connected to ClearNode',
        },
      };
    }

    // Ensure session is authenticated
    if (!this.sessionManager) {
      return {
        success: false,
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Session manager not initialized - call connect() first',
        },
      };
    }

    try {
      await this.sessionManager.ensureAuthenticated();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_AUTH_FAILED',
          message: `Authentication failed: ${message}`,
        },
      };
    }

    // Requirement 6.3: Validate transfer amount against sender's channel allocation
    if (this.channelStateManager) {
      for (const allocation of params.allocations) {
        const openChannel = this.channelStateManager.findOpenChannel(allocation.asset);
        if (openChannel) {
          // Find the sender's allocation in the channel
          const walletAddress = this.walletClient.account?.address ?? '0x0';
          const senderAllocation = openChannel.allocations.find(
            (a) => a.destination.toLowerCase() === walletAddress.toLowerCase() && a.token.toLowerCase() === allocation.asset.toLowerCase()
          );
          const senderBalance = senderAllocation ? BigInt(senderAllocation.amount) : 0n;
          const transferAmount = BigInt(allocation.amount);

          if (transferAmount > senderBalance) {
            return {
              success: false,
              fallback: {
                enabled: true,
                reasonCode: 'INSUFFICIENT_CHANNEL_BALANCE',
                message: `Transfer amount ${allocation.amount} exceeds sender's channel allocation ${senderBalance.toString()} for asset ${allocation.asset}`,
              },
            };
          }
        }
      }
    }

    try {
      // Requirement 6.1: Send signed transfer message to ClearNode
      const transferMsg = JSON.stringify({
        method: 'transfer',
        params: {
          destination: params.destination,
          allocations: params.allocations,
        },
      });

      let clearNodeResponse: ClearNodeChannelResponse;
      try {
        clearNodeResponse = await this.connection.sendAndWait<ClearNodeChannelResponse>(
          transferMsg,
          'transfer',
          this.config.messageTimeout
        );
      } catch (error) {
        // Requirement 6.4: Timeout reason code; use centralized mapping (Requirements 13.1, 13.4)
        const message = error instanceof Error ? error.message : String(error);
        const reasonCode = mapErrorToReasonCode(error);
        return {
          success: false,
          fallback: {
            enabled: true,
            reasonCode,
            message: `ClearNode transfer failed: ${message}`,
          },
        };
      }

      // Check for error in ClearNode response
      if (clearNodeResponse.error) {
        const errorMsg = clearNodeResponse.error.toLowerCase();
        if (errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
          return {
            success: false,
            fallback: {
              enabled: true,
              reasonCode: 'INSUFFICIENT_CHANNEL_BALANCE',
              message: `Transfer rejected: ${clearNodeResponse.error}`,
            },
          };
        }
        return {
          success: false,
          fallback: {
            enabled: true,
            reasonCode: 'YELLOW_UNAVAILABLE',
            message: `Transfer rejected by ClearNode: ${clearNodeResponse.error}`,
          },
        };
      }

      // Requirement 6.2: Return transfer result with updated allocations
      const updatedAllocations = clearNodeResponse.data?.allocations ?? params.allocations.map((a) => ({
        destination: params.destination,
        token: a.asset,
        amount: a.amount,
      }));

      // Update local channel state cache with new allocations
      if (this.channelStateManager && clearNodeResponse.data?.channelId) {
        const existingState = this.channelStateManager.getChannel(clearNodeResponse.data.channelId);
        if (existingState) {
          this.channelStateManager.updateChannel(clearNodeResponse.data.channelId, {
            ...existingState,
            allocations: updatedAllocations,
            stateVersion: clearNodeResponse.data.stateVersion ?? existingState.stateVersion + 1,
            stateIntent: 'OPERATE',
            updatedAt: Math.floor(Date.now() / 1000),
          });
        }
      }

      // Emit event
      this.emit('transfer_completed', { destination: params.destination, allocations: updatedAllocations });

      return {
        success: true,
        updatedAllocations,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reasonCode = mapErrorToReasonCode(error);
      return {
        success: false,
        fallback: {
          enabled: true,
          reasonCode,
          message: `Transfer failed: ${message}`,
        },
      };
    }
  }

  /**
   * Execute an intent via Yellow Network clearing.
   *
   * Validates the intent parameters, finds or creates a state channel for the
   * intent's token/chain, submits the intent for solver matching via ClearNode,
   * normalizes the solver quote into a YellowQuote, and returns a YellowExecutionResult
   * with the clearing result on success.
   *
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   *
   * @param params - Intent parameters (sourceChain, destinationChain, tokenIn, tokenOut, amountIn required)
   * @returns YellowExecutionResult with clearing result on success; fallback on failure
   */
  async executeIntent(params: IntentParams): Promise<YellowExecutionResult> {
    const now = Date.now();

    // ========================================================================
    // Step 1: Validate IntentParams (Requirement 8.5)
    // Required fields: sourceChain, destinationChain, tokenIn, tokenOut, amountIn
    // Return fallback without creating a channel on validation failure.
    // ========================================================================
    const requiredFields: Array<keyof IntentParams> = [
      'sourceChain',
      'destinationChain',
      'tokenIn',
      'tokenOut',
      'amountIn',
    ];

    const missingFields = requiredFields.filter((field) => {
      const value = params[field];
      return value === undefined || value === null || String(value).trim() === '';
    });

    if (missingFields.length > 0) {
      return {
        provider: 'fallback',
        timestamp: now,
        fallback: {
          enabled: true,
          reasonCode: 'MISSING_PARAMS',
          message: `Missing required intent parameters: ${missingFields.join(', ')}`,
        },
      };
    }

    // Validate supported chains - check that chainId in config matches or that
    // the chains are not obviously invalid (non-empty strings already validated above)
    // For now, we validate that sourceChain and destinationChain are non-numeric garbage
    // A more sophisticated check could validate against a known chain registry
    if (typeof params.sourceChain !== 'string' || typeof params.destinationChain !== 'string') {
      return {
        provider: 'fallback',
        timestamp: now,
        fallback: {
          enabled: true,
          reasonCode: 'UNSUPPORTED_CHAIN',
          message: `Unsupported chain: sourceChain and destinationChain must be strings`,
        },
      };
    }

    // ========================================================================
    // Step 2: Ensure connection and authentication
    // ========================================================================
    if (!this.connection || !this.connection.isConnected) {
      return {
        provider: 'fallback',
        timestamp: now,
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Not connected to ClearNode',
        },
      };
    }

    if (!this.sessionManager) {
      return {
        provider: 'fallback',
        timestamp: now,
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Session manager not initialized - call connect() first',
        },
      };
    }

    try {
      await this.sessionManager.ensureAuthenticated();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        provider: 'fallback',
        timestamp: now,
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_AUTH_FAILED',
          message: `Authentication failed: ${message}`,
        },
      };
    }

    // ========================================================================
    // Step 3: Find or create a state channel (Requirement 8.1)
    // ========================================================================
    let channel: ChannelState | undefined;

    if (this.channelStateManager) {
      channel = this.channelStateManager.findOpenChannel(params.tokenIn);
    }

    if (!channel) {
      // Create a new channel for this token/chain
      const createResult = await this.createChannel({
        chainId: this.config.chainId,
        token: params.tokenIn,
      });

      if (createResult.fallback) {
        return {
          provider: 'fallback',
          timestamp: now,
          fallback: createResult.fallback,
        };
      }

      channel = createResult.state;
    }

    const channelId = channel?.channelId ?? '';

    // ========================================================================
    // Step 4: Submit intent for solver matching via ClearNode
    // ========================================================================
    try {
      const intentMsg = JSON.stringify({
        method: 'submit_intent',
        params: {
          sourceChain: params.sourceChain,
          destinationChain: params.destinationChain,
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          minAmountOut: params.minAmountOut,
          deadline: params.deadline,
          channelId,
        },
      });

      let clearNodeResponse: ClearNodeIntentResponse;
      try {
        clearNodeResponse = await this.connection.sendAndWait<ClearNodeIntentResponse>(
          intentMsg,
          'submit_intent',
          this.config.messageTimeout
        );
      } catch (error) {
        // Check if this is a timeout (Requirement 8.4: NO_SOLVER_QUOTES on timeout)
        const message = error instanceof Error ? error.message : String(error);
        const baseReasonCode = mapErrorToReasonCode(error);
        // For intent submission, timeouts specifically mean no solver quotes were received
        const reasonCode = baseReasonCode === 'YELLOW_TIMEOUT' ? 'NO_SOLVER_QUOTES' : baseReasonCode;
        return {
          provider: 'fallback',
          channelId,
          timestamp: now,
          fallback: {
            enabled: true,
            reasonCode,
            message: reasonCode === 'NO_SOLVER_QUOTES'
              ? `No solver quotes received within timeout: ${message}`
              : `ClearNode submit_intent failed: ${message}`,
          },
        };
      }

      // Check for error in ClearNode response
      if (clearNodeResponse.error) {
        return {
          provider: 'fallback',
          channelId,
          timestamp: now,
          fallback: {
            enabled: true,
            reasonCode: 'NO_SOLVER_QUOTES',
            message: `Intent submission rejected: ${clearNodeResponse.error}`,
          },
        };
      }

      // ====================================================================
      // Step 5: Normalize solver quote into YellowQuote (Requirement 8.2)
      // ====================================================================
      const responseData = clearNodeResponse.data;
      const intentId = responseData?.intentId ?? `intent-${now}`;

      if (!responseData?.quote) {
        return {
          provider: 'fallback',
          intentId,
          channelId,
          timestamp: now,
          fallback: {
            enabled: true,
            reasonCode: 'NO_SOLVER_QUOTES',
            message: 'No solver quotes received from ClearNode',
          },
        };
      }

      const quoteTimestamp = Math.floor(now / 1000);
      // Apply toSerializableYellowQuote to ensure BigInt values from ClearNode
      // are converted to strings for JSON compatibility (Requirement 11.2)
      const quote: YellowQuote = toSerializableYellowQuote({
        solverId: responseData.quote.solverId ?? 'unknown',
        channelId,
        amountIn: responseData.quote.amountIn ?? params.amountIn,
        amountOut: responseData.quote.amountOut ?? params.minAmountOut,
        estimatedTime: responseData.quote.estimatedTime ?? 60,
        timestamp: quoteTimestamp,
      });

      // Emit quote received event
      this.emit('quote_received', { intentId, quote });

      // ====================================================================
      // Step 6: Build ClearingResult if clearing data is present (Requirement 8.3)
      // ====================================================================
      let clearing: ClearingResult | undefined;

      if (responseData.clearing) {
        const clearingData = responseData.clearing;
        clearing = {
          channelId: clearingData.channelId ?? channelId,
          matchedAmountIn: clearingData.matchedAmountIn ?? quote.amountIn,
          matchedAmountOut: clearingData.matchedAmountOut ?? quote.amountOut,
          netSettlement: clearingData.netSettlement ?? '0',
          timestamp: Math.floor(now / 1000),
        };

        // Include settlement proof if available
        if (clearingData.settlementProof) {
          clearing.settlementProof = {
            stateHash: clearingData.settlementProof.stateHash ?? '',
            signatures: clearingData.settlementProof.signatures ?? [],
            txHash: clearingData.settlementProof.txHash,
            finalAllocations: clearingData.settlementProof.finalAllocations ?? [],
          };
        }

        // Emit clearing completed event
        this.emit('clearing_completed', { intentId, clearing });
      }

      // ====================================================================
      // Step 7: Return YellowExecutionResult (Requirement 8.1)
      // ====================================================================
      return {
        provider: 'yellow',
        intentId,
        quote,
        clearing,
        channelId,
        timestamp: now,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reasonCode = mapErrorToReasonCode(error);
      return {
        provider: 'fallback',
        channelId,
        timestamp: now,
        fallback: {
          enabled: true,
          reasonCode,
          message: `Intent execution failed: ${message}`,
        },
      };
    }
  }

  /**
   * Query channel list and balances.
   *
   * When connected to ClearNode, sends a get_ledger_balances message and parses
   * the response into ChannelState objects, updating the local cache.
   * When disconnected, falls back to the ChannelStateManager's cached data.
   *
   * Requirements: 7.1, 7.4
   *
   * @returns YellowChannelsResult with the list of channels
   */
  async getChannels(): Promise<YellowChannelsResult> {
    // Requirement 7.4: Fall back to cached on-chain data if disconnected
    if (!this.connection || !this.connection.isConnected) {
      if (this.channelStateManager) {
        const cachedChannels = this.channelStateManager.getAllChannels();
        return {
          channels: cachedChannels,
        };
      }
      return {
        channels: [],
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Not connected to ClearNode and no cached channel data available',
        },
      };
    }

    try {
      // Requirement 7.1: Send get_ledger_balances to ClearNode
      const queryMsg = JSON.stringify({
        method: 'get_ledger_balances',
        params: {},
      });

      interface LedgerBalancesResponse {
        method?: string;
        error?: string;
        data?: {
          channels?: Array<{
            channelId: string;
            status: 'VOID' | 'INITIAL' | 'ACTIVE' | 'DISPUTE' | 'FINAL';
            chainId: number;
            token: string;
            allocations: ChannelAllocation[];
            stateVersion: number;
            stateIntent: string;
            stateHash?: string;
            adjudicator: string;
            challengePeriod: number;
            challengeExpiration?: number;
            createdAt: number;
            updatedAt: number;
          }>;
        };
      }

      let clearNodeResponse: LedgerBalancesResponse;
      try {
        clearNodeResponse = await this.connection.sendAndWait<LedgerBalancesResponse>(
          queryMsg,
          'get_ledger_balances',
          this.config.messageTimeout
        );
      } catch (error) {
        // On timeout or error, fall back to cached data
        const message = error instanceof Error ? error.message : String(error);
        if (this.channelStateManager) {
          const cachedChannels = this.channelStateManager.getAllChannels();
          if (cachedChannels.length > 0) {
            return {
              channels: cachedChannels,
            };
          }
        }
        // Use centralized mapping (Requirements 13.1, 13.4)
        const reasonCode = mapErrorToReasonCode(error);
        return {
          channels: [],
          fallback: {
            enabled: true,
            reasonCode,
            message: `ClearNode get_ledger_balances failed: ${message}`,
          },
        };
      }

      // Parse response into ChannelState array
      // Apply toSerializableChannelState to ensure BigInt values are converted
      // to strings for JSON compatibility (Requirements 11.1, 11.5)
      const channels: ChannelState[] = (clearNodeResponse.data?.channels ?? []).map((ch) =>
        toSerializableChannelState({
          channelId: ch.channelId,
          status: ch.status,
          chainId: ch.chainId,
          token: ch.token,
          allocations: ch.allocations,
          stateVersion: ch.stateVersion,
          stateIntent: ch.stateIntent,
          stateHash: ch.stateHash,
          adjudicator: ch.adjudicator,
          challengePeriod: ch.challengePeriod,
          challengeExpiration: ch.challengeExpiration,
          createdAt: ch.createdAt,
          updatedAt: ch.updatedAt,
        })
      );

      // Update local cache with fresh data
      if (this.channelStateManager) {
        for (const channel of channels) {
          this.channelStateManager.updateChannel(channel.channelId, channel);
        }
      }

      return {
        channels,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Fall back to cached data on unexpected errors
      if (this.channelStateManager) {
        const cachedChannels = this.channelStateManager.getAllChannels();
        if (cachedChannels.length > 0) {
          return {
            channels: cachedChannels,
          };
        }
      }
      const reasonCode = mapErrorToReasonCode(error);
      return {
        channels: [],
        fallback: {
          enabled: true,
          reasonCode,
          message: `Failed to query channels: ${message}`,
        },
      };
    }
  }

  /**
   * Query a specific channel's on-chain state.
   *
   * Queries the on-chain custody contract via ChannelStateManager.queryOnChainBalances
   * for authoritative balance data, and also checks the local cache for additional
   * channel metadata.
   *
   * Requirements: 7.2, 7.3
   *
   * @param channelId - The channel identifier to query
   * @returns YellowChannelResult with the channel state
   */
  async getChannelState(channelId: string): Promise<YellowChannelResult> {
    if (!this.channelStateManager) {
      return {
        channelId,
        fallback: {
          enabled: true,
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Channel state manager not initialized - call connect() first',
        },
      };
    }

    // Check local cache first for channel metadata
    const cachedState = this.channelStateManager.getChannel(channelId);

    // Requirement 7.2: Query on-chain custody contract for authoritative balances
    try {
      const tokens = cachedState
        ? [cachedState.token]
        : [];

      if (tokens.length > 0) {
        const onChainBalances = await this.channelStateManager.queryOnChainBalances(channelId, tokens);

        // Merge on-chain balances with cached state
        // Apply toSerializableChannelState to ensure BigInt values from on-chain queries
        // are converted to strings for JSON compatibility (Requirements 11.1, 11.5)
        if (cachedState) {
          const updatedAllocations = cachedState.allocations.map((alloc, index) => ({
            ...alloc,
            amount: index < onChainBalances.length ? onChainBalances[index].toString() : alloc.amount,
          }));

          const updatedState: ChannelState = toSerializableChannelState({
            ...cachedState,
            allocations: updatedAllocations,
            updatedAt: Math.floor(Date.now() / 1000),
          });

          // Update cache with on-chain data
          this.channelStateManager.updateChannel(channelId, updatedState);

          return {
            channelId,
            state: updatedState,
          };
        }
      }
    } catch {
      // On-chain query failed - fall through to return cached data if available
    }

    // Return cached state if available (even without on-chain refresh)
    if (cachedState) {
      return {
        channelId,
        state: cachedState,
      };
    }

    // No cached state and no on-chain data available
    return {
      channelId,
      fallback: {
        enabled: true,
        reasonCode: 'YELLOW_UNAVAILABLE',
        message: `No channel state found for channel ${channelId}`,
      },
    };
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  /**
   * Emit an event to all registered handlers.
   *
   * @param event - The event type to emit
   * @param data - The data to pass to handlers
   */
  private emit(event: YellowEvent, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch {
          // Swallow handler errors to prevent one handler from breaking others
        }
      }
    }
  }

  /**
   * Simulate an on-chain transaction via NitroliteClient.
   *
   * Since NitroliteClient is a stub, this generates a deterministic transaction hash
   * based on the operation and channel ID. In production, this would call the actual
   * NitroliteClient methods (createChannel, resizeChannel, closeChannel, withdraw).
   *
   * @param operation - The on-chain operation name
   * @param channelId - The channel identifier
   * @returns A simulated transaction hash
   */
  private simulateOnChainTransaction(operation: string, channelId: string): string {
    // In production, this would dispatch to the real NitroliteClient:
    // - 'createChannel' → this.nitroliteClient.createChannel(...)
    // - 'resizeChannel' → this.nitroliteClient.resizeChannel(...)
    // - 'closeChannel' → this.nitroliteClient.closeChannel(...)
    // - 'withdraw' → this.nitroliteClient.withdraw(...)
    //
    // Since NitroliteClient is a stub, generate a deterministic tx hash.
    const timestamp = Date.now();
    const hashInput = `${operation}:${channelId}:${timestamp}`;
    // Simple hash: use the hex encoding of the operation+channelId+timestamp
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  }

  /**
   * Get the internal NitroliteClient instance.
   * Exposed for testing and advanced use cases.
   */
  getNitroliteClient(): NitroliteClient {
    return this.nitroliteClient;
  }

  /**
   * Get the resolved configuration with defaults applied.
   * Exposed for testing.
   */
  getResolvedConfig(): Readonly<typeof this.config> {
    return this.config;
  }
}
