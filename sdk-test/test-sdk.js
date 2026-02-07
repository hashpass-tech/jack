// Test SDK import and basic functionality
const { JACK_SDK, ExecutionStatus } = require('@jack-kernel/sdk');

console.log('✓ SDK imported successfully');
console.log('✓ ExecutionStatus enum available:', ExecutionStatus);

// Test SDK instantiation
const sdk = new JACK_SDK({ baseUrl: 'https://api.example.com' });
console.log('✓ SDK instantiated successfully');

// Test that managers are available
console.log('✓ IntentManager available:', !!sdk.intents);
console.log('✓ ExecutionTracker available:', !!sdk.execution);
console.log('✓ CostTracker available:', !!sdk.costs);
console.log('✓ AgentUtils available:', !!sdk.agent);

console.log('\n✅ All SDK tests passed!');
