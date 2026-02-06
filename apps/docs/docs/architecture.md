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
  Kernel -->|invokes| SettlementHook[Settlement Hook]
  PolicyHook --> Risk[Risk & Permission Rules]
  RoutingHook --> Adapters[Chain Adapters]
  SettlementHook --> Bridge[Settlement / Bridge]
  Adapters --> ChainA[Chain A]
  Adapters --> ChainB[Chain B]
  Bridge --> FinalChain[Destination Chain]
```

**Key idea:** Hooks never bypass the Kernel. The Kernel owns the execution state machine, while Hooks provide opinionated decisions at each stage.

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
