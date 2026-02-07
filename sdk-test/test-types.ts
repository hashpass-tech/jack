// Test TypeScript types
import { JACK_SDK, ExecutionStatus, type IntentParams, type Intent } from '@jack-kernel/sdk';

const sdk = new JACK_SDK({ baseUrl: 'https://api.example.com' });

// Test type checking
const params: IntentParams = {
  sourceChain: 'ethereum',
  destinationChain: 'polygon',
  tokenIn: '0x...',
  tokenOut: '0x...',
  amountIn: '1000000000000000000',
  minAmountOut: '900000000000000000',
  deadline: Math.floor(Date.now() / 1000) + 3600
};

console.log('✓ TypeScript types imported successfully');
console.log('✓ IntentParams type available');
console.log('✓ Intent type available');
console.log('✓ ExecutionStatus enum available');

console.log('\n✅ All TypeScript type tests passed!');
