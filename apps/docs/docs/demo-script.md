---
title: Demo Narrative
sidebar_position: 4
---

# Recording-Ready Demo Narrative

This walkthrough is designed for the final demo recording. It highlights the full intent-to-settlement lifecycle, the JACK kernel/hook architecture, and the operator tooling.

## Pre-Flight Checklist

- ✅ Dashboard running at `http://localhost:3001`
- ✅ Landing page running at `http://localhost:3000`
- ✅ Wallet connected (use a funded testnet wallet)
- ✅ Testnet endpoints configured in `.env.local`

## Demo Flow (8–10 Minutes)

### 1) Mission & Context (0:00–0:45)

- Open the **Landing** page.
- Script line: *"JACK is the cross-chain execution kernel that turns intents into verified outcomes. The Kernel coordinates execution; Hooks enforce policy and routing."*
- Point to the mission statement and highlight the focus on safe, deterministic execution.

### 2) Intent Creation (0:45–2:00)

- Switch to the **Dashboard**.
- Create a new intent (example: "Bridge 50 USDC from Chain A to Chain B with max 0.5% slippage").
- Call out the metadata fields (asset, source, destination, slippage).

### 3) Policy Hook Enforcement (2:00–3:15)

- Show the policy panel or validation status.
- Explain: *"The Policy Hook is invoked by the Kernel before any transaction is signed. It enforces guardrails like slippage limits and allowlists."*

### 4) Kernel Execution Timeline (3:15–4:30)

- Open the execution detail view.
- Walk through the state machine: `IntentReceived → PolicyApproved → RoutingSelected → SettlementPending → Settled`.
- Emphasize deterministic state transitions driven by the Kernel.

### 5) Cross-Chain Settlement (4:30–5:45)

- Highlight the settlement step and resulting receipts.
- Mention the adapters/bridge stack: *"Adapters generate chain-specific payloads; the Settlement Hook coordinates the bridge execution."*

### 6) Observability + Runbooks (5:45–7:00)

- Navigate to **Runbooks & Operations** in the docs.
- Call out the release flow, agent orchestration system, and GitHub tracker.
- Script line: *"Operators get the same deterministic lifecycle through runbooks and tooling."*

### 7) Architecture Recap (7:00–8:00)

- Open the **Architecture** page.
- Walk through the Kernel/Hook diagram and execution sequence.

### 8) Close & Call to Action (8:00–8:30)

- Summarize: *"JACK brings intent-first execution, policy-grade safety, and production-ready operations into a single kernel."*
- Point to `docs.jack.lukas.money` as the source of truth.

## Optional Deep-Dive (if time allows)

- Show the agent orchestration system and how it keeps the docs/runbooks up to date.
- Highlight the three-step setup guide for builders.
