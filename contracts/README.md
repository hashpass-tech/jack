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

## Issue Tracking

- D1-CRIT-A1 implementation is tracked in GitHub issue #1.
- PRs for this work should include `Fixes #1` (or `Closes #1`) in the body to auto-link and close the issue on merge.
