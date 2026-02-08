# Implementation Plan: Yellow Network Integration

## Overview

This plan implements the Yellow Network integration into the JACK SDK (`packages/sdk`) as a `YellowProvider` module following the design document. Tasks are ordered to build foundational types first, then internal components (connection, session, channel state management), then the main provider class, then SDK integration and barrel exports, and finally dashboard enhancements. Each task builds on previous ones with no orphaned code.

## Tasks

- [x] 1. Create Yellow type definitions and event mapper
  - [x] 1.1 Create `packages/sdk/src/yellow/types.ts` with all shared type definitions
    - Define YellowProviderStatus, YellowReasonCode, YellowFallback, ChannelState, ChannelAllocation, YellowQuote, ClearingResult, SettlementProof
    - Define all result types: YellowConnectionResult, YellowChannelResult, YellowTransferResult, YellowExecutionResult, YellowChannelsResult
    - Define YellowEvent, YellowEventHandler, and all param types: CreateChannelParams, ResizeChannelParams, CloseChannelParams, TransferParams
    - Ensure all BigInt-representable fields (allocations, challenge duration) use string type for JSON compatibility
    - _Requirements: 7.3, 11.1, 11.2, 11.5_
  - [x] 1.2 Create `packages/sdk/src/yellow/event-mapper.ts` with event-to-status mapping functions
    - Implement mapYellowEvent, mapChannelStatus, mapStateIntent, and inferMapping as pure functions returning MappedEvent objects
    - Extract the mapping tables from the existing `apps/dashboard/src/app/api/intents/route.ts` EVENT_STATUS_MAP, CHANNEL_STATUS_MAP, and STATE_INTENT_MAP into SDK-level pure functions
    - Include isTerminal flag: true only for SETTLED, ABORTED, EXPIRED statuses
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [x] 1.3 Write property test for event-to-status mapping in `packages/sdk/tests/property/yellow-event-mapper.property.test.ts`
    - **Property 11: Event-to-status mapping is correct and complete**
    - Test all known Yellow event names, channel statuses, and state intents produce the correct ExecutionStatus and isTerminal flag
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

- [x] 2. Implement ClearNodeConnection WebSocket manager
  - [x] 2.1 Create `packages/sdk/src/yellow/clear-node-connection.ts`
    - Implement ClearNodeConnection class with connect, disconnect, send, sendAndWait, onMessage, isConnected
    - Implement request-response correlation using method name matching for sendAndWait
    - Implement exponential backoff reconnection: delay = initialDelay * 2^(attempt-1), up to maxReconnectAttempts
    - Emit connected/disconnected events; mark provider unavailable when all retries exhausted
    - Clean up all pending message handlers on disconnect
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 2.2 Write property test for exponential backoff in `packages/sdk/tests/property/yellow-connection.property.test.ts`
    - **Property 12: Reconnection uses exponential backoff**
    - For any sequence of N failed reconnection attempts, verify delay before attempt K equals initialDelay * 2^(K-1)
    - **Validates: Requirements 10.2**
  - [x] 2.3 Write property test for request-response correlation in `packages/sdk/tests/property/yellow-connection.property.test.ts`
    - **Property 13: Request-response correlation is correct under concurrency**
    - For any set of concurrent sendAndWait calls, each response is delivered to the correct caller with no cross-talk
    - **Validates: Requirements 10.5**

- [x] 3. Implement SessionKeyManager
  - [x] 3.1 Create `packages/sdk/src/yellow/session-key-manager.ts`
    - Implement SessionKeyManager class with authenticate, isAuthenticated, sessionSigner, sessionAddress, invalidate
    - Generate session keypair using viem's generatePrivateKey and privateKeyToAccount
    - Implement auth flow: send auth_request → receive auth_challenge → sign with main wallet via EIP-712 → send auth_verify → receive confirmation
    - Use @erc7824/nitrolite message factories (createAuthRequestMessage, createEIP712AuthMessageSigner) for message construction
    - Track session expiry and support auto-reauthentication on next operation when expired
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 3.2 Write property test for session key uniqueness in `packages/sdk/tests/property/yellow-session.property.test.ts`
    - **Property 2: Session keypairs are unique**
    - For any N >= 2 session key generation requests, all generated session addresses are distinct
    - **Validates: Requirements 2.1**
  - [x] 3.3 Write property test for auth request message structure in `packages/sdk/tests/property/yellow-session.property.test.ts`
    - **Property 3: Auth request message contains required fields**
    - For any set of token allowances and expiry timestamp, the auth_request message contains session key address, allowances, expiry, and scope
    - **Validates: Requirements 2.2**

- [x] 4. Implement ChannelStateManager
  - [x] 4.1 Create `packages/sdk/src/yellow/channel-state-manager.ts`
    - Implement ChannelStateManager class with updateChannel, getChannel, getAllChannels, queryOnChainBalances, findOpenChannel, clear
    - Use viem PublicClient for on-chain balance queries against the custody contract
    - Maintain local cache of channel states; fall back to on-chain queries when WebSocket is disconnected
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 4.2 Write property test for ChannelState structural invariant in `packages/sdk/tests/property/yellow-channel-state.property.test.ts`
    - **Property 4: ChannelState structural invariant**
    - For any ChannelState returned by the provider, it contains non-empty channelId, valid status, at least one allocation with destination/token/amount, token address, and chainId
    - **Validates: Requirements 7.3, 3.3**

- [x] 5. Checkpoint - Ensure all foundation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement YellowProvider core class
  - [x] 6.1 Create `packages/sdk/src/yellow/yellow-provider.ts` with constructor and connection methods
    - Implement YellowProvider constructor: validate YellowConfig, initialize NitroliteClient with custody/adjudicator addresses and viem clients
    - Apply defaults: clearNodeUrl to "wss://clearnet-sandbox.yellow.com/ws", challengeDuration to 3600, sessionExpiry to 3600
    - Convert challengeDuration to BigInt when passing to NitroliteClient
    - Throw descriptive error if NitroliteClient initialization fails
    - Implement connect(): establish ClearNodeConnection, authenticate via SessionKeyManager
    - Implement disconnect(): close WebSocket, clean up handlers
    - Implement event emitter pattern (on/off) for YellowEvent types
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 10.1_
  - [x] 6.2 Implement channel lifecycle methods on YellowProvider
    - createChannel: send create_channel to ClearNode via sendAndWait, submit on-chain via NitroliteClient, return ChannelState with channelId/status/allocations/txHash
    - resizeChannel: send resize_channel to ClearNode, submit on-chain resize, return updated ChannelState
    - closeChannel: send close_channel to ClearNode, submit on-chain close, optionally call custody withdrawal, return ChannelState with FINAL status
    - Return error with YELLOW_CHANNEL_DISPUTE if channel is in DISPUTE status on close attempt
    - Return error with INSUFFICIENT_BALANCE if resize exceeds unified balance
    - Return error with YELLOW_TX_FAILED on on-chain transaction revert, YELLOW_TIMEOUT on ClearNode message timeout
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 6.3 Implement transfer and query methods on YellowProvider
    - transfer: send signed transfer message to ClearNode, return YellowTransferResult with updated allocations
    - Return error with INSUFFICIENT_CHANNEL_BALANCE if transfer exceeds sender's channel allocation
    - Return error with YELLOW_TIMEOUT on ClearNode message timeout
    - getChannels: send get_ledger_balances to ClearNode, return YellowChannelsResult; fall back to on-chain queries if disconnected
    - getChannelState: query on-chain custody contract via ChannelStateManager, return YellowChannelResult
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_
  - [x] 6.4 Implement executeIntent method on YellowProvider
    - Validate IntentParams (sourceChain, destinationChain, tokenIn, tokenOut, amountIn required); return fallback with MISSING_PARAMS or UNSUPPORTED_CHAIN on failure without creating a channel
    - Find or create a state channel for the intent's token/chain
    - Submit intent for solver matching via ClearNode
    - Normalize solver quote into YellowQuote (solverId, channelId, amountIn, amountOut, estimatedTime, timestamp)
    - Return YellowExecutionResult with clearing result on success
    - Return fallback with NO_SOLVER_QUOTES if no quotes received within timeout
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 6.5 Write property test for challenge duration conversion in `packages/sdk/tests/property/yellow-config.property.test.ts`
    - **Property 1: Challenge duration is converted to BigInt**
    - For any positive integer challenge duration, NitroliteClient receives it as a BigInt equal to the original
    - **Validates: Requirements 1.3**
  - [x] 6.6 Write property tests for channel operations in `packages/sdk/tests/property/yellow-channel-state.property.test.ts`
    - **Property 5: Resize preserves channel identity and updates allocations**
    - **Property 6: Close produces FINAL status**
    - **Validates: Requirements 4.3, 5.3**
  - [x] 6.7 Write property test for transfer validation in `packages/sdk/tests/property/yellow-transfer.property.test.ts`
    - **Property 7: Transfer exceeding channel balance is rejected**
    - For any transfer where amount exceeds sender's allocation, result has success: false and reasonCode INSUFFICIENT_CHANNEL_BALANCE
    - **Validates: Requirements 6.3**
  - [x] 6.8 Write property tests for intent execution normalization in `packages/sdk/tests/property/yellow-normalization.property.test.ts`
    - **Property 8: YellowQuote normalization produces complete objects**
    - **Property 9: ClearingResult contains required settlement data**
    - **Property 10: Invalid intent params produce fallback without channel creation**
    - **Validates: Requirements 8.2, 8.3, 8.5**

- [ ] 7. Implement serialization and error handling
  - [x] 7.1 Add BigInt-to-string serialization in ChannelState and YellowQuote construction paths
    - Ensure all BigInt values from NitroliteClient responses are converted to string in public-facing types
    - Verify ChannelState and YellowQuote are JSON-serializable via JSON.stringify
    - _Requirements: 11.1, 11.2, 11.5_
  - [x] 7.2 Implement error reason code mapping across all YellowProvider methods
    - WebSocket errors → YELLOW_UNAVAILABLE
    - On-chain transaction reverts → YELLOW_TX_FAILED with revert reason
    - Authentication failures → YELLOW_AUTH_FAILED
    - Message timeouts → YELLOW_TIMEOUT
    - ClearNode unavailable → YELLOW_UNAVAILABLE, report provider unavailable for JACK_SDK fallback to LifiProvider
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [x] 7.3 Write property tests for serialization round-trips in `packages/sdk/tests/property/yellow-serialization.property.test.ts`
    - **Property 14: ChannelState JSON round-trip**
    - **Property 15: YellowQuote JSON round-trip**
    - For any valid ChannelState/YellowQuote, JSON.parse(JSON.stringify(obj)) produces a deeply equal object
    - **Validates: Requirements 11.3, 11.4**
  - [x] 7.4 Write property test for error reason code mapping in `packages/sdk/tests/property/yellow-error-handling.property.test.ts`
    - **Property 16: Error reason codes are correctly mapped**
    - For any Yellow operation failure, the fallback reason code matches the error type
    - **Validates: Requirements 13.1, 13.2, 13.4**

- [x] 8. Integrate YellowProvider into JACK_SDK and barrel exports
  - [x] 8.1 Update `packages/sdk/src/index.ts` with Yellow exports
    - Export YellowProvider class and YellowConfig type
    - Export all Yellow types from types.ts
    - Export mapYellowEvent, mapChannelStatus, mapStateIntent, inferMapping from event-mapper.ts
    - _Requirements: 1.6, 1.7_
  - [x] 8.2 Extend JACK_SDK class with optional `yellow` property
    - Add optional YellowConfig (with walletClient) to JACK_SDK constructor config
    - Conditionally create YellowProvider instance when YellowConfig is provided
    - Expose as `public readonly yellow?: YellowProvider`
    - Do not create YellowProvider when config.yellow is undefined
    - _Requirements: 1.6, 1.7_
  - [x] 8.3 Write unit tests for JACK_SDK Yellow integration in `packages/sdk/tests/unit/jack-sdk-yellow.test.ts`
    - Test JACK_SDK creates YellowProvider when yellow config is provided
    - Test JACK_SDK does not create YellowProvider when yellow config is omitted
    - _Requirements: 1.6, 1.7_

- [x] 9. Checkpoint - Ensure all SDK tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Dashboard integration
  - [x] 10.1 Create `apps/dashboard/src/lib/yellow.ts` dashboard utility
    - Implement initYellowProvider and getYellowProvider singleton wrapper functions
    - Import YellowProvider and YellowConfig from @jack-kernel/sdk
    - _Requirements: 12.3_
  - [x] 10.2 Enhance `apps/dashboard/src/app/api/intents/route.ts` to update YellowProvider state on notifications
    - When a provider notification is processed and a YellowProvider instance is available, additionally call the provider's channel state manager to update local state
    - Preserve existing notification ingestion path for backward compatibility
    - _Requirements: 12.2_
  - [x] 10.3 Write unit tests for dashboard Yellow integration
    - Test notification processing updates YellowProvider local channel state when provider is available
    - Test dashboard utility initialization and singleton behavior
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–16)
- Unit tests validate specific examples and edge cases
- The `@erc7824/nitrolite` package must be added as a dependency to `packages/sdk/package.json`
- All property tests use `fast-check` with `@fast-check/vitest` (already installed) and run minimum 100 iterations
- Each property test is tagged: `Feature: yellow-network-integration, Property {N}: {title}`
