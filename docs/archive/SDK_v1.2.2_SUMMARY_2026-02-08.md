# SDK v1.2.2 Release Summary

**Release Date**: February 8, 2026  
**Tag**: `sdk-v1.2.2`  
**Type**: Documentation Update

## Overview

SDK v1.2.2 is a documentation-only release that updates all README files with correct links, adds community links (Discord, X), and documents the dual provider architecture (LI.FI + Yellow Network).

## Changes

### SDK README (`packages/sdk/README.md`)

**Updated Features Section:**
- ✅ Added "Dual Provider Support" feature
- ✅ Added "Cross-Chain Routing" feature

**Updated Installation:**
- ✅ Changed package name from `@jack/sdk` to `@jack-kernel/sdk`
- ✅ Added optional dependencies section for LI.FI

**New Examples:**
- ✅ LI.FI Integration example with quote fetching
- ✅ Yellow Network Integration example with state channels
- ✅ Dual Provider Architecture example showing both providers working together

**Updated Imports:**
- ✅ All code examples now use `@jack-kernel/sdk` instead of `@jack/sdk`

**Updated Type Exports:**
- ✅ Added LI.FI types: `LifiProvider`, `LifiConfig`, `LifiQuotePayload`, etc.
- ✅ Added Yellow Network types: `YellowProvider`, `YellowConfig`, `ChannelState`, etc.

**Updated Support Section:**
- ✅ Documentation: `https://jack.hashpass.tech/docs`
- ✅ Repository: `https://github.com/hashpass-tech/JACK`
- ✅ Discord: `https://discord.gg/7k8CdmYHpn`
- ✅ X (Twitter): `https://x.com/Jack_kernel`

### Main README (`README.md`)

**New Community Section:**
- ✅ Discord: `https://discord.gg/7k8CdmYHpn`
- ✅ X (Twitter): `https://x.com/Jack_kernel`
- ✅ GitHub: `https://github.com/hashpass-tech/JACK`

**Updated Documentation Link:**
- ✅ Changed from `https://docs.jack.lukas.money` to `https://jack.hashpass.tech/docs`

### CHANGELOG.md

**Added v1.2.2 Entry:**
- ✅ Documented all README updates
- ✅ Listed all link corrections
- ✅ Noted this is a documentation-only release

### Package Metadata

**Updated Version:**
- ✅ `packages/sdk/package.json`: `1.2.1` → `1.2.2`

## What's New for Users

### Dual Provider Architecture

Users can now use both LI.FI and Yellow Network simultaneously:

```typescript
const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example',
  
  // LI.FI for DEX aggregation
  lifi: {
    integrator: 'jackkernel'
  },
  
  // Yellow Network for state channels
  yellow: {
    custodyAddress: '0x...',
    adjudicatorAddress: '0x...',
    chainId: 1,
    walletClient: myWalletClient
  }
});
```

### LI.FI Integration

Cross-chain routing with automatic fallback:

```typescript
const quote = await sdk.getLifiQuote({
  sourceChain: 'arbitrum',
  destinationChain: 'optimism',
  tokenIn: 'USDC',
  tokenOut: 'WETH',
  amountIn: '100',
  minAmountOut: '0.035',
  deadline: Date.now() + 3600000
});
```

### Yellow Network Integration

State channel management:

```typescript
const channel = await sdk.yellow?.createChannel({
  counterparty: '0x...',
  asset: '0xUSDC...',
  amount: '1000000'
});
```

## Community Links

All documentation now includes:
- **Discord**: Join our community at `https://discord.gg/7k8CdmYHpn`
- **X (Twitter)**: Follow us at `https://x.com/Jack_kernel`
- **GitHub**: Contribute at `https://github.com/hashpass-tech/JACK`

## Technical Details

- **No Code Changes**: This is purely a documentation update
- **Testing**: 517 tests still passing (no changes)
- **Build**: All targets compile successfully (ESM, CJS, types)
- **Compatibility**: Fully backward compatible with v1.2.1

## Git Operations

```bash
# Committed changes
git commit -m "docs(sdk): release v1.2.2 with updated documentation and links"

# Pushed to develop
git push origin develop

# Created and pushed tag
git tag sdk-v1.2.2
git push origin sdk-v1.2.2
```

## GitHub Actions

The SDK will be automatically published to npm via GitHub Actions workflow when the tag is detected.

## Migration from v1.2.1

No migration needed! This is a documentation-only release. All code from v1.2.1 works exactly the same in v1.2.2.

## Files Changed

```
CHANGELOG.md                    (added v1.2.2 entry)
README.md                       (added Community section)
packages/sdk/README.md          (comprehensive updates)
packages/sdk/package.json       (version bump)
```

## Summary

SDK v1.2.2 ensures all documentation is accurate, up-to-date, and includes proper community links. Users now have clear examples of how to use both LI.FI and Yellow Network providers, and can easily find the community on Discord and X.

---

**Full Changelog**: https://github.com/hashpass-tech/JACK/compare/sdk-v1.2.1...sdk-v1.2.2
