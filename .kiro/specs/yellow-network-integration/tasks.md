# Implementation Plan: Yellow Network Integration

## Overview

This plan implements the Yellow Network integration into the JACK SDK following the design document. Tasks are ordered to build foundational types and utilities first, then core components (connection, session, channel management), then the main provider, and finally dashboard integration. Each task builds on previous ones with no orphaned code.

## Tasks

- [ ] 1. Set up Yellow module structure and types
  - [ ] 1.1 Create `packages/sdk/src/yellow/types.ts` with all Yellow type definitions
    - Define YellowProviderStatus, YellowReasonCode, YellowFallback, ChannelState, ChannelAllocation, YellowQuote, ClearingResult, SettlementProof, all result types, event types, and param types
    - _Requirements: 11.1, 11.2, 11.5_
  - [ ] 1.2 Create `packages/sdk/src/yellow/event-mapper.ts` with event-to-status mapping functions
    - Implement mapYellowEvent, mapChannelStatus, mapStateIntent, and inferMapping
    - Extract mapping tables from the existing dashboard route.ts into pure functions
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ] 1.3 Write property test for event-to-status mapping
    - **Property 11: Event-to-status mapping is correct and complete**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

- [ ] 2. Implement ClearNode WebSocket connection manager
  - [ ] 2.1 Create `packages/sdk/src/yellow/clear-node-connection.ts`
    - Implement ClearNodeConnection class with connect, disconnect, send, sendAndWait, onMessage
    - Implement request-response correlation using method name matching
    - Implement exponential backoff reconnection logic
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ] 2.2 Write property test for exponential backoff
    - **Property 12: Reconnection uses exponential backoff**
    - **Validates: Requirements 10.2**
  - [ ] 2.3 Write property test for request-response correlation
    - **Property 13: Request-response correlation is correct under concurrency**
    - **Validates: Requirements 10.5**

- [ ] 3. Implement session key management
  - [ ] 3.1 Create `packages/sdk/src/yellow/session-key-manager.ts`
    - Implement SessionKeyManager class with authenticate, isAuthenticated, sessionSigner, invalidate
    - Implement session key generation using viem's generatePrivateKey and privateKeyToAccount
    - Implement auth_request → auth_challenge → auth_verify flow using @erc7824/nitrolite message factories
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [ ] 3.2 Write property tests for session key management
    - **Property 2: Session keypairs are unique**
    - **Validates: Requirements 2.1**
  - [ ] 3.3 Write property test for auth request message structure
    - **Property 3: Auth request message contains required fields**
    - **Validates: Requirements 2.2**

- [ ] 4. Implement channel state manager
  - [ ] 4.1 Create `packages/sdk/src/yellow/channel-state-manager.ts`
    - Implement ChannelStateManager class with updateChannel, getChannel, getAllChannels, queryOnChainBalances, findOpenChannel, clear
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 4.2 Write property test for ChannelState structural invariant
    - **Property 4: ChannelState structural invariant**
    - **Validates: Requirements 7.3, 3.3**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement YellowProvider core
  - [ ] 6.1 Create `packages/sdk/src/yellow/yellow-provider.ts`
    - Implement YellowProvider class constructor with YellowConfig validation and NitroliteClient initialization
    - Implement connect() and disconnect() methods orchestrating ClearNodeConnection and SessionKeyManager
    - Implement event emitter pattern (on/off) for YellowEvent types
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 10.1_
  - [ ] 6.2 Implement channel lifecycle methods on YellowProvider
    - Implement createChannel: send create_channel to ClearNode, submit on-chain via NitroliteClient, return ChannelState
    - Implement resizeChannel: send resize_channel to ClearNode, submit on-chain, return updated ChannelState
    - Implement closeChannel: send close_channel to ClearNode, submit on-chain, optionally withdraw, return ChannelState
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 6.3 Implement transfer and query methods on YellowProvider
    - Implement transfer: send signed transfer message to ClearNode, return result
    - Implement getChannels: query ClearNode for ledger balances, return channel list
    - Implement getChannelState: query on-chain custody contract, return ChannelState
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_
  - [ ] 6.4 Implement executeIntent method on YellowProvider
    - Implement intent execution flow: validate params → find/create channel → submit for solver matching → return clearing result
    - Implement fallback handling for all error paths
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ] 6.5 Write property test for challenge duration conversion
    - **Property 1: Challenge duration is converted to BigInt**
    - **Validates: Requirements 1.3**
  - [ ] 6.6 Write property tests for channel operations
    - **Property 5: Resize preserves channel identity and updates allocations**
    - **Property 6: Close produces FINAL status**
    - **Validates: Requirements 4.3, 5.3**
  - [ ] 6.7 Write property test for transfer validation
    - **Property 7: Transfer exceeding channel balance is rejected**
    - **Validates: Requirements 6.3**
  - [ ] 6.8 Write property tests for intent execution normalization
    - **Property 8: YellowQuote normalization produces complete objects**
    - **Property 9: ClearingResult contains required settlement data**
    - **Property 10: Invalid intent params produce fallback without channel creation**
    - **Validates: Requirements 8.2, 8.3, 8.5**

- [ ] 7. Implement serialization and error handling
  - [ ] 7.1 Add BigInt-to-string serialization in ChannelState and YellowQuote construction
    - Ensure all BigInt values from NitroliteClient responses are converted to strings in public types
    - _Requirements: 11.1, 11.2, 11.5_
  - [ ] 7.2 Implement error reason code mapping in YellowProvider
    - Map WebSocket errors to YELLOW_UNAVAILABLE, on-chain reverts to YELLOW_TX_FAILED, auth failures to YELLOW_AUTH_FAILED, timeouts to YELLOW_TIMEOUT
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [ ] 7.3 Write property tests for serialization round-trips
    - **Property 14: ChannelState JSON round-trip**
    - **Property 15: YellowQuote JSON round-trip**
    - **Validates: Requirements 11.3, 11.4**
  - [ ] 7.4 Write property test for error reason code mapping
    - **Property 16: Error reason codes are correctly mapped**
    - **Validates: Requirements 13.1, 13.2, 13.4**

- [ ] 8. Integrate YellowProvider into JACK_SDK and barrel exports
  - [ ] 8.1 Update `packages/sdk/src/index.ts` to export all Yellow types and classes
    - Add exports for YellowProvider, YellowConfig, all Yellow types, and event mapper functions
    - _Requirements: 1.6, 1.7_
  - [ ] 8.2 Extend JACK_SDK class with optional `yellow` property
    - Add YellowConfig to JACK_SDK constructor config
    - Conditionally create YellowProvider when YellowConfig is provided
    - _Requirements: 1.6, 1.7_
  - [ ] 8.3 Write unit tests for JACK_SDK Yellow integration
    - Test SDK creates YellowProvider when config provided
    - Test SDK does not create YellowProvider when config omitted
    - _Requirements: 1.6, 1.7_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Dashboard integration
  - [ ] 10.1 Create `apps/dashboard/src/lib/yellow.ts` dashboard utility
    - Implement initYellowProvider and getYellowProvider wrapper functions
    - Import YellowProvider from @jack-kernel/sdk
    - _Requirements: 12.3_
  - [ ] 10.2 Enhance dashboard intent route to update YellowProvider state on notifications
    - Update the existing provider notification handler in route.ts to additionally update YellowProvider's local channel state when available
    - _Requirements: 12.2_
  - [ ] 10.3 Write unit tests for dashboard Yellow integration
    - Test notification processing updates YellowProvider state
    - Test dashboard utility initialization
    - _Requirements: 12.2, 12.3_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `@erc7824/nitrolite` package must be added as a dependency to `packages/sdk/package.json`
- WebSocket implementation should use the `ws` package (Node.js) with browser WebSocket fallback
