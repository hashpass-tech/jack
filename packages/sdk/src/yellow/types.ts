/**
 * Yellow Network Integration - Shared Type Definitions
 *
 * This module defines all shared types for the Yellow Network integration layer.
 * All BigInt-representable fields (allocations, challenge duration) use string type
 * for JSON compatibility (Requirements 11.1, 11.2, 11.5).
 *
 * Requirements: 7.3, 11.1, 11.2, 11.5
 */

// ============================================================================
// Provider Status and Reason Codes
// ============================================================================

/**
 * Connection status of the YellowProvider to ClearNode.
 */
export type YellowProviderStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Reason codes for Yellow Network operation failures.
 * Used in YellowFallback to indicate why an operation failed.
 */
export type YellowReasonCode =
  | 'MISSING_PARAMS'
  | 'UNSUPPORTED_CHAIN'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_CHANNEL_BALANCE'
  | 'NO_SOLVER_QUOTES'
  | 'YELLOW_UNAVAILABLE'
  | 'YELLOW_TX_FAILED'
  | 'YELLOW_AUTH_FAILED'
  | 'YELLOW_TIMEOUT'
  | 'YELLOW_CHANNEL_DISPUTE'
  | 'YELLOW_WS_ERROR';

/**
 * Fallback information returned when a Yellow Network operation cannot be completed.
 * The `enabled: true` flag indicates that fallback to an alternative provider is recommended.
 */
export interface YellowFallback {
  enabled: true;
  reasonCode: YellowReasonCode;
  message: string;
}

// ============================================================================
// Channel Types
// ============================================================================

/**
 * Normalized representation of a state channel's current status, allocations, and metadata.
 * Requirement 7.3: includes channelId, status, allocations per participant, token address, and chainId.
 */
export interface ChannelState {
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
}

/**
 * A single allocation within a state channel, mapping a participant to a token amount.
 * The `amount` field is a string representation of a BigInt for JSON compatibility (Requirement 11.5).
 */
export interface ChannelAllocation {
  destination: string;
  token: string;
  amount: string; // BigInt serialized as string
}

// ============================================================================
// Quote and Clearing Types
// ============================================================================

/**
 * A normalized solver quote received via ClearNode.
 * All amount fields use string type for JSON compatibility.
 */
export interface YellowQuote {
  solverId: string;
  channelId: string;
  amountIn: string;
  amountOut: string;
  estimatedTime: number;
  timestamp: number;
}

/**
 * The outcome of an offchain clearing operation.
 * Contains matched orders and net settlement amounts.
 */
export interface ClearingResult {
  channelId: string;
  matchedAmountIn: string;
  matchedAmountOut: string;
  netSettlement: string;
  settlementProof?: SettlementProof;
  timestamp: number;
}

/**
 * On-chain evidence of a completed settlement.
 * Includes the final state hash, participant signatures, and optional transaction hash.
 */
export interface SettlementProof {
  stateHash: string;
  signatures: string[];
  txHash?: string;
  finalAllocations: ChannelAllocation[];
}

// ============================================================================
// Result Types (never-throw pattern)
// ============================================================================

/**
 * Result of a ClearNode connection and authentication attempt.
 */
export interface YellowConnectionResult {
  connected: boolean;
  sessionAddress?: string;
  fallback?: YellowFallback;
}

/**
 * Result of a channel lifecycle operation (create, resize, close, or query).
 */
export interface YellowChannelResult {
  channelId?: string;
  state?: ChannelState;
  txHash?: string;
  fallback?: YellowFallback;
}

/**
 * Result of an offchain transfer operation.
 */
export interface YellowTransferResult {
  success: boolean;
  updatedAllocations?: ChannelAllocation[];
  fallback?: YellowFallback;
}

/**
 * Result of executing an intent via Yellow Network clearing.
 * The `provider` field indicates whether Yellow or a fallback provider handled the intent.
 */
export interface YellowExecutionResult {
  provider: 'yellow' | 'fallback';
  intentId?: string;
  quote?: YellowQuote;
  clearing?: ClearingResult;
  channelId?: string;
  timestamp: number;
  fallback?: YellowFallback;
}

/**
 * Result of querying the list of channels and their balances.
 */
export interface YellowChannelsResult {
  channels: ChannelState[];
  fallback?: YellowFallback;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by the YellowProvider during its lifecycle.
 */
export type YellowEvent =
  | 'connected'
  | 'disconnected'
  | 'channel_created'
  | 'channel_resized'
  | 'channel_closed'
  | 'transfer_completed'
  | 'quote_received'
  | 'clearing_completed'
  | 'error';

/**
 * Handler function for YellowProvider events.
 */
export type YellowEventHandler = (data: unknown) => void;

// ============================================================================
// Parameter Types
// ============================================================================

/**
 * Parameters for creating a new state channel.
 */
export interface CreateChannelParams {
  chainId: number;
  token: string;
}

/**
 * Parameters for resizing a channel's allocations.
 * The `allocateAmount` field is a string representation of a BigInt for JSON compatibility.
 */
export interface ResizeChannelParams {
  channelId: string;
  allocateAmount: string;
  fundsDestination?: string;
}

/**
 * Parameters for closing a state channel.
 */
export interface CloseChannelParams {
  channelId: string;
  withdraw?: boolean;
}

/**
 * Parameters for sending an offchain transfer through a state channel.
 * Allocation amounts are string representations of BigInt for JSON compatibility.
 */
export interface TransferParams {
  destination: string;
  allocations: Array<{ asset: string; amount: string }>;
}
