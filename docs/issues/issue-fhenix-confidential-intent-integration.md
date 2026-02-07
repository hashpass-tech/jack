# Issue: Fhenix Confidential Intent (CCM) Integration for JACK

## Status
- **State:** Open
- **Priority:** Critical
- **Target Networks:** Sepolia, Arbitrum Sepolia, Base Sepolia (CoFHE-supported)

## Summary

Integrate **Fhenix CoFHE** (FHE coprocessor) into JACK's intent pipeline so that **CCM (Confidential Constraint Mechanism)** policy parameters — `minAmountOut`, `referenceAmountOut`, `maxSlippageBps`, and `deadline` — are stored and enforced on-chain as encrypted values (`euint64`/`euint16`) via FHE, visible only to authorized agents through the CoFHE ACL system.

## Background

JACK currently enforces intent policies through `JACKPolicyHook.sol`, a Uniswap v4 `beforeSwap` hook. Policy parameters (slippage bounds, min output, deadline) are stored in plaintext in the `policies` mapping and checked in `_checkPolicy()`. This exposes strategic trading parameters to MEV searchers and competing solvers.

Fhenix's **CoFHE** is an FHE coprocessor live on testnet (Sepolia, Arbitrum Sepolia, Base Sepolia) that enables encrypted computation directly on EVM chains. Key primitives:
- Solidity library: `@fhenixprotocol/cofhe-contracts` (v0.0.13+) — provides `FHE.sol` with encrypted types (`euint64`, `euint16`, `ebool`), arithmetic (`FHE.add`, `FHE.sub`), comparisons (`FHE.gte`, `FHE.lt`), and access control (`FHE.allow`, `FHE.allowThis`)
- Client library: `cofhejs` (v0.3.1+) — TypeScript SDK for client-side encryption of inputs and unsealing of outputs via permits
- Decryption is **asynchronous**: `FHE.decrypt()` submits a request, `FHE.getDecryptResultSafe()` polls for the result
- ACL-based access: each ciphertext handle (`bytes32`) has explicit access grants via `FHE.allow(handle, address)`

## Current System State (What Exists)

### Contracts
- **`JACKPolicyHook.sol`** — Uniswap v4 hook with `beforeSwap` enforcement
  - `Policy` struct: `minAmountOut`, `referenceAmountOut`, `deadline` (all `uint256`), `maxSlippageBps` (`uint16`), `updater` (`address`), `exists` (`bool`)
  - `_checkPolicy()`: compares `quotedAmountOut` against `effectiveMinOut` (max of `minAmountOut` and slippage-derived bound)
  - `setPolicy()` / `setPolicyWithSlippage()`: owner-only policy registration
  - `updatePolicyBounds()`: updater or owner can modify bounds
  - Fail-closed: reverts with `PolicyViolation` if policy missing, expired, or slippage exceeded
- **`JACKSettlementAdapter.sol`** — calls `policyHook.checkPolicy()` before settlement, reverts with `PolicyRejected` on failure

### SDK (`packages/sdk/`)
- **`IntentParams`**: `sourceChain`, `destinationChain`, `tokenIn`, `tokenOut`, `amountIn`, `minAmountOut`, `deadline` + extensible `[key: string]`
- **`serialization.ts`**: EIP-712 typed data with `Intent` type (7 fields), domain `JACK/v1`
- **`validation.ts`**: checks required fields, positive amounts, future deadline, valid addresses
- **`intents.ts`**: `IntentManager` — `getTypedData()`, `validate()`, `submit()`
- **`agent.ts`**: `AgentUtils` — `batchSubmit()`, `dryRun()`, `validatePolicy()`, `subscribeToUpdates()`
- **No encryption code exists** — ready for Fhenix integration

### Dashboard (`apps/dashboard/`)
- **`CreateIntentView.tsx`**: has a `privacy: false` toggle in form state (unused), shows route topology
- **`ExecutionDetailView.tsx`**: has placeholder "Confidentiality Metrics" section (Provider: Fhenix Shield, Obfuscation: Full CCM) — currently hardcoded/decorative

## Integration Plan

### Phase 1: Contract Layer — `JACKPolicyHookFHE.sol`

Create a new FHE-enabled policy hook alongside the existing one (no breaking changes).

**Dependencies:**
- `@fhenixprotocol/cofhe-contracts` (install via forge or npm)
- Deploy target: CoFHE-supported testnet (Arbitrum Sepolia recommended — matches existing JACK testnet)

**Changes:**

1. **Encrypted Policy struct:**
```solidity
import {FHE, euint64, euint16, ebool, InEuint64, InEuint16} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

struct ConfidentialPolicy {
    euint64 minAmountOut;       // encrypted
    euint64 referenceAmountOut; // encrypted
    euint16 maxSlippageBps;     // encrypted
    uint256 deadline;           // public (needed for expiry check)
    address updater;            // public
    bool exists;                // public
}
```

2. **Policy registration with encrypted inputs:**
```solidity
function setConfidentialPolicy(
    bytes32 intentId,
    InEuint64 memory _minAmountOut,
    InEuint64 memory _referenceAmountOut,
    InEuint16 memory _maxSlippageBps,
    uint256 deadline,
    address updater
) external onlyOwner {
    euint64 minOut = FHE.asEuint64(_minAmountOut);
    euint64 refOut = FHE.asEuint64(_referenceAmountOut);
    euint16 slippage = FHE.asEuint16(_maxSlippageBps);

    // Grant contract access to operate on these ciphertexts
    FHE.allowThis(minOut);
    FHE.allowThis(refOut);
    FHE.allowThis(slippage);

    // Grant authorized agent access for decryption
    FHE.allow(minOut, updater);
    FHE.allow(refOut, updater);
    FHE.allow(slippage, updater);

    confidentialPolicies[intentId] = ConfidentialPolicy({
        minAmountOut: minOut,
        referenceAmountOut: refOut,
        maxSlippageBps: slippage,
        deadline: deadline,
        updater: updater,
        exists: true
    });
}
```

3. **Encrypted policy check in `_beforeSwap`:**
```solidity
function _checkConfidentialPolicy(
    bytes32 intentId,
    InEuint64 memory _quotedAmountOut
) internal returns (ebool) {
    ConfidentialPolicy storage policy = confidentialPolicies[intentId];
    if (!policy.exists) revert PolicyViolation(intentId, REASON_POLICY_MISSING);
    if (policy.deadline < block.timestamp) revert PolicyViolation(intentId, REASON_POLICY_EXPIRED);

    euint64 quoted = FHE.asEuint64(_quotedAmountOut);

    // Encrypted slippage bound: ref * (10000 - slippage) / 10000
    euint64 bpsDenom = FHE.asEuint64(BPS_DENOMINATOR);
    euint64 slippageAsU64 = FHE.asEuint64(policy.maxSlippageBps); // widen for arithmetic
    euint64 factor = FHE.sub(bpsDenom, slippageAsU64);
    euint64 slippageBound = FHE.div(FHE.mul(policy.referenceAmountOut, factor), bpsDenom);

    // effectiveMinOut = max(minAmountOut, slippageBound)
    ebool minIsGreater = FHE.gte(policy.minAmountOut, slippageBound);
    euint64 effectiveMinOut = FHE.select(minIsGreater, policy.minAmountOut, slippageBound);

    // Check: quotedAmountOut >= effectiveMinOut
    ebool allowed = FHE.gte(quoted, effectiveMinOut);
    FHE.allowThis(allowed);
    return allowed;
}
```

4. **Async decryption for settlement verification:**
   - After `_checkConfidentialPolicy` returns `ebool`, call `FHE.decrypt(allowed)` to get a plaintext result
   - Use `FHE.getDecryptResultSafe()` in a follow-up call to read the boolean result
   - This introduces a **two-tx settlement pattern**: (1) submit + request decrypt, (2) finalize after decrypt resolves

**Key design decision:** The `deadline` stays plaintext because `block.timestamp` comparison cannot be done in FHE (it's a runtime value). This is acceptable — deadline is not a strategic parameter.

### Phase 2: SDK Layer

**New module: `packages/sdk/src/confidential.ts`**

1. **CCM payload type:**
```typescript
export interface CCMPayload {
    minAmountOut: string;        // will be encrypted
    referenceAmountOut: string;  // will be encrypted
    maxSlippageBps: number;      // will be encrypted
    deadline: number;            // stays plaintext
}

export interface ConfidentialIntentParams extends IntentParams {
    ccm: CCMPayload;
    confidential: true;
}
```

2. **Encryption via cofhejs:**
```typescript
import { Cofhe } from 'cofhejs';

export async function encryptCCMPayload(
    ccm: CCMPayload,
    contractAddress: string,
    provider: ethers.Provider
): Promise<EncryptedCCMInputs> {
    const cofhe = new Cofhe({ provider });
    return {
        minAmountOut: await cofhe.encrypt.uint64(BigInt(ccm.minAmountOut)),
        referenceAmountOut: await cofhe.encrypt.uint64(BigInt(ccm.referenceAmountOut)),
        maxSlippageBps: await cofhe.encrypt.uint16(ccm.maxSlippageBps),
        deadline: ccm.deadline,
    };
}
```

3. **Extended EIP-712 typed data** (in `serialization.ts`):
   - Add `ccmCommitment` field (keccak256 hash of encrypted inputs) to the `Intent` type
   - This binds the confidential policy to the signed intent without revealing parameters

4. **Extended validation** (in `validation.ts`):
   - Validate `ccm.maxSlippageBps` is 0–10000
   - Validate `ccm.minAmountOut` and `ccm.referenceAmountOut` are positive
   - Validate `ccm.deadline` is in the future

5. **SDK exports:**
   - `encryptCCMPayload()`, `ConfidentialIntentParams`, `CCMPayload` from `index.ts`

### Phase 3: Agent/Solver Decryption Workflow

**In `packages/sdk/src/agent.ts`:**

1. Authorized agents (granted via `FHE.allow`) can unseal encrypted policy values using `cofhejs` permits
2. New method: `AgentUtils.decryptPolicy(intentId, permit)` — reads encrypted handles from contract, unseals via cofhejs
3. Agent evaluates constraints in plaintext after decryption, logs compliance proof
4. Audit trail: emit `PolicyDecrypted(intentId, agent, timestamp)` event on-chain after successful evaluation

**Access control flow:**
- Policy creator calls `setConfidentialPolicy()` → grants `FHE.allow` to authorized agent address
- Agent calls `cofhe.unseal(handle, permit)` client-side to read plaintext values
- Agent submits settlement tx with proof of evaluation

### Phase 4: Dashboard UI

**`CreateIntentView.tsx`:**
- Wire the existing `privacy` toggle to enable CCM mode
- When `privacy: true`, show CCM parameter inputs (slippage, min output bounds)
- Call `encryptCCMPayload()` before signing
- Update status overlay: "Encrypting CCM payload..." → "Awaiting Signature" → "Broadcasting"

**`ExecutionDetailView.tsx`:**
- Replace hardcoded confidentiality metrics with live data
- Show `confidential: true` badge on intent
- Display "CCM Policy: Encrypted (Fhenix CoFHE)" with agent-decrypted status
- Show async decrypt status: "Pending" → "Decrypted" → "Verified"

### Phase 5: Settlement Adapter Update

**`JACKSettlementAdapter.sol`:**
- Add `settleConfidentialIntent()` that calls `_checkConfidentialPolicy()` instead of `checkPolicy()`
- Handle the two-tx async pattern:
  1. `initiateSettlement()` — validates + requests FHE decrypt
  2. `finalizeSettlement()` — reads decrypt result, emits `IntentSettled` or reverts

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CoFHE async decryption latency (seconds to minutes) | Settlement delay | Two-tx pattern with timeout; fallback to plaintext policy if decrypt times out |
| FHE arithmetic overflow in slippage calculation | Incorrect enforcement | Use `euint64` for all intermediate values; extensive fuzz testing |
| CoFHE testnet-only (no mainnet yet) | Cannot deploy to production | Design for testnet validation now; abstract FHE layer for easy swap |
| ACL misconfiguration leaks ciphertext access | Privacy breach | Strict `FHE.allow` only to contract + authorized agent; no `FHE.allowGlobal` |
| Gas cost of FHE operations | Higher tx costs | Batch policy registrations; benchmark gas on testnet |
| `deadline` stays plaintext | Partial information leak | Acceptable — deadline is not a strategic parameter; document this tradeoff |

## Acceptance Criteria

1. `JACKPolicyHookFHE.sol` deployed on Arbitrum Sepolia with CoFHE integration
2. Encrypted policy registration via `setConfidentialPolicy()` with `InEuint64`/`InEuint16` inputs
3. On-chain `_checkConfidentialPolicy()` performs FHE comparison and returns `ebool`
4. Two-tx settlement flow works end-to-end: initiate → decrypt → finalize
5. SDK `encryptCCMPayload()` encrypts CCM parameters client-side via cofhejs
6. EIP-712 typed data includes `ccmCommitment` binding encrypted policy to signature
7. Authorized agent can unseal policy values via cofhejs permits
8. Dashboard privacy toggle triggers CCM encryption flow
9. Dashboard shows live confidentiality status (encrypted/decrypting/verified)
10. All existing plaintext policy flows remain functional (no breaking changes)

## Dependencies & Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@fhenixprotocol/cofhe-contracts` | ≥0.0.13 | Solidity FHE library (`FHE.sol`, encrypted types, ACL) |
| `cofhejs` | ≥0.3.1 | TypeScript client-side encryption, permits, unsealing |
| `@fhenixprotocol/cofhe-mock-contracts` | ≥0.3.1 | Local testing without CoFHE coprocessor |
| `@fhenixprotocol/cofhe-hardhat-plugin` | ≥0.3.1 | Hardhat integration for mock deployment |

## References

- [Fhenix CoFHE Documentation](https://cofhe-docs.fhenix.zone/)
- [CoFHE Library Overview](https://cofhe-docs.fhenix.zone/fhe-library/introduction/overview)
- [Adding FHE to Existing Contracts (Tutorial)](https://cofhe-docs.fhenix.zone/tutorials/adding-fhe-to-existing-contract)
- [CoFHE Architecture](https://www.fhenix.io/blog/cofhe-architecture)
- [CoFHE Compatibility Matrix](https://cofhe-docs.fhenix.zone/get-started/introduction/compatibility)
- [OpenZeppelin fhEVM Security Guide](https://www.openzeppelin.com/news/a-developers-guide-to-fhevm-security)
