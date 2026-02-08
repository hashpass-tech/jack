# JACK SDK v1.2.1 Release Notes

**Release Date**: February 7, 2026  
**Tag**: `sdk-v1.2.1`  
**NPM Package**: `@jack-kernel/sdk@1.2.1`

## Overview

JACK SDK v1.2.1 introduces comprehensive LI.FI integration for cross-chain routing and quotes, working seamlessly alongside the existing Yellow Network integration from v1.1.0. This release also includes production-ready settlement adapter contracts and enhanced community engagement features.

## 🎯 Key Features

### LI.FI Integration

Complete integration of the official `@lifi/sdk` package for cross-chain DEX aggregation and bridge routing:

```typescript
import { JACK_SDK } from '@jack-kernel/sdk';

// Initialize with LI.FI support
const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example',
  lifi: {
    integrator: 'jackkernel',
    maxRetries: 3,
  }
});

// Fetch cross-chain quotes
const quote = await sdk.getLifiQuote({
  sourceChain: 'arbitrum',
  destinationChain: 'optimism',
  tokenIn: 'USDC',
  tokenOut: 'WETH',
  amountIn: '100',
  minAmountOut: '0.035',
  deadline: Date.now() + 3600000,
});

console.log(`Quote: ${quote.quote.amountOut} WETH`);
console.log(`Provider: ${quote.provider}`); // 'lifi' or 'fallback'
```

### Dual Provider Architecture

Both LI.FI and Yellow Network integrations work side-by-side:

```typescript
const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example',
  
  // Yellow Network for state channels
  yellow: {
    custodyAddress: '0x...',
    adjudicatorAddress: '0x...',
    chainId: 1,
    walletClient: myWalletClient,
  },
  
  // LI.FI for cross-chain routing
  lifi: {
    integrator: 'jackkernel',
  }
});

// Use both providers
await sdk.yellow?.createChannel(...);
await sdk.lifi?.fetchQuote(...);
```

## 📦 What's New

### LI.FI Provider (`packages/sdk/src/lifi/`)

**Core Components:**
- `LifiProvider` - Main provider class with retry logic and fallback
- `types.ts` - Complete TypeScript definitions for all payloads
- `chain-map.ts` - Chain name to ID resolution (Arbitrum, Optimism, Base, Polygon)
- `token-map.ts` - Token symbol to address resolution (USDC, WETH, ETH)
- `utils.ts` - Unit conversion utilities (`toBaseUnits`, `fromBaseUnits`)
- `fallback.ts` - Fallback quote/route generation with static rates

**Key Features:**
- ✅ Automatic retry with exponential backoff (429, 5xx errors)
- ✅ Fallback to static rates when LI.FI unavailable
- ✅ Case-insensitive chain and token lookups
- ✅ Full TypeScript type safety
- ✅ Deterministic route IDs for caching

### Settlement Adapter Contracts

**Production-Ready Smart Contracts:**
- `contracts/src/JACKSettlementAdapter.sol` - Settlement adapter with Uniswap v4 integration
- `contracts/test/JACKSettlementAdapter.t.sol` - Comprehensive test suite (211 tests)

**Features:**
- EIP-712 signature validation
- Solver authorization (whitelist-based)
- Policy integration via `JACKPolicyHook`
- Atomic swaps through Uniswap v4
- Reentrancy protection
- Owner management

### Documentation

**New Documentation:**
- `apps/docs/docs/contracts/index.md` - Contracts overview
- `apps/docs/docs/contracts/settlement-adapter.md` - Detailed settlement adapter docs
- Architecture diagrams and flow charts
- API reference and integration guides

### Community Features

**Social Links Added:**
- Discord: `https://discord.gg/7k8CdmYHpn`
- X (Twitter): `https://x.com/Jack_kernel`
- Integrated across dashboard, landing page, and documentation

## 🔧 API Changes

### New Exports

```typescript
// LI.FI Provider
export { LifiProvider } from '@jack-kernel/sdk';
export type { LifiConfig } from '@jack-kernel/sdk';

// LI.FI Types
export type {
  LifiQuotePayload,
  LifiRoutePayload,
  LifiStatusPayload,
  LifiReasonCode,
  LifiFallback,
} from '@jack-kernel/sdk';

// Utilities
export {
  resolveChain,
  getSupportedChains,
  resolveToken,
  getSupportedTokens,
  toBaseUnits,
  fromBaseUnits,
} from '@jack-kernel/sdk';
```

### JACK_SDK Constructor

```typescript
// Extended constructor signature
constructor(config: ClientConfig & {
  yellow?: YellowSDKConfig;  // Optional Yellow Network
  lifi?: LifiConfig;          // Optional LI.FI
})
```

### New Convenience Methods

```typescript
// LI.FI convenience methods
sdk.getLifiQuote(params: IntentParams): Promise<LifiQuotePayload>
sdk.getLifiRoute(params: IntentParams): Promise<LifiRoutePayload>
```

## 📊 Supported Chains & Tokens

### Chains
- **Arbitrum** (42161)
- **Optimism** (10)
- **Base** (8453)
- **Polygon** (137)

### Tokens (per chain)
- **USDC** - USD Coin (6 decimals)
- **WETH** - Wrapped Ether (18 decimals)
- **ETH** - Native Ether (18 decimals)

## 🔄 Fallback Behavior

When LI.FI API is unavailable, the provider automatically falls back to static rates:

| Pair | Rate |
|------|------|
| USDC → WETH | 0.0004 |
| USDC → ETH | 0.0004 |
| ETH → USDC | 2500 |
| WETH → USDC | 2500 |
| ETH ↔ WETH | 1 |

Fallback payloads include:
```typescript
{
  provider: 'fallback',
  fallback: {
    enabled: true,
    reasonCode: 'LIFI_UNAVAILABLE', // or other reason
    message: 'LI.FI is unavailable'
  }
}
```

## 🧪 Testing

**Test Coverage:**
- **517 total tests** passing
- Yellow Network: 179 tests
- LI.FI: (optional property tests available)
- Core SDK: 338 tests

**Build Verification:**
- ✅ ESM build
- ✅ CJS build
- ✅ Type declarations
- ✅ Dashboard build
- ✅ All apps compile

## 📝 Migration Guide

### Dashboard Migration

The dashboard's `apps/dashboard/src/lib/lifi.ts` has been migrated from raw REST calls to SDK-level provider:

**Before (v1.1.0):**
```typescript
// Raw REST calls to https://li.quest/v1
const response = await fetch(`${LIFI_BASE_URL}/quote?...`);
const data = await response.json();
```

**After (v1.2.1):**
```typescript
import { LifiProvider } from '@jack-kernel/sdk';

const provider = new LifiProvider({ integrator: 'jackkernel' });
const quote = await provider.fetchQuote(params);
```

**Backward Compatibility:**
All existing exports remain unchanged:
- `fetchLifiQuote(params)` ✅
- `fetchLifiRoute(params)` ✅
- `fetchLifiStatus(txHash)` ✅
- Type exports ✅

## 🔗 Dependencies

### New Dependencies
- `@lifi/sdk@^3.15.5` - Official LI.FI SDK

### Peer Dependencies (unchanged)
- `viem@^2.0.0`

## 🚀 Installation

```bash
# Install or upgrade
npm install @jack-kernel/sdk@1.2.1

# Or with pnpm
pnpm add @jack-kernel/sdk@1.2.1

# Or with yarn
yarn add @jack-kernel/sdk@1.2.1
```

## 📚 Documentation

- **SDK Documentation**: https://jack.hashpass.tech/docs
- **Settlement Adapter**: https://jack.hashpass.tech/docs/contracts/settlement-adapter
- **GitHub Repository**: https://github.com/hashpass-tech/JACK
- **Discord Community**: https://discord.gg/7k8CdmYHpn
- **X (Twitter)**: https://x.com/Jack_kernel

## 🐛 Bug Fixes

None in this release (feature-focused release).

## ⚠️ Breaking Changes

None. This release is fully backward compatible with v1.1.0.

## 🔮 What's Next

### Planned for v1.3.0
- Property-based tests for LI.FI integration
- Additional chain support (Ethereum mainnet, BSC, Avalanche)
- Enhanced metrics and monitoring
- Provider selection logic (auto-choose best provider per intent)

## 👥 Contributors

- @edcalderon - LI.FI integration, settlement adapter, documentation
- Codex AI - Contract implementation and testing
- Copilot AI - Documentation generation

## 📄 License

MIT License - See LICENSE file for details

---

**Full Changelog**: https://github.com/hashpass-tech/JACK/compare/sdk-v1.1.0...sdk-v1.2.1
