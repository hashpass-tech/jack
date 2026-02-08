# Requirements Document

## Introduction

This specification defines the requirements for completing the Uniswap v4 hooks integration with the JACK SDK and deploying to Sepolia testnet to meet the evaluation criteria for two prize tracks: Yellow Network Prize Track ($15,000) and Uniswap Foundation Prize Track ($10,000). The system must demonstrate end-to-end integration of state channel workflows, policy enforcement via Uniswap v4 hooks, and settlement execution with verifiable on-chain proof.

## Glossary

- **JACK_SDK**: The TypeScript SDK for JACK cross-chain execution kernel
- **JACKPolicyHook**: Uniswap v4 hook contract that enforces slippage and policy guardrails at settlement time
- **JACKSettlementAdapter**: Settlement adapter contract that integrates Uniswap v4 unlock/callback execution
- **Yellow_Network**: State channel network provider for instant, session-based off-chain transfers
- **YellowProvider**: SDK provider class for Yellow Network integration
- **LiFi**: Cross-chain DEX aggregation provider for quote and route discovery
- **Intent**: A cross-chain execution request with source/destination chains, tokens, amounts, and deadline
- **State_Channel**: Off-chain payment channel that enables instant transfers without on-chain transactions
- **Settlement**: The process of finalizing off-chain state on-chain via smart contract execution
- **Sepolia**: Ethereum testnet used for deployment and testing
- **ETHGlobal**: Hackathon platform hosting the prize tracks

## Requirements

### Requirement 1: Yellow Network Integration

**User Story:** As a developer, I want to integrate Yellow Network SDK with JACK, so that I can demonstrate instant off-chain transfers with on-chain settlement proof for the Yellow Network prize track.

#### Acceptance Criteria

1. WHEN the SDK is initialized with Yellow configuration, THE System SHALL create a YellowProvider instance with custody address, adjudicator address, chain ID, and wallet client
2. WHEN a state channel is created, THE System SHALL initialize a session with a counterparty, asset address, and initial allocation amount
3. WHEN an off-chain transfer is executed, THE System SHALL update the channel state without broadcasting an on-chain transaction
4. WHEN a channel is closed, THE System SHALL settle the final state on-chain and return a settlement transaction hash
5. THE System SHALL provide a runnable demo script that initializes Yellow SDK, creates a session, performs off-chain transfers, and closes with on-chain settlement
6. THE System SHALL capture and log evidence of off-chain state updates and final on-chain settlement
7. THE System SHALL integrate Yellow Network workflows with JACK intent execution flow

### Requirement 2: Uniswap v4 Contract Deployment

**User Story:** As a developer, I want to deploy JACKPolicyHook and JACKSettlementAdapter to Sepolia testnet, so that I can provide verifiable transaction hashes for the Uniswap Foundation prize track.

#### Acceptance Criteria

1. WHEN deploying to Sepolia, THE System SHALL deploy JACKPolicyHook contract with a valid PoolManager address
2. WHEN deploying to Sepolia, THE System SHALL deploy JACKSettlementAdapter contract with the deployed JACKPolicyHook address
3. WHEN deployment completes, THE System SHALL capture and store the deployment transaction hashes
4. WHEN deployment completes, THE System SHALL capture and store the deployed contract addresses
5. THE System SHALL provide deployment scripts that automate the Sepolia deployment process
6. THE System SHALL verify deployed contracts on Sepolia Etherscan

### Requirement 3: End-to-End Integration Testing

**User Story:** As a developer, I want to execute end-to-end flows with deployed contracts, so that I can capture testnet transaction hashes demonstrating v4 hook and settlement adapter execution.

#### Acceptance Criteria

1. WHEN an intent is created with Uniswap v4 settlement, THE System SHALL generate intent parameters with policy requirements
2. WHEN a policy is registered, THE System SHALL call JACKPolicyHook.setPolicy with intent ID, min amount out, deadline, and updater address
3. WHEN settlement is executed, THE System SHALL call JACKSettlementAdapter.settleIntent with intent, pool key, swap params, and quoted amount
4. WHEN settlement executes, THE System SHALL trigger JACKPolicyHook.beforeSwap to validate policy compliance
5. WHEN settlement completes, THE System SHALL emit IntentSettled event with intent ID and solver address
6. THE System SHALL capture all transaction hashes from policy registration and settlement execution
7. THE System SHALL provide integration test scripts that execute the complete flow on Sepolia

### Requirement 4: SDK Integration with Deployed Contracts

**User Story:** As a developer, I want to integrate deployed contracts with the SDK, so that I can create intents that settle via Uniswap v4 hooks.

#### Acceptance Criteria

1. WHEN the SDK is configured with contract addresses, THE System SHALL store JACKPolicyHook and JACKSettlementAdapter addresses
2. WHEN creating an intent with v4 settlement, THE System SHALL include hook data with intent ID and quoted amount out
3. WHEN submitting an intent, THE System SHALL interact with deployed contracts via viem wallet client
4. THE System SHALL provide SDK configuration examples showing contract address setup
5. THE System SHALL provide intent creation examples demonstrating v4 settlement flow
6. THE System SHALL provide helper functions for encoding hook data and settlement parameters

### Requirement 5: Comprehensive Examples and Documentation

**User Story:** As a developer, I want comprehensive examples and documentation, so that I can understand and run the complete integration flow.

#### Acceptance Criteria

1. THE System SHALL provide a Yellow Network demo script showing SDK initialization, channel creation, off-chain transfers, and settlement
2. THE System SHALL provide a Uniswap v4 demo script showing policy registration, intent creation, and settlement execution
3. THE System SHALL provide integration examples combining Yellow Network and Uniswap v4 flows
4. THE System SHALL document all contract addresses and transaction hashes in a centralized location
5. THE System SHALL provide step-by-step deployment guides for Sepolia testnet
6. THE System SHALL provide usage tutorials with code examples and expected outputs
7. THE System SHALL document LiFi integration for cross-chain quote discovery in v4 settlement scenarios

### Requirement 6: Demo Video Creation

**User Story:** As a developer, I want to create demo videos for both prize tracks, so that I can provide visual proof of integration for ETHGlobal submission.

#### Acceptance Criteria

1. WHEN creating the Yellow Network demo video, THE System SHALL show Yellow SDK initialization, session creation, off-chain transfers, and on-chain settlement
2. WHEN creating the Uniswap v4 demo video, THE System SHALL show policy registration, intent settlement, and hook execution
3. THE Yellow_Network demo video SHALL be 2-3 minutes in length
4. THE Uniswap_v4 demo video SHALL be 3 minutes or less in length
5. THE System SHALL publish demo video links in README and documentation
6. THE System SHALL include demo video scripts with narration and key demonstration points

### Requirement 7: Prize Track Submission Documentation

**User Story:** As a developer, I want to document prize track submission metadata, so that I can ensure compliance with ETHGlobal requirements.

#### Acceptance Criteria

1. THE System SHALL create a Prize Track Readiness document summarizing compliance status for both tracks
2. THE Yellow_Network submission SHALL document track selection, repository link, demo video link, and integration proof
3. THE Uniswap_Foundation submission SHALL document track selection (Agentic Finance, Privacy DeFi, or both), repository link, demo video link, and testnet transaction hashes
4. THE System SHALL provide a checklist of all deliverables for each prize track
5. THE System SHALL document any missing components or gaps in prize track readiness
6. THE System SHALL include submission metadata in repository documentation

### Requirement 8: Integration Test Suite

**User Story:** As a developer, I want comprehensive integration tests, so that I can validate end-to-end flows before submission.

#### Acceptance Criteria

1. WHEN running integration tests, THE System SHALL test Yellow Network channel creation, transfers, and settlement
2. WHEN running integration tests, THE System SHALL test Uniswap v4 policy registration and enforcement
3. WHEN running integration tests, THE System SHALL test settlement adapter execution with hook validation
4. WHEN running integration tests, THE System SHALL test SDK integration with deployed contracts
5. WHEN running integration tests, THE System SHALL test LiFi quote integration with v4 settlement
6. THE System SHALL provide test scripts that can run against Sepolia testnet
7. THE System SHALL validate all transaction hashes and contract interactions in tests
