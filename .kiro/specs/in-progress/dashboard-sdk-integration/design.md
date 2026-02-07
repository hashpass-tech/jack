# Dashboard SDK Integration - Design

## Architecture Overview

```
Dashboard App
├── Components
│   ├── Dashboard.tsx (main orchestrator)
│   ├── CreateIntentView.tsx (intent creation)
│   ├── ExecutionsListView.tsx (intent listing)
│   ├── ExecutionDetailView.tsx (execution tracking)
│   └── AgentCostDashboard.tsx (cost tracking)
├── Services
│   ├── sdkClient.ts (SDK initialization)
│   ├── intentService.ts (intent operations)
│   ├── executionService.ts (execution tracking)
│   └── costService.ts (cost tracking)
└── Hooks
    ├── useIntents.ts (intent management hook)
    ├── useExecution.ts (execution tracking hook)
    └── useCosts.ts (cost tracking hook)
```

## SDK Integration Points

### 1. SDK Initialization (sdkClient.ts)

```typescript
import { JACK_SDK } from '@jack-kernel/sdk';

const sdkClient = new JACK_SDK({
  baseUrl: process.env.REACT_APP_SDK_BASE_URL || '/api',
  timeout: 30000,
  maxRetries: 3,
  enableCache: true,
  cacheTTL: 60000
});

export default sdkClient;
```

### 2. Intent Management (intentService.ts)

**Operations:**
- `listIntents()` - Get all intents
- `getIntent(id)` - Get specific intent
- `submitIntent(params, signature)` - Submit new intent
- `getTypedData(params)` - Get EIP-712 typed data for signing

**Error Handling:**
- ValidationError - Invalid parameters
- NetworkError - Network failures
- APIError - Server errors
- TimeoutError - Request timeout

### 3. Execution Tracking (executionService.ts)

**Operations:**
- `getStatus(intentId)` - Get current status
- `waitForStatus(intentId, targetStatus)` - Poll until status reached
- `watch(intentId)` - Real-time status updates

**Features:**
- Automatic polling with configurable interval
- Timeout handling
- Event callbacks (onUpdate, onError, onComplete)
- Graceful error handling

### 4. Cost Tracking (costService.ts)

**Operations:**
- `getCosts()` - Get all costs
- `getIssueCost(issueId)` - Get cost for specific intent
- `getOverBudgetIssues()` - Get over-budget intents

**Features:**
- Cost aggregation
- Budget tracking
- Over-budget alerts

## Component Refactoring

### Dashboard.tsx
- Initialize SDK on mount
- Manage global state for intents and executions
- Handle SDK errors globally
- Provide SDK context to child components

### CreateIntentView.tsx
- Use `sdk.intents.getTypedData()` for EIP-712 signing
- Use `sdk.intents.submit()` for submission
- Handle ValidationError for invalid inputs
- Show loading state during submission

### ExecutionsListView.tsx
- Use `sdk.intents.list()` to fetch intents
- Display intent status from SDK response
- Implement pagination if needed
- Handle NetworkError gracefully

### ExecutionDetailView.tsx
- Use `sdk.execution.watch()` for real-time updates
- Use `sdk.execution.waitForStatus()` for polling
- Handle TimeoutError with user notification
- Display execution steps from SDK response

### AgentCostDashboard.tsx
- Use `sdk.costs.getCosts()` to fetch costs
- Use `sdk.costs.getOverBudgetIssues()` for alerts
- Display cost breakdown
- Handle cost API errors

## Custom Hooks

### useIntents()
```typescript
const { intents, loading, error, refetch } = useIntents();
```

### useExecution(intentId)
```typescript
const { status, steps, loading, error, waitForSettlement } = useExecution(intentId);
```

### useCosts()
```typescript
const { costs, overBudget, loading, error } = useCosts();
```

## Error Handling Strategy

### Error Types
1. **ValidationError** - Show form validation errors
2. **NetworkError** - Show "Connection failed" message
3. **TimeoutError** - Show "Request timed out" message
4. **APIError** - Show "Server error" message with status code
5. **JackError** - Generic error handling

### User Feedback
- Toast notifications for errors
- Error details in console for debugging
- Retry buttons for transient failures
- Clear error messages in UI

## State Management

### Local State
- Component-level state for forms and UI
- Use React hooks (useState, useEffect)

### Global State
- SDK client instance (singleton)
- Cached intent list
- Current execution status
- Cost information

### Caching Strategy
- SDK's built-in cache for GET requests
- Manual cache invalidation on mutations
- TTL-based cache expiration

## Testing Strategy

### Unit Tests
- Test service functions with mocked SDK
- Test component rendering with mocked data
- Test error handling

### Integration Tests
- Test components with real SDK (mocked API)
- Test complete workflows
- Test error scenarios

### E2E Tests
- Test complete user flows
- Test with real backend
- Test error recovery

## Performance Considerations

### Optimization
- Use SDK's built-in caching
- Batch operations with `sdk.agent.batchSubmit()`
- Lazy load components
- Memoize expensive computations

### Monitoring
- Track API response times
- Monitor error rates
- Track cache hit rates
- Monitor polling frequency

## Migration Plan

### Phase 1: Setup
- Create SDK client initialization
- Create service layer
- Create custom hooks

### Phase 2: Intent Management
- Refactor CreateIntentView
- Refactor ExecutionsListView
- Update intent-related components

### Phase 3: Execution Tracking
- Refactor ExecutionDetailView
- Implement real-time updates
- Add polling logic

### Phase 4: Cost Tracking
- Refactor AgentCostDashboard
- Implement cost display
- Add budget alerts

### Phase 5: Testing & Polish
- Write comprehensive tests
- Performance optimization
- Error handling refinement
- Documentation

## Configuration

### Environment Variables
```
REACT_APP_SDK_BASE_URL=/api
REACT_APP_SDK_TIMEOUT=30000
REACT_APP_SDK_MAX_RETRIES=3
REACT_APP_SDK_CACHE_TTL=60000
```

### SDK Configuration
```typescript
{
  baseUrl: process.env.REACT_APP_SDK_BASE_URL || '/api',
  timeout: parseInt(process.env.REACT_APP_SDK_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.REACT_APP_SDK_MAX_RETRIES || '3'),
  enableCache: true,
  cacheTTL: parseInt(process.env.REACT_APP_SDK_CACHE_TTL || '60000')
}
```

## Type Safety

### TypeScript Configuration
- Enable strict mode
- Export SDK types
- Document all public APIs
- Use discriminated unions for error handling

### Type Exports
```typescript
export type {
  Intent,
  IntentParams,
  ExecutionStatus,
  ExecutionStep,
  CostEntry,
  IssueCost
} from '@jack-kernel/sdk';
```

## Documentation

### Code Documentation
- JSDoc comments on all functions
- Type documentation
- Error handling documentation
- Usage examples

### User Documentation
- Dashboard user guide
- Error message explanations
- Troubleshooting guide
- FAQ

## Success Metrics

- [ ] All SDK methods used in dashboard
- [ ] 100% type coverage
- [ ] >80% code coverage
- [ ] Zero console errors
- [ ] <100ms average API response time
- [ ] <5% error rate
- [ ] All tests passing
- [ ] No breaking changes
