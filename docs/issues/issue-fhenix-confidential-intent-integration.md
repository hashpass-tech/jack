# Issue: Fhenix Confidential Intent (CCM) Integration for JACK

## Status
- **State:** Pending

## Summary
Define and implement the integration plan for **Fhenix Confidential Intent** so that **CCM (Confidential Constraint Mechanism)** policies are encrypted and visible only to authorized agents, while still being enforceable on-chain. This issue tracks the deep-critical requirements, architecture, and delivery plan for integrating Fhenix into JACK’s intent flow.

## Background
JACK’s intent pipeline includes constraint enforcement and settlement hooks. To preserve strategic privacy, CCM constraints should be encrypted and executed without exposing constraint parameters on-chain. Fhenix provides fully homomorphic encryption (FHE) primitives that can enable private policy enforcement while retaining verifiability.

## Goals
- Enable **agent-only visibility** for CCM constraints (policy inputs/parameters).
- Ensure **on-chain enforceability** of confidential constraints without revealing the plaintext.
- Define a **secure key management and access model** for authorized agents and solvers.
- Establish **clear integration milestones** across SDK, contracts, and UI.

## Scope
- **SDK**: intent creation, CCM payload encryption, typed data signing updates.
- **Contracts**: validation hooks, ciphertext handling, and fail-closed enforcement.
- **Solver/Agent**: authorized decryption workflow, policy evaluation, and execution proofs.
- **UI/UX**: user-facing copy, privacy toggles, and status indicators for confidential intents.
- **Infra**: key management, enclave or MPC boundary (if required), and auditing.

## Proposed Integration (High-Level)
1. **CCM Payload Definition**
   - Define a CCM schema (constraints, thresholds, slippage caps, time locks).
   - Specify what is encrypted vs. public metadata.
2. **Encryption + Signing Flow**
   - Encrypt CCM payload using Fhenix-compatible keys.
   - Extend typed data to include a CCM ciphertext hash/commitment.
3. **On-Chain Enforcement**
   - Update hooks to validate ciphertext commitments and enforce fail-closed behavior.
   - Define on-chain verification inputs and event emissions for observability.
4. **Solver/Agent Decryption**
   - Authorized agents decrypt CCM payloads and run policy evaluation.
   - Maintain audit trail and proof of constraint adherence.
5. **UI and Status**
   - Indicate “Confidential Intent” and “CCM encrypted for agent-only visibility.”
   - Provide deterministic status updates for encryption, broadcast, and settlement.

## Risks & Constraints
- **Key management** and access control for CCM decryption.
- **Latency** introduced by encryption/decryption and verification.
- **Chain compatibility** with Fhenix primitives and existing hooks.
- **Security guarantees** for fail-closed enforcement under solver misbehavior.

## Acceptance Criteria
- Documented CCM schema with encrypted/public fields.
- SDK can encrypt CCM payloads and submit confidential intents.
- On-chain hooks validate CCM commitments and enforce fail-closed execution.
- Authorized agents can decrypt, evaluate, and log constraint compliance.
- UI clearly marks intents as “Fhenix Confidential Intent (CCM).”

## References
- Fhenix documentation (TBD: add exact URLs).
- JACK confidential intent UI copy requirements.
