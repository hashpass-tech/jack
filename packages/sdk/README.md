# JACK TypeScript SDK

TypeScript SDK for JACK cross-chain execution kernel.

## Installation

```bash
npm install @jack/sdk
# or
pnpm add @jack/sdk
```

## Quick Start

```typescript
import { JACK_SDK } from '@jack/sdk';

const sdk = new JACK_SDK({ baseUrl: 'https://api.jack.example' });

// Create and submit an intent
const params = {
  sourceChain: 'arbitrum',
  destinationChain: 'base',
  tokenIn: '0xUSDC',
  tokenOut: '0xWETH',
  amountIn: '1000000',
  minAmountOut: '42000000000000000',
  deadline: Date.now() + 3600000
};

const typedData = sdk.intents.getTypedData(params);
const signature = await wallet.signTypedData(typedData);
const intentId = await sdk.submitIntent(params, signature);

// Track execution
const intent = await sdk.execution.waitForStatus(intentId, 'SETTLED');
console.log('Settlement tx:', intent.settlementTx);
```

## Documentation

Full documentation will be added in later tasks.

## License

MIT
