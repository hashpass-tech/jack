# Dashboard SDK Integration - Requirements

## Overview
Integrate the JACK TypeScript SDK (@jack-kernel/sdk) into the dashboard application to replace manual API calls with the official SDK, improving type safety, maintainability, and consistency.

## User Stories

### 1. Replace Intent API Calls with SDK
**As a** dashboard developer  
**I want to** use the JACK SDK for intent management  
**So that** I have type-safe, consistent intent operations

**Acceptance Criteria:**
- 1.1 Replace manual fetch calls to `/api/intents` with `sdk.intents.list()`
- 1.2 Replace manual fetch calls to `/api/intents/{id}` with `sdk.intents.get(id)`
- 1.3 Replace manual fetch calls to POST `/api/intents` with `sdk.intents.submit(params, signature)`
- 1.4 All intent operations use SDK methods with proper error handling
- 1.5 TypeScript types from SDK are used throughout dashboard

### 2. Replace Execution Status Polling with SDK
**As a** dashboard developer  
**I want to** use the JACK SDK for execution tracking  
**So that** I have reliable, tested polling logic

**Acceptance Criteria:**
- 2.1 Replace manual polling logic with `sdk.execution.waitForStatus()`
- 2.2 Replace status queries with `sdk.execution.getStatus()`
- 2.3 Use `sdk.execution.watch()` for real-time status updates
- 2.4 Implement proper timeout handling using SDK's TimeoutError
- 2.5 Dashboard updates reflect execution status changes in real-time

### 3. Implement Cost Tracking with SDK
**As a** dashboard user  
**I want to** see cost information for intents  
**So that** I can monitor execution costs

**Acceptance Criteria:**
- 3.1 Use `sdk.costs.getCosts()` to fetch all costs
- 3.2 Use `sdk.costs.getIssueCost(issueId)` for specific intent costs
- 3.3 Use `sdk.costs.getOverBudgetIssues()` to identify over-budget intents
- 3.4 Display cost information in dashboard UI
- 3.5 Handle cost API errors gracefully

### 4. Update Dashboard Components
**As a** dashboard developer  
**I want to** refactor dashboard components to use SDK  
**So that** the codebase is cleaner and more maintainable

**Acceptance Criteria:**
- 4.1 Update Dashboard.tsx to use SDK managers
- 4.2 Update ExecutionDetailView to use SDK execution tracking
- 4.3 Update ExecutionsListView to use SDK intent listing
- 4.4 Update CreateIntentView to use SDK intent submission
- 4.5 All components properly handle SDK errors
- 4.6 TypeScript strict mode enabled for all components

### 5. Error Handling and User Feedback
**As a** dashboard user  
**I want to** see clear error messages when operations fail  
**So that** I understand what went wrong

**Acceptance Criteria:**
- 5.1 Catch and display ValidationError messages
- 5.2 Catch and display NetworkError messages
- 5.3 Catch and display TimeoutError messages
- 5.4 Catch and display APIError messages with status codes
- 5.5 Provide retry options for transient failures
- 5.6 Log errors for debugging

### 6. Testing
**As a** dashboard developer  
**I want to** have tests for SDK integration  
**So that** I can ensure reliability

**Acceptance Criteria:**
- 6.1 Unit tests for SDK integration in components
- 6.2 Mock SDK for component testing
- 6.3 Integration tests with real SDK
- 6.4 Test error scenarios
- 6.5 Test timeout scenarios
- 6.6 Achieve >80% code coverage for new code

## Technical Requirements

### Dependencies
- @jack-kernel/sdk@^1.0.0 (already installed)
- viem@^2.0.0 (peer dependency)

### Configuration
- SDK baseUrl should be configurable (environment variable or config)
- Default baseUrl: `/api` (relative to dashboard)
- Timeout values should be configurable

### Type Safety
- Use TypeScript strict mode
- Export SDK types from dashboard for use in other apps
- Document all public APIs with JSDoc

### Performance
- Implement request caching where appropriate
- Use SDK's built-in caching for GET requests
- Batch operations where possible using `sdk.agent.batchSubmit()`

### Error Handling
- Catch all SDK error types
- Provide user-friendly error messages
- Log errors for debugging
- Implement retry logic for transient failures

## Acceptance Criteria Summary

- [ ] All intent operations use SDK
- [ ] All execution tracking uses SDK
- [ ] Cost tracking implemented with SDK
- [ ] All components refactored to use SDK
- [ ] Error handling implemented for all SDK error types
- [ ] Tests written and passing
- [ ] Code coverage >80%
- [ ] TypeScript strict mode enabled
- [ ] Documentation updated
- [ ] No breaking changes to dashboard API

## Definition of Done

1. All acceptance criteria met
2. Code reviewed and approved
3. Tests passing (unit, integration, e2e)
4. Code coverage >80%
5. Documentation updated
6. No console errors or warnings
7. Performance acceptable
8. Deployed to staging and tested
9. Ready for production release
