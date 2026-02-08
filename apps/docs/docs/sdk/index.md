# JACK TypeScript SDK

The JACK TypeScript SDK provides a comprehensive, type-safe interface for creating and managing cross-chain intents, tracking execution, and monitoring costs.

## Quick Links

- [Installation & Setup](./installation.md)

## Features

- 🔒 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🔄 **Automatic Retries**: Built-in exponential backoff for transient failures
- 💾 **Smart Caching**: Optional response caching to reduce API calls
- 📊 **Execution Tracking**: Real-time polling and event-based status updates
- 🚀 **Batch Operations**: Submit and track multiple intents efficiently
- 🛡️ **Error Handling**: Detailed error types with context for debugging
- 📦 **Dual Module Support**: Works with both ESM and CommonJS
- 🌐 **Dual Provider Support**: LI.FI for DEX aggregation + Yellow Network for state channels
- ⚡ **Cross-Chain Routing**: Seamless token swaps across Arbitrum, Optimism, Base, and Polygon

## Installation

```bash
npm install @jack-kernel/sdk
```

Or with pnpm:

```bash
pnpm add @jack-kernel/sdk
```

## Basic Usage

```typescript
import { JACK_SDK } from '@jack-kernel/sdk';

// Initialize the SDK
const sdk = new JACK_SDK({ 
  baseUrl: 'https://api.jack.example' 
});

// Create intent parameters
const params = {
  sourceChain: 'arbitrum',
  destinationChain: 'base',
  tokenIn: '0xUSDC...',
  tokenOut: '0xWETH...',
  amountIn: '1000000',
  minAmountOut: '42000000000000000',
  deadline: Date.now() + 3600000
};

// Get EIP-712 typed data for signing
const typedData = sdk.intents.getTypedData(params);

// Sign with your wallet
const signature = await wallet.signTypedData(typedData);

// Submit the signed intent
const intentId = await sdk.submitIntent(params, signature);

// Wait for settlement
const intent = await sdk.waitForSettlement(intentId);
console.log('Settlement tx:', intent.settlementTx);
```

## Dual Provider Architecture

The SDK supports both LI.FI and Yellow Network providers working together:

```typescript
const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example',
  
  // LI.FI for cross-chain routing
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

## Version History

### v1.2.2 (Latest)
- Updated documentation with correct links
- Added community links (Discord, X)
- Documented dual provider architecture

### v1.2.1
- Complete LI.FI SDK integration
- Settlement adapter contracts
- Contract documentation
- Social links across all apps

### v1.1.0
- Yellow Network integration
- State channel management
- ERC-7824 support

## Support

- **NPM Package**: [@jack-kernel/sdk](https://www.npmjs.com/package/@jack-kernel/sdk)
- **Repository**: [GitHub](https://github.com/hashpass-tech/JACK)
- **Issues**: [GitHub Issues](https://github.com/hashpass-tech/JACK/issues)
- **Discord**: [Join our community](https://discord.gg/7k8CdmYHpn)
- **X (Twitter)**: [@Jack_kernel](https://x.com/Jack_kernel)

## Next Steps

- [Installation & Setup](./installation.md) - Get started with the SDK
