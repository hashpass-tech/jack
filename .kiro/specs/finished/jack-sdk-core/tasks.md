# Implementation Plan: JACK TypeScript SDK

## Overview

This plan implements the JACK TypeScript SDK as a production-ready npm package with comprehensive testing, dual module format support (ESM + CommonJS), and automated release workflows. The implementation follows a phased approach: core functionality first, then enhanced features, then polish and automation.

## Tasks

- [x] 1. Project setup and configuration
  - [x] 1.1 Initialize SDK package structure
    - Create `packages/sdk/src/` directory structure
    - Create `packages/sdk/tests/` with subdirectories (unit, integration, property)
    - Set up package.json with proper metadata, scripts, and dependencies
    - Add viem as peer dependency, vitest and fast-check as dev dependencies
    - _Requirements: 10.1, 13.4_
  
  - [x] 1.2 Configure TypeScript build for dual output
    - Create tsconfig.json (base config)
    - Create tsconfig.esm.json (ESM output to dist/esm)
    - Create tsconfig.cjs.json (CommonJS output to dist/cjs)
    - Create tsconfig.types.json (declaration files to dist/types)
    - Configure package.json exports field for dual module support
    - _Requirements: 10.2, 10.3, 5.5_
  
  - [x] 1.3 Configure Vitest for testing
    - Create vitest.config.ts with coverage settings (>80% target)
    - Configure test environment and TypeScript support
    - Add test scripts to package.json (test, test:watch, test:coverage)
    - _Requirements: 9.1, 9.4_
  
  - [x] 1.4 Create .npmignore and build scripts
    - Add .npmignore to exclude source files and configs from npm package
    - Add build scripts (build:esm, build:cjs, build:types, build)
    - Add prepublishOnly script to ensure build and tests run before publish
    - _Requirements: 10.1, 10.2_

- [x] 2. Core types and error handling
  - [x] 2.1 Define core TypeScript types
    - Create src/types.ts with all interfaces (IntentParams, Intent, ExecutionStatus, ExecutionStep, Quote, CostEntry, IssueCost, etc.)
    - Create configuration types (ClientConfig, RequestOptions, PollOptions)
    - Create result types (BatchSubmitResult, DryRunResult, ValidationResult)
    - Export all types from src/types.ts
    - _Requirements: 1.5, 3.4, 4.3, 5.1_
  
  - [x] 2.2 Implement error hierarchy
    - Create src/errors.ts with JackError base class
    - Implement NetworkError, APIError, ValidationError, TimeoutError, RetryError classes
    - Add context fields (statusCode, attempts, originalError, etc.)
    - Export all error classes
    - _Requirements: 5.2, 5.3_
  
  - [x] 2.3 Write unit tests for error classes
    - Test error construction with proper fields
    - Test error inheritance chain
    - Test error serialization for logging
    - _Requirements: 5.2, 5.3_

- [x] 3. HTTP client with retry and caching
  - [x] 3.1 Implement core HTTP client
    - Create src/client.ts with JackClient class
    - Implement constructor with ClientConfig validation
    - Implement get() and post() methods with fetch API
    - Add timeout handling using AbortController
    - _Requirements: 13.1, 13.2, 13.4, 13.5_
  
  - [x] 3.2 Implement retry logic with exponential backoff
    - Add executeWithRetry() private method
    - Implement retry logic for 5xx and network errors
    - Skip retry for 4xx errors
    - Track retry attempts and include in final error
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
  
  - [x] 3.3 Implement simple in-memory cache
    - Create src/cache.ts with Cache class
    - Implement get/set with TTL support
    - Implement cache key generation from URL + params
    - Add clearCache() method with pattern matching
    - Integrate cache into JackClient.get()
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 3.4 Write unit tests for HTTP client
    - Test successful requests
    - Test timeout handling
    - Test custom headers (auth)
    - Test configuration validation
    - _Requirements: 13.1, 13.2, 13.3, 13.5_
  
  - [x] 3.5 Write property test for retry exhaustion
    - **Property 4: Retry Exhaustion**
    - **Validates: Requirements 6.2**
    - Generate random retryable errors, verify error includes retry count after exhaustion
    - _Requirements: 6.2_
  
  - [x] 3.6 Write property test for cache TTL
    - **Property 5: Cache Invalidation**
    - **Validates: Requirements 7.3**
    - Generate random cache entries with TTL, verify fresh fetch after expiry
    - _Requirements: 7.3_
  
  - [x] 3.7 Write property test for configuration validation
    - **Property 10: Configuration Validation**
    - **Validates: Requirements 13.5**
    - Generate random invalid configs, verify ValidationError thrown
    - _Requirements: 13.5_

- [~] 4. Intent management
  - [x] 4.1 Implement EIP-712 serialization
    - Create src/serialization.ts with getTypedData() function
    - Define EIP-712 domain (name: 'JACK', version: '1', chainId, verifyingContract)
    - Define Intent type structure for EIP-712
    - Return properly formatted TypedData object
    - _Requirements: 1.1, 14.1_
  
  - [x] 4.2 Implement intent validation
    - Create src/validation.ts with validateIntentParams() function
    - Validate required fields are present
    - Validate amounts are positive
    - Validate deadline is in the future
    - Validate addresses are valid format
    - Return ValidationResult with errors array
    - _Requirements: 5.4, 8.5_
  
  - [x] 4.3 Implement IntentManager class
    - Create src/intents.ts with IntentManager class
    - Implement getTypedData() method (delegates to serialization)
    - Implement validate() method (delegates to validation)
    - Implement submit() method (validates, then POST to /api/intents)
    - Implement get() method (GET from /api/intents/[id])
    - Implement list() method (GET from /api/intents)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 4.4 Write unit tests for intent management
    - Test getTypedData() returns correct structure
    - Test validate() catches invalid params
    - Test submit() makes correct API call
    - Test get() and list() parse responses correctly
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 4.5 Write property test for EIP-712 consistency
    - **Property 1: EIP-712 Serialization Consistency**
    - **Validates: Requirements 14.1**
    - Generate random IntentParams, call getTypedData() twice, verify identical output
    - _Requirements: 14.1_
  
  - [x] 4.6 Write property test for intent ID format
    - **Property 2: Intent Submission Idempotency Check**
    - **Validates: Requirements 1.2**
    - Generate random intents, submit, verify ID matches JK-[A-Z0-9]{9} pattern
    - _Requirements: 1.2_
  
  - [x] 4.7 Write property test for validation before submission
    - **Property 7: Validation Before Submission**
    - **Validates: Requirements 5.4**
    - Generate random invalid params, verify ValidationError thrown before network call
    - _Requirements: 5.4_

- [~] 5. Execution tracking
  - [x] 5.1 Implement ExecutionTracker class
    - Create src/execution.ts with ExecutionTracker class
    - Implement getStatus() method (delegates to IntentManager.get())
    - Implement waitForStatus() with polling loop and timeout
    - Add configurable poll interval and timeout
    - Throw TimeoutError if timeout exceeded
    - _Requirements: 2.1, 2.5_
  
  - [x] 5.2 Implement ExecutionWatcher for continuous updates
    - Create ExecutionWatcher class with event emitter pattern
    - Implement watch() method that returns ExecutionWatcher
    - Implement onUpdate(), onError(), onComplete() callbacks
    - Implement stop() method to cancel polling
    - Poll at configured interval and emit events on changes
    - _Requirements: 2.2, 8.3_
  
  - [x] 5.3 Write unit tests for execution tracking
    - Test waitForStatus() returns when target reached
    - Test waitForStatus() throws TimeoutError on timeout
    - Test watch() emits updates on status changes
    - Test stop() cancels polling
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [x] 5.4 Write property test for polling convergence
    - **Property 3: Status Polling Convergence**
    - **Validates: Requirements 2.5**
    - Generate random intents, verify waitForStatus() either succeeds or throws timeout (never hangs)
    - _Requirements: 2.5_

- [~] 6. Cost tracking
  - [x] 6.1 Implement CostTracker class
    - Create src/costs.ts with CostTracker class
    - Implement getCosts() method (GET from /api/costs)
    - Implement getIssueCost() method (filter by issueId)
    - Implement getOverBudgetIssues() method (filter by overBudget flag)
    - Parse CostsResponse and return typed data
    - _Requirements: 4.1, 4.2_
  
  - [x] 6.2 Write unit tests for cost tracking
    - Test getCosts() parses response correctly
    - Test getIssueCost() filters by ID
    - Test getOverBudgetIssues() filters correctly
    - _Requirements: 4.1, 4.2_

- [~] 7. Agent utilities
  - [x] 7.1 Implement batch submission
    - Create src/agent.ts with AgentUtils class
    - Implement batchSubmit() method using Promise.allSettled()
    - Return BatchSubmitResult[] with success/error for each intent
    - Ensure result array length matches input array length
    - _Requirements: 8.1, 8.2_
  
  - [x] 7.2 Implement dry-run and policy validation
    - Implement dryRun() method (validates without submitting)
    - Implement validatePolicy() helper (checks params against policy rules)
    - Return DryRunResult with validation status and errors
    - _Requirements: 8.4, 8.5_
  
  - [x] 7.3 Implement multi-intent subscription
    - Implement subscribeToUpdates() method
    - Poll multiple intents in parallel
    - Invoke callback when any intent status changes
    - Return Subscription object with unsubscribe() method
    - _Requirements: 8.3_
  
  - [x] 7.4 Write unit tests for agent utilities
    - Test batchSubmit() handles mixed success/failure
    - Test dryRun() validates without API calls
    - Test subscribeToUpdates() invokes callbacks
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  
  - [x] 7.5 Write property test for batch result correspondence
    - **Property 6: Batch Submission Atomicity**
    - **Validates: Requirements 8.2**
    - Generate random batch inputs, verify result array length matches input length
    - _Requirements: 8.2_

- [~] 8. Main SDK class and exports
  - [x] 8.1 Implement JACK_SDK main class
    - Create src/index.ts with JACK_SDK class
    - Initialize all managers (intents, execution, costs, agent) in constructor
    - Expose managers as public readonly properties
    - Add convenience methods (submitIntent, getIntent, listIntents, waitForSettlement)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.5_
  
  - [x] 8.2 Export all public APIs
    - Export JACK_SDK class as default and named export
    - Re-export all types from src/types.ts
    - Re-export all error classes from src/errors.ts
    - Export test utilities (MockJackSDK, createMockIntent, createMockQuote)
    - _Requirements: 5.1, 9.5_
  
  - [x] 8.3 Write integration tests with mock API
    - Set up msw (Mock Service Worker) for API mocking
    - Test complete flow: submit → poll → settle
    - Test error scenarios (404, 500, network failures)
    - Test retry behavior with flaky responses
    - Test cache behavior with repeated requests
    - _Requirements: 9.3_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 10. Property-based tests for error handling and types
  - [x] 10.1 Write property test for error type discrimination
    - **Property 8: Error Type Discrimination**
    - **Validates: Requirements 5.3**
    - Generate random error responses, verify correct error class thrown (APIError vs NetworkError)
    - _Requirements: 5.3_
  
  - [x] 10.2 Write property test for type safety
    - **Property 9: Type Safety Round-Trip**
    - **Validates: Requirements 5.1**
    - Generate random Intent objects, verify all fields match TypeScript interface
    - _Requirements: 5.1, 14.5_

- [~] 11. Documentation
  - [x] 11.1 Write comprehensive README
    - Add installation instructions (npm/pnpm)
    - Add quick start example (create and track intent)
    - Add configuration section (all ClientConfig options)
    - Add error handling examples
    - Add advanced usage (batch, caching, retries)
    - Add TypeScript usage examples
    - Add links to API reference
    - _Requirements: 10.4, 12.1, 12.2_
  
  - [x] 11.2 Add JSDoc comments to all public APIs
    - Document all classes, methods, interfaces with JSDoc
    - Include parameter descriptions and return types
    - Add usage examples in doc comments
    - Document error conditions (@throws tags)
    - _Requirements: 12.3_
  
  - [x] 11.3 Create integration guide
    - Document dashboard integration patterns
    - Document agent integration patterns
    - Provide code examples for both use cases
    - _Requirements: 12.4_

- [~] 12. NPM package finalization
  - [x] 12.1 Verify package.json configuration
    - Verify name, version, description are correct
    - Verify main, module, types, exports fields point to correct paths
    - Verify files array includes only dist/ and README
    - Verify keywords, author, license, repository fields
    - _Requirements: 10.1, 10.5_
  
  - [x] 12.2 Test build outputs
    - Run build scripts and verify dist/esm/, dist/cjs/, dist/types/ are created
    - Verify .d.ts files are generated for all modules
    - Test importing from both ESM and CommonJS contexts
    - _Requirements: 10.2, 10.3, 5.5_
  
  - [x] 12.3 Create test utilities for consumers
    - Implement MockJackSDK class that extends JACK_SDK
    - Implement createMockIntent() helper
    - Implement createMockQuote() helper
    - Export from src/index.ts
    - _Requirements: 9.5_

- [x] 13. GitHub Actions release workflow
  - [x] 13.1 Create release workflow file
    - Create .github/workflows/publish-sdk.yml
    - Configure trigger on tags matching sdk-v*.*.*
    - Add steps: checkout, setup pnpm, setup node with npm registry
    - Add steps: install dependencies, build SDK, run tests
    - Add step: publish to npm with NODE_AUTH_TOKEN
    - Add step: create GitHub release
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 13.2 Document release process
    - Add RELEASING.md with step-by-step instructions
    - Document version bumping process
    - Document tag creation and pushing
    - Document NPM_TOKEN secret setup
    - _Requirements: 11.1, 11.2_
  
  - [x] 13.3 Update package.json organization name
    - Updated package name from @jack/sdk to @jack-kernel/sdk
    - Verified build succeeds with new name
    - All 338 tests passing
    - _Requirements: 10.1, 10.5_
  
  - [x] 13.4 Create and push git tag
    - Created git tag sdk-v1.0.0
    - Pushed tag to GitHub to trigger workflow
    - Workflow will publish to npm under @jack-kernel organization
    - _Requirements: 11.1, 11.2, 11.3_

- [~] 14. Final checkpoint and validation
  - [x] 14.1 Run full test suite with coverage
    - Run `pnpm test:coverage` and verify >80% coverage
    - Fix any failing tests
    - _Requirements: 9.1_
  
  - [x] 14.2 Test local npm pack and install
    - Run `npm pack` to create tarball
    - Install tarball in a test project
    - Verify imports work from both ESM and CommonJS
    - Verify TypeScript types are available
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 14.3 Update dashboard to use new SDK
    - Update dashboard imports to use new SDK structure
    - Test that existing functionality still works
    - Verify backward compatibility
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tests are required for comprehensive quality assurance
- Property-based tests use fast-check with minimum 100 iterations
- Each property test is tagged with feature name and property number
- Integration tests use msw for API mocking
- Build process generates dual outputs (ESM + CommonJS) for maximum compatibility
- GitHub Actions workflow requires NPM_TOKEN secret for publishing
- All public APIs include JSDoc comments for documentation generation
