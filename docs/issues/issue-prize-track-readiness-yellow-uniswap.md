# Issue: Prize Track Readiness Audit (Yellow Network + Uniswap Foundation)

## Status
- **State:** Open
- **Priority:** Critical
- **Tracks:** Yellow Network ($15,000), Uniswap Foundation ($10,000)

## Summary

Run a full readiness audit against the **Yellow Network** and **Uniswap Foundation (Uniswap v4)** prize requirements. The audit must confirm that the repo includes all required integration components, documentation, demo artifacts, and submission metadata, and then list any missing deliverables that block eligibility.

## Background

JACK already includes Yellow Network execution flow support in `develop` (notifications, auth/persistence, ERC-7824/Nitrolite channel guards) and Uniswap v4 settlement hooks/adapters in the contracts layer. However, the prize tracks require *specific* proof of integration (demo video, repo references, explicit submission metadata, and testnet TxIDs). We need a single critical issue that validates end-to-end readiness and calls out the gaps for each track.

## Current System State (What Exists)

### Yellow Network
- Yellow notification ingestion/auth/persistence flow is merged into `develop`.
- Yellow callback processing supports ERC-7824 (Nitrolite) channel metadata + guard checks.
- SDK exports Yellow provider types and supports state-channel workflows.

### Uniswap v4
- Settlement adapter integrates Uniswap v4 unlock/callback execution.
- Policy hooks enforce slippage/guardrails at settlement time.

## Critical Missing Components (Must Verify + Close)

### Yellow Network Prize Track
1. **Explicit Yellow SDK usage proof**
   - Confirm a runnable demo path that initializes the Yellow SDK, creates a session, performs off-chain transfers, and closes with on-chain settlement.
   - Capture repo references or scripts that prove this flow.
2. **Off-chain transaction demo**
   - Add a working scenario (mini-app or test) that simulates instant, session-based transfers.
   - Must show evidence of off-chain state updates and final on-chain settlement.
3. **2–3 minute demo video**
   - Record a short demo showing end-to-end Yellow flow and attach the link in README/docs.
4. **ETHGlobal submission metadata**
   - Ensure the repo documents the Yellow Network track submission (track selection, repo link, demo link).

### Uniswap Foundation Prize Track (v4)
1. **Testnet/mainnet TxIDs**
   - Provide tx hashes that demonstrate v4 hook + settlement adapter execution.
   - Store in README or a dedicated `docs/` entry.
2. **Clear functional code evidence**
   - Add a focused README section describing how to run the v4 flow (commands + contracts).
3. **Demo video (<= 3 min)**
   - Record or link a concise demo that highlights v4 interaction (hook policy enforcement + adapter execution).
4. **Prize track selection clarity**
   - Decide whether the submission targets Agentic Finance, Privacy DeFi, or both; document the track(s) in README/docs.

## Acceptance Criteria

- [ ] Yellow SDK integration demo path is documented and runnable.
- [ ] Off-chain transfer + on-chain settlement proof exists (logs, scripts, or transactions).
- [ ] Yellow demo video link is published in docs/README.
- [ ] ETHGlobal submission metadata for Yellow track exists in repo docs.
- [ ] Uniswap v4 tx hashes are recorded and linked.
- [ ] Uniswap v4 demo video link is published.
- [ ] README/docs clearly identify the Uniswap prize track(s) targeted.
- [ ] A single “Prize Track Readiness” doc entry summarizes compliance status for both tracks.

## Suggested Owners

- **Integration:** SDK + Contracts owners
- **Docs/Submission:** Documentation/BD owners
- **Demo Video:** Product/Marketing owner
