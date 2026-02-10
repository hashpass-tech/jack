---
name: Security Audit Findings
about: Report security vulnerabilities or audit findings for JACK contracts
labels: security, audit
---

## Security Audit Findings: JACKPolicyHook & JACKSettlementAdapter

**Date:** 2025-02-09  
**Scope:** `contracts/src/JACKSettlementAdapter.sol`, `contracts/src/JACKPolicyHook.sol`  
**Status:** Draft fixes implemented in current branch

---

### Executive Summary

A security audit of the JACK intent settlement contracts identified **3 critical**, **2 medium**, and **2 low/informational** findings. Draft fixes have been implemented to address the critical and medium issues.

---

### Critical Findings

#### 1. Intent Replay Attack (JACKSettlementAdapter)

**Description:** After settlement, an intent can be settled again. The user's signature remains valid and the policy is not invalidated until its deadline. A malicious solver (or anyone who observes a settlement) can re-submit the same intent and drain the user's funds multiple times.

**Impact:** User funds can be drained through repeated settlements of the same intent.

**Recommendation:** Add a `settledIntents` mapping and revert if an intent has already been settled.

**Fix applied:** Added `mapping(bytes32 => bool) public settledIntents` and check/set in `settleIntent`.

---

#### 2. Native ETH Settlement Will Revert (JACKSettlementAdapter)

**Description:** When `tokenIn` or a settling currency is native ETH (`address(0)`), `_settle()` calls `poolManager.settle{value: amount}()`. The adapter never receives ETH—the solver initiates the tx and the user (payer) is not in the call chain, so ETH cannot be pulled from the user. The call will revert due to insufficient balance.

**Impact:** Any swap involving native ETH as input will fail. No funds at risk, but feature is broken.

**Recommendation:** Either (a) explicitly document that only ERC20 tokens are supported and native ETH must use WETH, or (b) implement a separate funding flow (e.g., user pre-funds, or use `settleFor` with a different architecture).

**Fix applied:** Added `NativeEthNotSupported` error and revert when `tokenIn == address(0)` or when settling native currency. Document that WETH must be used for native-ETH-like flows.

---

#### 3. Missing Pool/Swap Validation (JACKSettlementAdapter)

**Description:** The solver supplies `poolKey` and `swapParams`; the adapter does not validate that they match the intent. A malicious solver could route to a different pool, wrong token pair, or unfavorable swap, potentially causing incorrect token transfers or loss.

**Impact:** Solver could misroute user funds or execute swaps that do not match the signed intent.

**Recommendation:** Validate that `poolKey.currency0` and `poolKey.currency1` equal `{intent.tokenIn, intent.tokenOut}` (Uniswap v4 orders currencies as currency0 &lt; currency1).

**Fix applied:** Added `_validatePoolMatchesIntent()` and `PoolMismatch` error.

---

### Medium Findings

#### 4. Unsafe Ownership Transfer (Both Contracts)

**Description:** Single-step ownership transfer. If the owner accidentally transfers to the wrong address, ownership and critical privileges are permanently lost with no recovery.

**Impact:** Loss of admin control over adapter (solver auth, ownership) and policy hook (policy management).

**Recommendation:** Implement two-step ownership transfer (e.g., `transferOwnership` sets `pendingOwner`, `acceptOwnership` completes the transfer).

**Fix applied:** Added `pendingOwner`, updated `transferOwnership`, and added `acceptOwnership` in both contracts.

---

#### 5. Missing `receive()` for ETH (JACKSettlementAdapter)

**Description:** The adapter has no `receive()` or `fallback()`. If future design adds ETH handling or users accidentally send ETH, behavior is undefined.

**Recommendation:** Add explicit `receive() external payable { revert(); }` to reject accidental ETH sends, or document intended behavior.

**Fix applied:** N/A (optional). Native ETH flows are rejected via `NativeEthNotSupported`; accidental sends would remain in the contract. Consider adding explicit `receive()` that reverts.

---

### Low / Informational

#### 6. Solver Authorization Centralization

**Description:** The owner controls solver authorization. A compromised or malicious owner could add rogue solvers. Document this trust assumption.

#### 7. Policy Updater Can Weaken Bounds

**Description:** The assigned policy updater can relax `minAmountOut`, `referenceAmountOut`, and `maxSlippageBps`, reducing user protection. Intentional design; document in README or spec.

---

### Summary of Fixes Implemented

| Severity  | Finding                | Status   |
|-----------|------------------------|----------|
| Critical  | Intent replay          | Fixed    |
| Critical  | Native ETH support     | Fixed (revert + doc) |
| Critical  | Pool/swap validation   | Fixed    |
| Medium    | Ownership transfer     | Fixed (both contracts) |
| Medium    | Missing `receive()`    | Optional |
| Low       | Documentation          | Recommended |

---

### Files Modified

- `contracts/src/JACKSettlementAdapter.sol` — Replay protection, pool validation, native ETH revert, two-step ownership
- `contracts/src/JACKPolicyHook.sol` — Two-step ownership
- `contracts/test/JACKSettlementAdapter.t.sol` — New tests for replay, pool mismatch, native ETH; updated pool key; fixed expiration test expectation

---

### Verification

```bash
cd contracts && forge test
```

---

### Next Steps

- [ ] Review draft fixes
- [ ] Add optional `receive()` revert if desired
- [ ] Update documentation for WETH-only and trust assumptions
- [ ] Consider formal verification or additional review before mainnet
