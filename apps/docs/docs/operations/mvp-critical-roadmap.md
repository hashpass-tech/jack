---
title: MVP Critical Roadmap
sidebar_position: 7
---

# MVP Critical Roadmap

Track the remaining critical work to make the demo deterministic and production-oriented.

## A. Contracts (Issue #11)

- [ ] Deploy `JACKPolicyHook` to target testnet.
- [ ] Record deployed hook address + `POOL_MANAGER_ADDRESS`.
- [ ] Capture allow/reject smoke evidence (tx hash + logs).
- [ ] Finalize `JACKSettlementAdapter` scope:
  - integrate + test now, or
  - mark explicit non-demo stub with rationale.
- [ ] Validate dashboard/API wiring against deployed hook assumptions.
- [ ] Publish concise operator runbook for policy tuning/failure handling.

## B. Execution/API (Issue #2)

- [ ] Replace simulated route stage with real LI.FI operation path (or hard gate + explicit fallback mode).
- [x] Add explicit Yellow Network solver operation integration points (quote + execution lifecycle events).
- [ ] Expose deterministic `/api/quote` output structure with provenance fields (provider, route id, timestamp).
- [x] Ensure execution status transitions reflect actual backend outcomes, not only timers/mocks.

## C. Demo Reliability

- [ ] Freeze demo environment variables for recording day.
- [ ] Pin chain/network endpoints and fallback RPC.
- [ ] Prepare a failover script for policy-check reverts.
- [ ] Capture final run artifacts (addresses, tx hashes, screenshots/logs).

## Exit Criteria (Critical Path)

- [ ] Contract deployment + smoke evidence is attached to the contracts critical issue.
- [x] API execution flow includes LI.FI + Yellow integration path or documented fallback gate.
- [ ] Demo script reflects real live path vs any mock behavior with no ambiguity.
