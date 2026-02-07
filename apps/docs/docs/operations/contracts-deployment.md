---
title: Contracts Deployment
sidebar_position: 6
---

# Contracts Deployment (Fast Testnet, Hardened Mainnet)

## Goals

- Keep MVP demo deployments fast on development/testnet.
- Enforce stronger custody and signing controls for mainnet.
- Produce deployment records and smoke-check evidence every run.

## Versioning Strategy

- **App version** follows repo semver tags (`vX.Y.Z`, `vX.Y.Z-testnet.N`).
- **Contract deployment record** is written per environment in `contracts/deployments/<env>/latest.json`.
- Every deployment appends to `contracts/deployments/<env>/history.ndjson`.
- Deployment records include: commit SHA, chain ID, pool manager, hook address, owner, tx hash, and log path.

This gives a simple but reliable mapping: `git tag -> commit -> deployed contract address`.

## Environment Profiles

### Development

- Use `.env.development` (from `.env.development.example`).
- Private key deployment is acceptable for local speed.
- Default target: local Anvil chain.

### Testnet (MVP Demo)

- Use `.env.testnet` (from `.env.testnet.example`).
- Private key deployment is acceptable for demo velocity.
- Recommended: transfer ownership to a dedicated custody address if possible.

### Mainnet (Production)

- Use `.env.mainnet` (from `.env.mainnet.example`).
- Default policy: hardware-wallet signing (`DEPLOY_USE_LEDGER=true`).
- `HOOK_OWNER` must be a custody address (Safe/multisig recommended).
- Raw private-key deploys are blocked unless explicitly overridden with `ALLOW_MAINNET_PRIVATE_KEY=true`.

## Commands

Create local env files first:

```bash
cp contracts/.env.testnet.example contracts/.env.testnet
cp contracts/.env.mainnet.example contracts/.env.mainnet
```

### 1) Deploy JACKPolicyHook

```bash
./scripts/contracts/deploy-hook.sh contracts/.env.testnet
```

For mainnet:

```bash
./scripts/contracts/deploy-hook.sh contracts/.env.mainnet
```

### 2) Run smoke checks and capture evidence

```bash
./scripts/contracts/smoke-hook.sh contracts/.env.testnet
```

Smoke reports are written to:

- `contracts/deployments/<env>/smoke/smoke-<timestamp>.md`

## Production Security Baseline

- Require hardware wallet signing for deploy transactions.
- Transfer hook ownership to Safe/multisig in deploy flow (`HOOK_OWNER`).
- Keep deployment keys out of repo and CI logs.
- Keep deployment history append-only.
- Verify contracts on block explorer for traceability.

## Quick Operator Checklist

1. Confirm branch/tag and commit SHA.
2. Confirm `POOL_MANAGER_ADDRESS` and chain ID.
3. Deploy hook.
4. Run smoke checks (allow + reject path evidence).
5. Record address and tx hashes in the active critical issue.
