# Installation & Setup

This guide will help you install and configure the JACK TypeScript SDK.

## Prerequisites

- Node.js 18+ or 20+
- npm, pnpm, or yarn
- TypeScript 5.0+ (recommended)

## Installation

### Using npm

```bash
npm install @jack-kernel/sdk
```

### Using pnpm

```bash
pnpm add @jack-kernel/sdk
```

### Using yarn

```bash
yarn add @jack-kernel/sdk
```

## Peer Dependencies

The SDK requires `viem` for EIP-712 signing:

```bash
npm install viem
```

## Optional Dependencies

### LI.FI Integration

LI.FI is included by default as a dependency:

```bash
# Already included
@lifi/sdk
```

### Yellow Network Integration

For Yellow Network state channels, you'll need a wallet client from `viem`:

```typescript
import { createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http()
});
```

## Basic Configuration

### Minimal Setup

```typescript
import { JACK_SDK } from '@jack-kernel/sdk';

const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example'
});
```

### Production Setup

```typescript
import { JACK_SDK } from '@jack-kernel/sdk';

const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example',
  timeout: 60000,
  maxRetries: 5,
  headers: {
    'Authorization': 'Bearer your-api-token',
    'X-Client-Version': '1.0.0'
  }
});
```

### With LI.FI Integration

```typescript
import { JACK_SDK } from '@jack-kernel/sdk';

const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example',
  lifi: {
    integrator: 'jackkernel',
    maxRetries: 3
  }
});
```

### With Yellow Network Integration

```typescript
import { JACK_SDK } from '@jack-kernel/sdk';
import { createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http()
});

const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example',
  yellow: {
    custodyAddress: '0x...',
    adjudicatorAddress: '0x...',
    chainId: 1,
    walletClient
  }
});
```

### Full Configuration

```typescript
import { JACK_SDK } from '@jack-kernel/sdk';

const sdk = new JACK_SDK({
  // Required
  baseUrl: 'https://api.jack.example',
  
  // Optional HTTP settings
  timeout: 60000,
  maxRetries: 5,
  retryDelay: 1000,
  retryBackoff: 2,
  
  // Optional caching
  enableCache: true,
  cacheTTL: 60000,
  
  // Optional headers
  headers: {
    'Authorization': 'Bearer token',
    'X-Client-Version': '1.0.0'
  },
  
  // Optional LI.FI
  lifi: {
    integrator: 'jackkernel',
    maxRetries: 3
  },
  
  // Optional Yellow Network
  yellow: {
    custodyAddress: '0x...',
    adjudicatorAddress: '0x...',
    chainId: 1,
    walletClient: myWalletClient
  }
});
```

## Configuration Options

### ClientConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | **required** | Base URL for the JACK API |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum number of retry attempts |
| `retryDelay` | `number` | `1000` | Initial delay between retries in ms |
| `retryBackoff` | `number` | `2` | Backoff multiplier for exponential retry |
| `enableCache` | `boolean` | `true` | Enable response caching for GET requests |
| `cacheTTL` | `number` | `60000` | Cache time-to-live in milliseconds |
| `headers` | `Record<string, string>` | `{}` | Custom HTTP headers for all requests |

### LifiConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `integrator` | `string` | `'jackkernel'` | Integrator identifier for LI.FI |
| `maxRetries` | `number` | `3` | Maximum retry attempts for LI.FI calls |

### YellowConfig

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `custodyAddress` | `string` | ✅ | Custody contract address |
| `adjudicatorAddress` | `string` | ✅ | Adjudicator contract address |
| `chainId` | `number` | ✅ | Chain ID for Yellow Network |
| `walletClient` | `WalletClient` | ✅ | Viem wallet client for signing |

## Environment Variables

You can use environment variables for configuration:

```typescript
const sdk = new JACK_SDK({
  baseUrl: process.env.JACK_API_URL || 'https://api.jack.example',
  headers: {
    'Authorization': `Bearer ${process.env.JACK_API_TOKEN}`
  },
  lifi: {
    integrator: process.env.LIFI_INTEGRATOR || 'jackkernel'
  }
});
```

## Verification

Verify your installation:

```typescript
import { JACK_SDK } from '@jack-kernel/sdk';

const sdk = new JACK_SDK({
  baseUrl: 'https://api.jack.example'
});

console.log('SDK initialized successfully!');
console.log('Managers available:', {
  intents: !!sdk.intents,
  execution: !!sdk.execution,
  costs: !!sdk.costs,
  agent: !!sdk.agent,
  lifi: !!sdk.lifi,
  yellow: !!sdk.yellow
});
```

## Next Steps

Continue exploring the SDK documentation to learn more about creating and managing intents.
