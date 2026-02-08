# Implementation Plan: Uniswap v4 Prize Track Integration

## Overview

This implementation plan breaks down the Uniswap v4 prize track integration into discrete coding tasks. The plan prioritizes deployment to Sepolia testnet first, then SDK integration, demo scripts, integration tests, and documentation to meet the requirements for both Yellow Network and Uniswap Foundation prize tracks.

**Upgrade Strategy**: For testnet/development, we use a simple "deploy new version" pattern rather than complex proxy patterns. Each deployment creates a new contract instance with updated logic. The deployment artifacts track version history, and the SDK/scripts reference the latest deployed addresses.

## Tasks

- [x] 1. Deploy contracts to Sepolia testnet (PRIORITY) ✅ COMPLETED
  - [x] 1.1 Prepare deployment environment ✅
    - ✅ Verified contracts/.env has PRIVATE_DEPLOYER key
    - ✅ Created contracts/.env.sepolia with Sepolia RPC URL, chain ID, and PoolManager address
    - ✅ Confirmed Sepolia ETH balance (0.699 ETH available)
    - ✅ Secured private keys (removed from .env, created .env.example)
    - _Requirements: 2.1, 2.2_
    - **Status**: Complete

  - [x] 1.2 Create deployment script for both contracts ✅
    - ✅ Created contracts/script/DeploySepolia.s.sol with CREATE2 and HookMiner
    - ✅ Implemented hook address mining for correct beforeSwap flag
    - ✅ Deploy JACKPolicyHook with PoolManager address using CREATE2
    - ✅ Deploy JACKSettlementAdapter with JACKPolicyHook address
    - ✅ Log deployment addresses, transaction hashes, and CREATE2 salt
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
    - **Status**: Complete

  - [x] 1.3 Create deployment artifacts storage ✅
    - ✅ Created contracts/deployments/sepolia/ directory
    - ✅ Implemented deployment-{timestamp}.json format
    - ✅ Stored: contract addresses, tx hashes, block numbers, deployer, timestamp, CREATE2 salt
    - ✅ Created latest.json pointing to most recent deployment
    - _Requirements: 2.3, 2.4, 2.5_
    - **Status**: Complete

  - [x] 1.4 Create deployment wrapper script ✅
    - ✅ Created scripts/contracts/deploy-sepolia.sh bash script
    - ✅ Loads environment from contracts/.env.sepolia
    - ✅ Executes forge script with proper parameters
    - ✅ Captures output and saves to deployment artifacts JSON
    - ✅ Displays deployment summary with Sepolia Etherscan links
    - _Requirements: 2.5_
    - **Status**: Complete

  - [x] 1.5 Execute deployment to Sepolia ✅
    - ✅ Ran deploy-sepolia.sh script successfully
    - ✅ Verified deployment transactions on Sepolia Etherscan
    - ✅ Confirmed contract addresses are accessible
    - ✅ Saved deployment artifacts to contracts/deployments/sepolia/
    - **Deployed Contracts**:
      - JACKPolicyHook: `0xE8142B1Ff0DA631866fec5771f4291CbCe718080`
      - JACKSettlementAdapter: `0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A`
    - **Transaction Hashes**:
      - JACKPolicyHook: `0xfe8a64c351c62df57919d79b85a952bacb5dd410e684d6342e01f060ef18929e`
      - JACKSettlementAdapter: `0xf9ce7f6309ce153e66bc4e2160ae5338e6db3fc82e77edc7fadef3ab567098f5`
    - **Block Number**: 10,215,727
    - **Gas Used**: ~6,664,040 gas (~0.0134 ETH)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
    - **Status**: Complete

  - [x] 1.6 Verify contracts on Sepolia Etherscan ✅
    - ✅ Created scripts/contracts/verify-sepolia.sh script
    - ✅ Contracts automatically verified on Sourcify during deployment
    - ✅ Verification status: exact_match for both contracts
    - ✅ Etherscan links:
      - JACKPolicyHook: https://sepolia.etherscan.io/address/0xE8142B1Ff0DA631866fec5771f4291CbCe718080#code
      - JACKSettlementAdapter: https://sepolia.etherscan.io/address/0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A#code
    - _Requirements: 2.6_
    - **Status**: Complete

- [ ] 2. Implement simple upgrade pattern for testnet
  - [ ] 2.1 Create upgrade deployment script
    - Create contracts/script/UpgradeSepolia.s.sol
    - Deploy new versions of contracts with same constructor parameters
    - Save new deployment artifacts with version increment
    - Update latest.json to point to new deployment
    - _Requirements: 2.5_

  - [ ] 2.2 Create upgrade documentation
    - Document upgrade process: deploy new version, update references
    - Document version tracking in deployment artifacts
    - Document how SDK/scripts reference latest.json for addresses
    - Note: For mainnet, consider proxy patterns (out of scope for testnet)
    - _Requirements: 5.5_

- [ ] 3. Set up project structure and dependencies
  - Create directory structure for v4 integration in packages/sdk/src/v4/
  - Create directory structure for demo scripts in scripts/prize-tracks/
  - Ensure contracts/deployments/sepolia/ exists (from task 1.3)
  - Add required dependencies (viem, @lifi/sdk already present)
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 4. Implement V4Provider SDK integration
  - [ ] 4.1 Create V4Provider class with contract interaction methods
    - Implement constructor accepting V4Config and WalletClient
    - Load contract addresses from deployment artifacts (latest.json)
    - Implement registerPolicy method for JACKPolicyHook.setPolicy calls
    - Implement settleIntent method for JACKSettlementAdapter.settleIntent calls
    - Implement encodeHookData helper for ABI encoding intent ID and quoted amount
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [ ] 4.2 Write property test for V4Provider initialization
    - **Property 10: V4 Configuration Storage**
    - **Validates: Requirements 4.1**

  - [ ] 4.3 Write property test for hook data encoding
    - **Property 11: Hook Data Encoding**
    - **Validates: Requirements 4.2**

  - [ ] 4.4 Write property test for hook data helper functions
    - **Property 13: Hook Data Helper Functions**
    - **Validates: Requirements 4.6**

- [ ] 5. Implement Yellow Network demo script
  - [ ] 5. Implement Yellow Network demo script
  - [ ] 5.1 Create runYellowDemo function
    - Initialize JACK_SDK with Yellow configuration
    - Create state channel with test counterparty
    - Execute 3-5 off-chain transfers with logging
    - Close channel and capture settlement transaction hash
    - Display summary with off-chain state updates and on-chain proof
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1_

  - [ ] 5.2 Write property test for Yellow provider initialization
    - **Property 1: Yellow Provider Initialization**
    - **Validates: Requirements 1.1**

  - [ ] 5.3 Write property test for channel creation
    - **Property 2: Channel Creation**
    - **Validates: Requirements 1.2**

  - [ ] 5.4 Write property test for off-chain state updates
    - **Property 3: Off-Chain State Updates**
    - **Validates: Requirements 1.3, 1.6**

  - [ ] 5.5 Write property test for channel settlement round trip
    - **Property 4: Channel Settlement Round Trip**
    - **Validates: Requirements 1.4**

- [ ] 6. Checkpoint - Ensure Yellow Network integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Uniswap v4 demo script
  - [ ] 7.1 Create runV4Demo function
    - Initialize JACK_SDK with V4 configuration (load addresses from deployment artifacts)
    - Create intent with policy requirements
    - Register policy via JACKPolicyHook
    - Fetch quote via LiFi provider (optional)
    - Execute settlement via JACKSettlementAdapter
    - Capture policy registration and settlement transaction hashes
    - Display summary with transaction links and event logs
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.2_

  - [ ] 7.2 Write property test for V4 intent creation
    - **Property 6: V4 Intent Creation**
    - **Validates: Requirements 3.1**

  - [ ] 7.3 Write property test for policy registration
    - **Property 7: Policy Registration**
    - **Validates: Requirements 3.2**

  - [ ] 7.4 Write property test for settlement execution
    - **Property 8: Settlement Execution**
    - **Validates: Requirements 3.3, 3.4, 3.5**

  - [ ] 7.5 Write property test for transaction hash capture
    - **Property 9: Transaction Hash Capture**
    - **Validates: Requirements 3.6, 8.7**

- [ ] 8. Implement policy validation property tests
  - [ ] 8.1 Write property test for policy validation correctness
    - **Property 14: Policy Validation Correctness**
    - **Validates: Requirements 3.4**

  - [ ] 8.2 Write property test for slippage bound enforcement
    - **Property 15: Slippage Bound Enforcement**
    - **Validates: Requirements 3.4**

  - [ ] 8.3 Write property test for intent signature verification
    - **Property 16: Intent Signature Verification**
    - **Validates: Requirements 3.3**

  - [ ] 8.4 Write property test for settlement authorization
    - **Property 17: Settlement Authorization**
    - **Validates: Requirements 3.3**

  - [ ] 8.5 Write property test for intent deadline enforcement
    - **Property 18: Intent Deadline Enforcement**
    - **Validates: Requirements 3.3**

  - [ ] 8.6 Write property test for minimum amount enforcement
    - **Property 19: Minimum Amount Enforcement**
    - **Validates: Requirements 3.3**

  - [ ] 8.7 Write property test for event emission completeness
    - **Property 20: Event Emission Completeness**
    - **Validates: Requirements 3.5**

- [ ] 9. Checkpoint - Ensure Uniswap v4 integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Create integration test suite
  - [ ] 10. Create integration test suite
  - [ ] 10.1 Create Yellow Network integration tests
    - Test channel creation with test counterparty
    - Test multiple off-chain transfers
    - Test channel settlement and transaction hash capture
    - Test channel state validation
    - _Requirements: 8.1_

  - [ ] 10.2 Create Uniswap v4 integration tests
    - Test policy registration on Sepolia (using deployed contracts)
    - Test policy enforcement (valid and invalid cases)
    - Test settlement execution with hook validation
    - Test event emission and transaction hash capture
    - _Requirements: 8.2, 8.3_

  - [ ] 10.3 Create SDK integration tests
    - Test V4Provider contract interactions with deployed addresses
    - Test intent creation with v4 settlement
    - Test hook data encoding/decoding
    - Test transaction hash capture and storage
    - _Requirements: 8.4_

  - [ ] 10.4 Create LiFi integration tests
    - Test quote fetching for v4 settlement scenarios
    - Test route discovery for cross-chain intents
    - Test LiFi + v4 combined workflow
    - _Requirements: 8.5_

  - [ ] 10.5 Create combined workflow integration test
    - Test Yellow + v4 combined workflow
    - Test LiFi + v4 combined workflow
    - Test Yellow + LiFi + v4 end-to-end flow
    - _Requirements: 1.7, 5.3_

  - [ ] 10.6 Write property test for Yellow-Intent integration
    - **Property 5: Yellow-Intent Integration**
    - **Validates: Requirements 1.7**

  - [ ] 10.7 Write property test for contract interaction via wallet
    - **Property 12: Contract Interaction via Wallet**
    - **Validates: Requirements 4.3**

- [ ] 11. Create deployment and usage documentation
  - [ ] 11.1 Create Sepolia deployment guide
    - Document prerequisites (Foundry, Sepolia ETH, RPC URL)
    - Document deployment script usage (deploy-sepolia.sh)
    - Document contract verification process (verify-sepolia.sh)
    - Document deployment artifact structure (latest.json format)
    - Document upgrade process (deploy new version, update references)
    - _Requirements: 5.5_

  - [ ] 11.2 Create SDK usage examples
    - Document V4Provider initialization with deployed contract addresses
    - Document intent creation with v4 settlement
    - Document policy registration workflow
    - Document settlement execution workflow
    - _Requirements: 4.4, 4.5, 5.6_

  - [ ] 11.3 Create LiFi integration documentation
    - Document LiFi quote fetching for v4 scenarios
    - Document route discovery for cross-chain intents
    - Document LiFi + v4 combined workflow examples
    - _Requirements: 5.7_

  - [ ] 11.4 Create deployment artifacts documentation
    - Document contract addresses on Sepolia (from latest.json)
    - Document deployment transaction hashes
    - Document verification links on Sepolia Etherscan
    - Document version history and upgrade tracking
    - _Requirements: 5.4_

- [ ] 12. Create prize track submission documentation
  - [ ] 12.1 Create Prize Track Readiness document
    - Document Yellow Network track compliance status
    - Document Uniswap Foundation track compliance status
    - Document deliverables checklist for both tracks
    - Document missing components or gaps
    - _Requirements: 7.1, 7.4, 7.5_

  - [ ] 12.2 Create Yellow Network submission metadata
    - Document track selection and prize amount
    - Document repository URL and demo video URL
    - Document integration proof (SDK init, channel creation, transfers, settlement)
    - Document deliverables status (runnable demo, off-chain proof, on-chain proof, video, metadata)
    - _Requirements: 7.2_

  - [ ] 12.3 Create Uniswap Foundation submission metadata
    - Document track selection (Agentic Finance, Privacy DeFi, or both)
    - Document repository URL and demo video URL
    - Document testnet proof (deployment tx hashes from latest.json, policy registration, settlement execution)
    - Document deliverables status (contracts deployed, tx hashes, functional code, video, track selection)
    - _Requirements: 7.3_

  - [ ] 12.4 Create demo video scripts
    - Create Yellow Network demo script with narration and key points
    - Create Uniswap v4 demo script with narration and key points
    - Document video recording guidelines (length, content, format)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 13. Execute demo scripts and capture outputs
  - [ ] 13.1 Run Yellow Network demo script
    - Execute runYellowDemo with test configuration
    - Capture console output with state updates
    - Capture settlement transaction hash
    - Save demo output to documentation
    - _Requirements: 1.5, 5.1_

  - [ ] 13.2 Run Uniswap v4 demo script
    - Execute runV4Demo with deployed contract addresses (from latest.json)
    - Capture console output with transaction hashes
    - Capture policy registration and settlement tx hashes
    - Save demo output to documentation
    - _Requirements: 5.2_

  - [ ] 13.3 Run integration test suite on Sepolia
    - Execute all integration tests against deployed contracts
    - Capture test results and transaction hashes
    - Document any failures or issues
    - _Requirements: 3.7, 8.6_

- [ ] 14. Final checkpoint - Ensure all deliverables are complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- **PRIORITY**: Task 1 (Deploy contracts to Sepolia) must be completed first
- **Upgrade Strategy**: Simple "deploy new version" pattern for testnet - no complex proxies
  - Each deployment creates new contract instances
  - Deployment artifacts track version history in timestamped JSON files
  - latest.json always points to current deployment
  - SDK/scripts load addresses from latest.json
  - For mainnet: consider proxy patterns (OpenZeppelin UUPS/Transparent)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows on Sepolia testnet
- Documentation tasks ensure prize track submission readiness


- [ ] 15. Implement transaction logging system for prize track demonstration
  - [ ] 15.1 Create transaction logger utility
    - Create logs/ directory for transaction logs
    - Implement TransactionLogger class with methods for logging actions
    - Support JSON format for machine-readable logs
    - Support Markdown format for human-readable summaries
    - Include timestamp, action type, addresses, amounts, tx hashes
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 15.2 Integrate logger with Yellow Network demo
    - Log channel creation events with channel ID and initial allocation
    - Log each off-chain transfer with amount and recipient
    - Log channel closure with final balance and settlement tx hash
    - Generate summary statistics (total transfers, total volume, gas saved)
    - _Requirements: 1.5, 1.6, 7.2_

  - [ ] 15.3 Integrate logger with Uniswap v4 demo
    - Log policy registration with intent ID and parameters
    - Log settlement execution with pool key and swap params
    - Log hook validation results and policy checks
    - Capture all transaction hashes with Etherscan links
    - _Requirements: 3.6, 7.3_

  - [ ] 15.4 Create transaction log viewer
    - Create scripts/view-logs.ts for displaying logs
    - Support filtering by action type, date range, contract address
    - Generate summary reports for prize track submission
    - Export logs in multiple formats (JSON, CSV, Markdown)
    - _Requirements: 7.1, 7.4_

  - [ ] 15.5 Document transaction logging for judges
    - Create docs/transaction-logs.md explaining log format
    - Include example logs for each action type
    - Document how to view and interpret logs
    - Provide links to all logged transactions on Etherscan
    - _Requirements: 7.1, 7.4, 7.5_

- [ ] 16. Update documentation with deployment information
  - [ ] 16.1 Create Docusaurus page for Uniswap v4 deployment
    - Document deployed contract addresses on Sepolia
    - Include transaction hashes and Etherscan links
    - Explain hook address mining and CREATE2 deployment
    - Provide usage examples and integration guide
    - _Requirements: 5.4, 5.5, 5.6, 7.3_
    - **Status**: ✅ Complete (apps/docs/docs/contracts/uniswap-v4-deployment.md)

  - [ ] 16.2 Create Docusaurus page for Yellow Network integration
    - Document Yellow SDK integration architecture
    - Explain state channel workflow and benefits
    - Provide code examples for channel creation and transfers
    - Include demo video script and transaction log format
    - _Requirements: 5.1, 5.7, 7.2_
    - **Status**: ✅ Complete (apps/docs/docs/integrations/yellow-network.md)

  - [ ] 16.3 Update sidebar configuration
    - Add Uniswap v4 deployment page to contracts section
    - Add Yellow Network page to integrations section
    - Ensure proper navigation and linking
    - _Requirements: 5.4, 5.5_
    - **Status**: ✅ Complete (apps/docs/sidebars.ts)

  - [ ] 16.4 Create prize track submission checklist
    - Document all requirements for Uniswap Foundation track
    - Document all requirements for Yellow Network track
    - Create checklist with links to deliverables
    - Include transaction hashes, repo links, demo video links
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 16.5 Secure sensitive information
    - Remove private keys from all files
    - Create .env.example files with placeholders
    - Update .gitignore to exclude sensitive files
    - Document secure key management practices
    - _Requirements: Security best practices_
    - **Status**: ✅ Complete (contracts/.env secured, .env.example created)

- [ ] 17. Record demo videos for prize tracks
  - [ ] 17.1 Record Uniswap v4 demo video (max 3 minutes)
    - Show contract deployment on Sepolia
    - Demonstrate policy registration
    - Execute settlement with hook validation
    - Display transaction hashes on Etherscan
    - Explain benefits and use cases
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 7.3_

  - [ ] 17.2 Record Yellow Network demo video (2-3 minutes)
    - Show Yellow SDK initialization
    - Create state channel with counterparty
    - Execute multiple off-chain transfers
    - Close channel and show settlement transaction
    - Highlight speed and cost benefits
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.2_

  - [ ] 17.3 Upload videos and update documentation
    - Upload videos to YouTube or hosting platform
    - Add video links to README.md
    - Add video links to Docusaurus documentation
    - Add video links to prize track submission
    - _Requirements: 6.5, 7.2, 7.3_

## Deployment Summary

### ✅ Completed: Sepolia Deployment (Task 1)

**JACKPolicyHook**
- Address: `0xE8142B1Ff0DA631866fec5771f4291CbCe718080`
- Transaction: https://sepolia.etherscan.io/tx/0xfe8a64c351c62df57919d79b85a952bacb5dd410e684d6342e01f060ef18929e
- Verified: ✅ Sourcify (exact match)
- CREATE2 Salt: 23048

**JACKSettlementAdapter**
- Address: `0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A`
- Transaction: https://sepolia.etherscan.io/tx/0xf9ce7f6309ce153e66bc4e2160ae5338e6db3fc82e77edc7fadef3ab567098f5
- Verified: ✅ Sourcify (exact match)

**Deployment Details**
- Network: Sepolia Testnet (Chain ID: 11155111)
- Block Number: 10,215,727
- Deployer: `0x114d72D97Aa9C413A1ba3f0Cd37F439D668EA1aD`
- PoolManager: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- Gas Used: ~6,664,040 gas (~0.0134 ETH)
- Deployment Date: February 8, 2026

### 📋 Prize Track Requirements Status

**Uniswap Foundation Prize Track**
- ✅ Contracts deployed to Sepolia testnet
- ✅ Transaction hashes captured and documented
- ✅ Contracts verified on Etherscan (Sourcify)
- ✅ Functional code demonstrating v4 hooks integration
- ✅ Repository with complete source code
- ✅ Documentation with setup instructions
- ⏳ Demo video (max 3 minutes) - Pending
- ⏳ README.md with submission details - Pending

**Yellow Network Prize Track**
- ⏳ Yellow SDK integration - In Progress
- ⏳ Off-chain transaction demonstration - Pending
- ⏳ Working prototype deployment - Pending
- ⏳ Demo video (2-3 minutes) - Pending
- ⏳ Repository submission under Yellow Network track - Pending

### 🔐 Security Notes

- ✅ Private keys removed from version control
- ✅ .env.example created with placeholders
- ✅ .gitignore updated to exclude sensitive files
- ✅ Deployment scripts use environment variables
- ✅ No hardcoded credentials in any files

### 📚 Documentation Created

- ✅ `apps/docs/docs/contracts/uniswap-v4-deployment.md` - Uniswap v4 deployment guide
- ✅ `apps/docs/docs/integrations/yellow-network.md` - Yellow Network integration guide
- ✅ `contracts/deployments/sepolia/DEPLOYMENT_COMPLETE.md` - Deployment summary
- ✅ `contracts/deployments/sepolia/VERIFICATION_GUIDE.md` - Verification instructions
- ✅ `contracts/deployments/sepolia/PRE_DEPLOYMENT_CHECKLIST.md` - Prerequisites
- ✅ `contracts/.env.example` - Environment configuration template

