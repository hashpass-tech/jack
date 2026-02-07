---
title: Architecture
sidebar_position: 3
---

# JACK Architecture

The JACK architecture is centered on a deterministic **Kernel** that coordinates execution and a set of **Hooks** that enforce policy, routing, and settlement behavior.

## Kernel ↔ Hook Relationship

```mermaid
flowchart LR
  UI[Intent Authoring UI] --> Kernel[Execution Kernel]
  Kernel -->|invokes| PolicyHook[Policy Hook]
  Kernel -->|invokes| RoutingHook[Routing Hook]
  Kernel -->|invokes| SettlementAdapter[Settlement Adapter]
  PolicyHook --> Risk[Risk & Permission Rules]
  RoutingHook --> Adapters[Chain Adapters]
  SettlementAdapter --> Uniswap[Uniswap v4]
  Adapters --> ChainA[Chain A]
  Adapters --> ChainB[Chain B]
  Uniswap --> FinalChain[Destination Chain]
```

**Key idea:** Hooks never bypass the Kernel. The Kernel owns the execution state machine, while Hooks provide opinionated decisions at each stage.

## Settlement Layer Architecture

The **JACKSettlementAdapter** provides production-ready on-chain settlement through Uniswap v4:

```mermaid
sequenceDiagram
  participant User
  participant Solver
  participant SettlementAdapter
  participant PolicyHook
  participant PoolManager as Uniswap v4 PoolManager
  
  User->>User: Sign Intent (EIP-712)
  User->>Solver: Submit Intent
  Solver->>SettlementAdapter: settleIntent()
  SettlementAdapter->>SettlementAdapter: Verify Signature
  SettlementAdapter->>PolicyHook: checkPolicy()
  PolicyHook-->>SettlementAdapter: Approved
  SettlementAdapter->>PoolManager: unlock()
  PoolManager->>SettlementAdapter: unlockCallback()
  SettlementAdapter->>PoolManager: swap()
  PoolManager-->>SettlementAdapter: BalanceDelta
  SettlementAdapter->>SettlementAdapter: settleDeltas()
  SettlementAdapter-->>Solver: IntentSettled Event
```

### Settlement Features

- **EIP-712 Signatures**: Users sign intents with cryptographic guarantees
- **Solver Authorization**: Permissioned solver network with owner control
- **Policy Enforcement**: Integration with JACKPolicyHook for intent validation
- **Atomic Execution**: Leverages Uniswap v4 unlock/callback pattern
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Delta Settlement**: Handles token transfers for swap completion

See [Settlement Adapter Documentation](./contracts/settlement-adapter.md) for detailed information.

## Critical Execution Flow

```mermaid
sequenceDiagram
  participant User
  participant Dashboard
  participant Kernel
  participant Hook as Policy Hook
  participant Adapter as Chain Adapter
  participant Bridge

  User->>Dashboard: Create cross-chain intent
  Dashboard->>Kernel: Submit intent + metadata
  Kernel->>Hook: Validate policy + permissions
  Hook-->>Kernel: Approved (or reject)
  Kernel->>Adapter: Build chain-specific call
  Adapter-->>Kernel: Signed payload
  Kernel->>Bridge: Execute settlement
  Bridge-->>Kernel: Execution receipt
  Kernel-->>Dashboard: Status + receipts
  Dashboard-->>User: Success confirmation
```

## Operational Guarantees

- **Deterministic status tracking**: the Kernel emits state transitions for every intent.
- **Pluggable enforcement**: swap Hook logic without rewriting the Kernel.
- **Observable execution**: Dashboard and Runbooks surface the same lifecycle steps for operators.
