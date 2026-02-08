# Requirements Document

## Introduction

This feature integrates Yellow Network's Nitrolite SDK (`@erc7824/nitrolite`) into the JACK cross-chain execution kernel at the SDK level (`packages/sdk/`). The integration creates a `YellowProvider` module (following the LifiProvider pattern) that wraps Yellow Network's state channel protocol for trustless clearing and settlement. This replaces the current notification-only Yellow integration in the dashboard with active SDK-level state channel management, solver quote discovery, and offchain settlement capabilities.

Yellow Network uses ERC-7824 state channels to enable offchain, bridge-less cross-chain execution. Participants open state channels by locking collateral into a custody contract, execute trades offchain via a ClearNode WebSocket connection, and settle only net outcomes on-chain. The JACK integration wraps this lifecycle into a provider module that plugs into the existing intent flow.

## Glossary

- **JACK_SDK**: The main SDK class in `packages/sdk` that orchestrates intent management, execution tracking, cost tracking, and agent utilities.
- **YellowProvider**: A new module in `packages/sdk` that wraps the `@erc7824/nitrolite` SDK to provide state channel management, clearing, and settlement capabilities.
- **NitroliteClient**: The client class from `@erc7824/nitrolite` that handles on-chain state channel operations (create, resize, close) via viem wallet/public clients.
- **ClearNode**: Yellow Network's offchain relay server that brokers state channel messages between participants via WebSocket.
- **State_Channel**: An offchain communication pathway between two participants, identified by a deterministic channel ID, with on-chain collateral backing.
- **Channel_Lifecycle**: The sequence of states a channel traverses: VOID → INITIAL → ACTIVE → (optionally DISPUTE) → FINAL.
- **State_Intent**: The purpose of a state update within a channel: INITIALIZE, OPERATE, RESIZE, or FINALIZE.
- **Custody_Contract**: The on-chain smart contract that holds collateral for state channels and enforces final settlement.
- **Adjudicator_Contract**: The on-chain smart contract that resolves disputes by verifying state proofs and enforcing challenge periods.
- **Session_Key**: A temporary keypair generated for signing offchain messages, authorized by the main wallet via EIP-712.
- **Allocation**: A mapping of participant addresses to token amounts within a state channel, representing the current balance distribution.
- **YellowConfig**: Configuration object for initializing the YellowProvider with ClearNode URL, contract addresses, chain settings, and session parameters.
- **ChannelState**: A normalized representation of a state channel's current status, allocations, and metadata.
- **ClearingResult**: The outcome of an offchain clearing operation, containing matched orders and net settlement amounts.
- **SettlementProof**: On-chain evidence of a completed settlement, including the final state and signatures.

## Requirements

### Requirement 1: Yellow SDK Configuration and Initialization

**User Story:** As a developer using the JACK SDK, I want to configure and initialize the Yellow Network SDK with the correct contract addresses and ClearNode connection, so that all Yellow operations use consistent configuration.

#### Acceptance Criteria

1. WHEN the YellowProvider is instantiated with a YellowConfig, THE YellowProvider SHALL initialize a NitroliteClient from `@erc7824/nitrolite` with the provided custody and adjudicator contract addresses
2. WHEN no ClearNode URL is provided in YellowConfig, THE YellowProvider SHALL default to the sandbox endpoint `wss://clearnet-sandbox.yellow.com/ws`
3. WHEN a challenge duration is provided in YellowConfig, THE YellowProvider SHALL pass it to the NitroliteClient as a BigInt value in seconds
4. WHEN no challenge duration is provided, THE YellowProvider SHALL default to 3600 seconds (1 hour)
5. IF the NitroliteClient initialization fails, THEN THE YellowProvider SHALL throw a descriptive error including the failure reason
6. WHEN the JACK_SDK is initialized with a YellowConfig, THE JACK_SDK SHALL create a YellowProvider instance and expose it as a public readonly property
7. WHEN the JACK_SDK is initialized without a YellowConfig, THE JACK_SDK SHALL not create a YellowProvider instance
8. THE YellowConfig SHALL accept fields for ClearNode WebSocket URL, custody contract address, adjudicator contract address, chain ID, challenge duration, RPC URL, and session expiry duration

### Requirement 2: Session Key Management

**User Story:** As a developer using the JACK SDK, I want the YellowProvider to manage session keys for offchain signing, so that I can authenticate with ClearNode without exposing my main wallet key for every message.

#### Acceptance Criteria

1. WHEN a new session is requested, THE YellowProvider SHALL generate a fresh session keypair using viem's `generatePrivateKey` and `privateKeyToAccount`
2. WHEN authenticating with ClearNode, THE YellowProvider SHALL send an `auth_request` message containing the session key address, token allowances, expiry timestamp, and application scope
3. WHEN ClearNode responds with an `auth_challenge`, THE YellowProvider SHALL sign the challenge using EIP-712 typed data with the main wallet signer
4. WHEN ClearNode responds with `auth_verify` confirmation, THE YellowProvider SHALL store the session key and mark the session as authenticated
5. IF authentication fails or times out, THEN THE YellowProvider SHALL return a descriptive error with the failure reason
6. WHEN a session expires, THE YellowProvider SHALL re-authenticate automatically on the next operation that requires an active session

### Requirement 3: State Channel Creation

**User Story:** As a developer using the JACK SDK, I want to create state channels with counterparties, so that I can establish offchain communication pathways for trustless clearing.

#### Acceptance Criteria

1. WHEN a channel creation is requested with a chain ID and token address, THE YellowProvider SHALL send a `create_channel` message to ClearNode via WebSocket
2. WHEN ClearNode responds with channel parameters (channel ID, initial state, server signature), THE YellowProvider SHALL submit the channel creation transaction on-chain via the NitroliteClient
3. WHEN the on-chain transaction is confirmed, THE YellowProvider SHALL return a ChannelState object containing the channel ID, status, allocations, and transaction hash
4. IF the on-chain channel creation transaction fails, THEN THE YellowProvider SHALL return a descriptive error including the transaction hash and failure reason
5. IF the ClearNode WebSocket message times out, THEN THE YellowProvider SHALL return a descriptive error with a timeout reason code

### Requirement 4: State Channel Resize (Funding and Defunding)

**User Story:** As a developer using the JACK SDK, I want to resize state channel allocations, so that I can fund channels from my unified balance or adjust collateral during operation.

#### Acceptance Criteria

1. WHEN a channel resize is requested with a channel ID and allocation amount, THE YellowProvider SHALL send a `resize_channel` message to ClearNode
2. WHEN ClearNode responds with the resize state and server signature, THE YellowProvider SHALL submit the resize transaction on-chain via the NitroliteClient
3. WHEN the on-chain resize transaction is confirmed, THE YellowProvider SHALL return an updated ChannelState with the new allocations
4. IF the resize transaction fails on-chain, THEN THE YellowProvider SHALL return a descriptive error including the failure reason
5. IF the user has insufficient unified balance for the requested allocation, THEN THE YellowProvider SHALL return an error with reason code "INSUFFICIENT_BALANCE"

### Requirement 5: State Channel Close and Withdrawal

**User Story:** As a developer using the JACK SDK, I want to close state channels and withdraw funds, so that I can finalize offchain positions and recover collateral on-chain.

#### Acceptance Criteria

1. WHEN a channel close is requested with a channel ID, THE YellowProvider SHALL send a `close_channel` message to ClearNode
2. WHEN ClearNode responds with the final state and server signature, THE YellowProvider SHALL submit the close transaction on-chain via the NitroliteClient
3. WHEN the on-chain close transaction is confirmed, THE YellowProvider SHALL return a ChannelState with status FINAL and the close transaction hash
4. WHEN a withdrawal is requested after channel close, THE YellowProvider SHALL call the custody contract's withdrawal function for the specified token and amount
5. IF the channel is in DISPUTE status, THEN THE YellowProvider SHALL return an error indicating the channel cannot be closed until the dispute is resolved

### Requirement 6: Offchain Transfer via State Channels

**User Story:** As a developer using the JACK SDK, I want to send offchain transfers through open state channels, so that I can execute instant, gas-free value transfers.

#### Acceptance Criteria

1. WHEN an offchain transfer is requested with a destination address, asset, and amount, THE YellowProvider SHALL send a signed transfer message to ClearNode
2. WHEN ClearNode confirms the transfer, THE YellowProvider SHALL return a transfer result containing the updated allocations
3. IF the transfer amount exceeds the sender's channel allocation, THEN THE YellowProvider SHALL return an error with reason code "INSUFFICIENT_CHANNEL_BALANCE"
4. IF the ClearNode transfer message times out, THEN THE YellowProvider SHALL return an error with a timeout reason code

### Requirement 7: Channel Status and Balance Queries

**User Story:** As a developer using the JACK SDK, I want to query channel status and balances, so that I can monitor channel health and available liquidity.

#### Acceptance Criteria

1. WHEN a channel list is requested, THE YellowProvider SHALL send a `get_ledger_balances` message to ClearNode and return the list of channels with their statuses and allocations
2. WHEN a specific channel status is requested by channel ID, THE YellowProvider SHALL query the on-chain custody contract for the channel's current balances
3. THE ChannelState SHALL include channel ID, status (VOID, INITIAL, ACTIVE, DISPUTE, or FINAL), allocations per participant, token address, and chain ID
4. WHEN the ClearNode WebSocket is disconnected, THE YellowProvider SHALL fall back to on-chain queries for channel data

### Requirement 8: Intent Execution via Yellow Network

**User Story:** As a developer using the JACK SDK, I want to execute cross-chain intents through Yellow Network's clearing protocol, so that intents are fulfilled using trustless, bridge-less offchain settlement.

#### Acceptance Criteria

1. WHEN valid IntentParams are provided to the YellowProvider, THE YellowProvider SHALL open a state channel (or reuse an existing open channel), submit the intent for solver matching, and return a clearing result
2. WHEN a solver quote is received via ClearNode, THE YellowProvider SHALL normalize it into a YellowQuote object containing solver ID, amount in, amount out, estimated time, and channel ID
3. WHEN the clearing is completed offchain, THE YellowProvider SHALL return a ClearingResult containing the matched amounts, net settlement, and settlement proof
4. IF no solver quotes are received within the configured timeout, THEN THE YellowProvider SHALL return a fallback result with reason code "NO_SOLVER_QUOTES"
5. IF the intent parameters fail validation (missing fields, unsupported chains), THEN THE YellowProvider SHALL return a fallback result with the appropriate reason code without initiating a channel

### Requirement 9: Yellow Network Event-to-Status Mapping

**User Story:** As a developer using the JACK SDK, I want Yellow Network events mapped to JACK execution statuses, so that the intent lifecycle reflects actual backend outcomes.

#### Acceptance Criteria

1. WHEN a `quote_accepted` or `solver_quoted` event is received, THE YellowProvider SHALL map it to ExecutionStatus QUOTED
2. WHEN an `execution_started` or `routing_started` event is received, THE YellowProvider SHALL map it to ExecutionStatus EXECUTING
3. WHEN a `settlement_submitted` event is received, THE YellowProvider SHALL map it to ExecutionStatus SETTLING
4. WHEN a `settled` or `settlement_finalized` event is received, THE YellowProvider SHALL map it to ExecutionStatus SETTLED
5. WHEN a `failed`, `expired`, or `canceled` event is received, THE YellowProvider SHALL map it to the corresponding terminal ExecutionStatus (ABORTED or EXPIRED)
6. WHEN a channel lifecycle event (`created`, `joined`, `opened`, `challenged`, `checkpointed`, `resized`, `closed`) is received, THE YellowProvider SHALL map it to the appropriate ExecutionStatus and include ERC-7824 metadata

### Requirement 10: WebSocket Connection Management

**User Story:** As a developer using the JACK SDK, I want the YellowProvider to manage the ClearNode WebSocket connection reliably, so that offchain operations are resilient to transient disconnections.

#### Acceptance Criteria

1. WHEN the YellowProvider connects to ClearNode, THE YellowProvider SHALL establish a WebSocket connection and emit a connected event
2. WHEN the WebSocket connection drops unexpectedly, THE YellowProvider SHALL attempt reconnection with exponential backoff up to a configurable maximum number of retries
3. WHEN all reconnection attempts are exhausted, THE YellowProvider SHALL emit a disconnected event and mark the provider as unavailable
4. WHEN the YellowProvider is disposed, THE YellowProvider SHALL close the WebSocket connection and clean up all pending message handlers
5. THE YellowProvider SHALL use a request-response correlation mechanism to match outgoing WebSocket messages with their responses

### Requirement 11: Yellow Data Serialization

**User Story:** As a developer using the JACK SDK, I want Yellow Network data types to be serializable to and from JSON, so that they can be cached, logged, and transmitted.

#### Acceptance Criteria

1. THE YellowProvider SHALL produce ChannelState objects that are serializable to JSON using `JSON.stringify`
2. THE YellowProvider SHALL produce YellowQuote objects that are serializable to JSON using `JSON.stringify`
3. FOR ALL valid ChannelState objects, serializing to JSON then parsing back SHALL produce an equivalent object (round-trip property)
4. FOR ALL valid YellowQuote objects, serializing to JSON then parsing back SHALL produce an equivalent object (round-trip property)
5. WHEN a ChannelState contains BigInt values (allocations, challenge duration), THE Serializer SHALL convert them to string representation for JSON compatibility

### Requirement 12: Dashboard Integration

**User Story:** As a dashboard developer, I want the dashboard to use the SDK-level Yellow integration for active state channel operations, so that the dashboard can display real-time channel state and initiate clearing operations.

#### Acceptance Criteria

1. WHEN the dashboard displays an intent executed via Yellow Network, THE Dashboard SHALL show the state channel ID, channel status, and current allocations from the YellowProvider
2. WHEN the dashboard receives a Yellow Network provider notification, THE Dashboard SHALL continue to process it through the existing notification handler and additionally update the YellowProvider's local channel state
3. WHEN the dashboard needs to initiate a Yellow Network clearing operation, THE Dashboard SHALL call the YellowProvider from `@jack-kernel/sdk` instead of relying solely on notification ingestion
4. THE Dashboard SHALL display settlement proofs including final state hash, signatures, and on-chain transaction hash for settled intents

### Requirement 13: Error Handling and Fallback

**User Story:** As a developer using the JACK SDK, I want robust error handling for Yellow Network operations, so that failures are reported clearly and the system degrades gracefully.

#### Acceptance Criteria

1. WHEN a Yellow Network operation fails due to a WebSocket error, THE YellowProvider SHALL return a result with reason code "YELLOW_UNAVAILABLE"
2. WHEN a Yellow Network operation fails due to an on-chain transaction revert, THE YellowProvider SHALL return a result with reason code "YELLOW_TX_FAILED" and include the revert reason
3. WHEN a Yellow Network operation fails due to authentication failure, THE YellowProvider SHALL return a result with reason code "YELLOW_AUTH_FAILED"
4. WHEN a Yellow Network operation times out, THE YellowProvider SHALL return a result with reason code "YELLOW_TIMEOUT"
5. IF the ClearNode is unavailable, THEN THE YellowProvider SHALL report the provider as unavailable and allow the JACK_SDK to fall back to alternative providers (e.g., LifiProvider)
