## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

From the repository root:

```shell
$ cp contracts/.env.testnet.example contracts/.env.testnet
$ ./scripts/contracts/deploy-hook.sh contracts/.env.testnet
```

Mainnet (hardened):

```shell
$ ./scripts/contracts/deploy-hook.sh contracts/.env.mainnet
```

Smoke checks (allow/reject evidence):

```shell
$ ./scripts/contracts/smoke-hook.sh contracts/.env.testnet
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## Security Features

JACK contracts implement multiple security mechanisms to protect user funds and ensure safe operation. These features address critical findings from our security audit.

### 1. Intent Replay Protection

**Issue:** Without replay protection, a malicious actor could re-submit the same intent multiple times to drain user funds.

**Solution:** The `JACKSettlementAdapter` maintains a `settledIntents` mapping that tracks which intents have been processed:

```solidity
mapping(bytes32 => bool) public settledIntents;
```

Once an intent is settled, it cannot be settled again. The contract reverts with `IntentAlreadySettled` if a duplicate settlement is attempted.

**Usage:** Developers should be aware that each intent ID can only be settled once. Generate unique intent IDs for each user transaction.

### 2. Native ETH Restriction

**Issue:** Native ETH (address(0)) cannot be properly handled in the settlement flow because the contract cannot pull ETH from the user.

**Solution:** The contracts explicitly reject native ETH as `tokenIn` or settlement currency:

```solidity
if (intent.tokenIn == address(0)) revert NativeEthNotSupported();
```

**Important:** For native ETH swaps, users **must** use Wrapped ETH (WETH) instead. The contracts only support ERC-20 tokens.

### 3. Pool Validation

**Issue:** Without validation, a malicious solver could route funds to an incorrect pool or wrong token pair, potentially causing loss of funds.

**Solution:** The `_validatePoolMatchesIntent()` function ensures that the pool currencies match the intent's tokenIn and tokenOut:

```solidity
function _validatePoolMatchesIntent(PoolKey calldata poolKey, Intent calldata intent) internal pure {
    Currency tokenInCur = Currency.wrap(intent.tokenIn);
    Currency tokenOutCur = Currency.wrap(intent.tokenOut);
    bool valid =
        (tokenInCur == poolKey.currency0 && tokenOutCur == poolKey.currency1) ||
        (tokenInCur == poolKey.currency1 && tokenOutCur == poolKey.currency0);
    if (!valid) revert PoolMismatch();
}
```

The contract validates that the pool's currency pair matches the signed intent before executing the swap.

### 4. Two-Step Ownership Transfer

**Issue:** Single-step ownership transfer is risky. If the owner accidentally transfers to the wrong address, control is permanently lost.

**Solution:** Both `JACKSettlementAdapter` and `JACKPolicyHook` implement a two-step ownership transfer pattern:

```solidity
// Step 1: Current owner proposes new owner
function transferOwnership(address newOwner) external onlyOwner {
    pendingOwner = newOwner;
}

// Step 2: Proposed owner accepts ownership
function acceptOwnership() external {
    require(msg.sender == pendingOwner);
    owner = pendingOwner;
    delete pendingOwner;
}
```

This prevents accidental ownership loss and ensures the new owner can access the contract before the transfer is finalized.

### Security Audit

For complete details on the security audit findings and implemented fixes, see [Security Audit Findings](.github/ISSUE_TEMPLATE/security-audit-findings.md).

## Issue Tracking

- D1-CRIT-A1 implementation is tracked in GitHub issue #1.
- PRs for this work should include `Fixes #1` (or `Closes #1`) in the body to auto-link and close the issue on merge.
