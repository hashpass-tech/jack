# Prize Track Submission Checklist

## Overview

This document tracks the submission requirements and status for both prize tracks:
- **Uniswap Foundation Prize Track** ($10,000)
- **Yellow Network Prize Track** ($15,000)

---

## Uniswap Foundation Prize Track ($10,000)

### Track Selection
- [ ] **Agentic Finance** - AI-powered intent execution with policy enforcement
- [ ] **Privacy DeFi** - Private settlement with policy validation

### Submission Requirements

#### ✅ Required Deliverables

- [x] **TxID Transactions (Testnet)**
  - JACKPolicyHook: [`0xfe8a64c351c62df57919d79b85a952bacb5dd410e684d6342e01f060ef18929e`](https://sepolia.etherscan.io/tx/0xfe8a64c351c62df57919d79b85a952bacb5dd410e684d6342e01f060ef18929e)
  - JACKSettlementAdapter: [`0xf9ce7f6309ce153e66bc4e2160ae5338e6db3fc82e77edc7fadef3ab567098f5`](https://sepolia.etherscan.io/tx/0xf9ce7f6309ce153e66bc4e2160ae5338e6db3fc82e77edc7fadef3ab567098f5)

- [x] **GitHub Repository**
  - Repository URL: [Add GitHub URL]
  - Branch: `main` or `develop`
  - Commit: [Add commit hash]

- [x] **README.md**
  - Project description
  - Setup instructions
  - Contract addresses
  - Transaction hashes
  - Demo video link

- [ ] **Demo Video (max 3 minutes)**
  - Video URL: [Add YouTube/hosting URL]
  - Content:
    - Contract deployment demonstration
    - Policy registration walkthrough
    - Settlement execution with hook validation
    - Transaction hash display on Etherscan
    - Benefits and use cases explanation

- [x] **Setup Instructions**
  - Deployment guide: `contracts/deployments/sepolia/PRE_DEPLOYMENT_CHECKLIST.md`
  - Verification guide: `contracts/deployments/sepolia/VERIFICATION_GUIDE.md`
  - Integration guide: `apps/docs/docs/contracts/uniswap-v4-deployment.md`

#### ✅ Technical Requirements

- [x] **Contracts Deployed to Sepolia**
  - JACKPolicyHook: `0xE8142B1Ff0DA631866fec5771f4291CbCe718080`
  - JACKSettlementAdapter: `0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A`
  - Block Number: 10,215,727
  - Deployment Date: February 8, 2026

- [x] **Contract Verification**
  - JACKPolicyHook: ✅ Verified on Sourcify (exact match)
  - JACKSettlementAdapter: ✅ Verified on Sourcify (exact match)
  - Etherscan Links:
    - [JACKPolicyHook](https://sepolia.etherscan.io/address/0xE8142B1Ff0DA631866fec5771f4291CbCe718080#code)
    - [JACKSettlementAdapter](https://sepolia.etherscan.io/address/0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A#code)

- [x] **Functional Code**
  - Hook implementation: `contracts/src/JACKPolicyHook.sol`
  - Settlement adapter: `contracts/src/JACKSettlementAdapter.sol`
  - Deployment script: `contracts/script/DeploySepolia.s.sol`
  - Tests: `contracts/test/JACKPolicyHook.t.sol`, `contracts/test/JACKSettlementAdapter.t.sol`

- [x] **Uniswap v4 Integration**
  - Hook permissions: `beforeSwap` only
  - CREATE2 deployment with address mining
  - Integration with PoolManager: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
  - Policy enforcement via hook validation

#### 📊 Judging Criteria

- **Innovation**: Policy-based settlement with slippage protection
- **Technical Quality**: Clean code, comprehensive tests, proper verification
- **Uniswap v4 Integration**: Deep integration with hooks and PoolManager
- **Documentation**: Comprehensive guides and examples
- **Presentation**: Clear demo video showing functionality

---

## Yellow Network Prize Track ($15,000)

### Qualification Requirements

- [ ] **Yellow SDK / Nitrolite Protocol Usage**
  - SDK integration: `packages/sdk/src/yellow/`
  - YellowProvider implementation
  - State channel management

- [ ] **Off-Chain Transaction Logic**
  - Instant payments demonstration
  - Session-based spending
  - Settlement finalized via smart contracts
  - Transaction logging system

- [ ] **Working Prototype**
  - Deployed/simulated prototype
  - Demonstrates transaction speed improvements
  - Shows UX and efficiency benefits
  - Comparison with on-chain transactions

- [ ] **Demo Video (2-3 minutes)**
  - Video URL: [Add YouTube/hosting URL]
  - Content:
    - Yellow SDK initialization
    - State channel creation
    - Multiple off-chain transfers
    - Channel closure and settlement
    - Speed and cost benefits highlight

- [ ] **Prize Track Submission**
  - Submitted under "Yellow Network" track on ETHGlobal
  - Repository link included
  - All deliverables attached

### Submission Requirements

#### ⏳ Required Deliverables

- [ ] **TxID Transactions (Testnet)**
  - Channel creation transaction: [Add tx hash]
  - Settlement transaction: [Add tx hash]
  - Etherscan links: [Add links]

- [ ] **GitHub Repository**
  - Repository URL: [Add GitHub URL]
  - Branch: `main` or `develop`
  - Commit: [Add commit hash]

- [ ] **README.md**
  - Yellow Network integration description
  - Setup instructions
  - Transaction hashes
  - Demo video link
  - Performance metrics

- [ ] **Demo Video (2-3 minutes)**
  - Video URL: [Add YouTube/hosting URL]
  - Script: `apps/docs/docs/integrations/yellow-network.md` (Demo Video Script section)

- [ ] **Setup Instructions**
  - Integration guide: `apps/docs/docs/integrations/yellow-network.md`
  - Demo script: `scripts/prize-tracks/yellow-demo.ts`
  - Transaction logs: `logs/yellow-network-transactions.json`

#### ⏳ Technical Requirements

- [ ] **Yellow SDK Integration**
  - YellowProvider class: `packages/sdk/src/yellow/YellowProvider.ts`
  - State channel management
  - Off-chain transfer logic
  - Settlement integration

- [ ] **Demo Script**
  - Runnable demo: `scripts/prize-tracks/yellow-demo.ts`
  - Channel creation
  - Multiple off-chain transfers (5+)
  - Channel closure with settlement
  - Transaction logging

- [ ] **Transaction Logs**
  - JSON format: `logs/yellow-network-transactions.json`
  - Markdown summary: `logs/yellow-network-summary.md`
  - Includes all actions, timestamps, amounts, tx hashes

- [ ] **Integration Tests**
  - Channel lifecycle tests
  - Off-chain transfer validation
  - Settlement verification
  - Test coverage: >80%

#### 📊 Judging Criteria

- **Problem & Solution**
  - Problem: High gas fees and slow confirmation times
  - Solution: State channels for instant, cost-free transfers
  - Clarity: Clear articulation of problem and solution

- **Yellow SDK Integration**
  - Depth: Comprehensive integration with Yellow Network
  - Impact: Demonstrates significant speed and cost improvements
  - Innovation: Creative use of state channels

- **Business Model**
  - Value proposition: Enable high-frequency trading and micro-payments
  - Revenue model: Transaction fees on settled amounts
  - Sustainability: Reduces infrastructure costs

- **Presentation**
  - Clarity: Clear communication of idea
  - Persuasiveness: Compelling demonstration
  - Professionalism: High-quality video and documentation

- **Team Potential**
  - Skill: Technical expertise demonstrated
  - Passion: Commitment to project
  - Post-hackathon: Plans for continued development

---

## Submission Timeline

### Completed ✅
- [x] February 8, 2026: Uniswap v4 contracts deployed to Sepolia
- [x] February 8, 2026: Contracts verified on Sourcify
- [x] February 8, 2026: Documentation created (Docusaurus pages)
- [x] February 8, 2026: Private keys secured

### In Progress ⏳
- [ ] Yellow SDK integration
- [ ] Transaction logging system
- [ ] Demo scripts implementation
- [ ] Integration tests

### Pending 📋
- [ ] Demo video recording (Uniswap v4)
- [ ] Demo video recording (Yellow Network)
- [ ] README.md updates
- [ ] Final submission to ETHGlobal

---

## Contact Information

- **Team Name**: [Add team name]
- **Team Members**: [Add team members]
- **Email**: [Add contact email]
- **Discord**: [Add Discord handle]
- **Twitter**: [Add Twitter handle]

---

## Resources

### Uniswap Foundation
- [Uniswap v4 Docs](https://docs.uniswap.org/contracts/v4/)
- [Hook Deployment Guide](https://docs.uniswap.org/contracts/v4/guides/hooks/hook-deployment)
- [Sepolia Deployments](https://docs.uniswap.org/contracts/v4/deployments)

### Yellow Network
- [Yellow Network Docs](https://docs.yellow.org/)
- [Yellow SDK](https://github.com/yellow-network/sdk)
- [Nitrolite Protocol](https://docs.yellow.org/nitrolite)

### ETHGlobal
- [ETHGlobal Platform](https://ethglobal.com/)
- [Submission Guidelines](https://ethglobal.com/guide)
- [Prize Tracks](https://ethglobal.com/events)

---

**Last Updated**: February 8, 2026  
**Status**: Uniswap v4 deployment complete, Yellow Network integration in progress
