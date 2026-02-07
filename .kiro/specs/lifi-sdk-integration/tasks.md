# Implementation Plan: LI.FI SDK Integration

## Overview

First, apply the hardening changes from [PR #26](https://github.com/hashpass-tech/JACK/pull/26) and resolve all lint/type issues from [Issue #22](https://github.com/hashpass-tech/JACK/issues/22) in the dashboard. Then integrate the official `@lifi/sdk` into `packages/sdk` as a new `LifiProvider` module with chain/token resolution, fallback logic, retry handling, and dashboard migration. All new code lives under `packages/sdk/src/lifi/`. The implementation builds incrementally: hardening first, then types, pure utilities, provider, SDK wiring, and finally dashboard migration.

## Tasks

- [ ] 0. Apply PR #26 hardening and resolve issue #22 lint/type fixes
  - [ ] 0.1 Harden `apps/dashboard/src/app/api/intents/route.ts` with explicit types from PR #26
    - Replace `any` with explicit `IntentRecord`, `IntentStatus`, `ExecutionStepStatus`, `ExecutionStep` types
    - Fix `isProviderNotification` to use proper `unknown` type narrowing instead of `any`
    - Add `deriveFinalOutcome()` and `normalizeLifiState()` for provider-driven status resolution
    - Initialize `executionSteps` defensively with `?? []`
    - Replace `.substr()` with `.slice()` for intent ID generation
    - Import `LifiStatusPayload` type from `@/lib/lifi`
    - Cast `body` to `Record<string, unknown>` and cast individual fields to proper types
    - _References: [GitHub Issue #22](https://github.com/hashpass-tech/JACK/issues/22), [PR #26](https://github.com/hashpass-tech/JACK/pull/26)_
  - [ ] 0.2 Fix `apps/dashboard/src/lib/store.ts` lint/type issues
    - Replace `any` in `saveIntent` parameter with a proper type or `Record<string, unknown>`
    - Add return type annotations to `getIntents`, `saveIntent`, `getIntent`
    - _References: [GitHub Issue #22](https://github.com/hashpass-tech/JACK/issues/22)_
  - [ ] 0.3 Fix `apps/dashboard/src/components/providers.tsx` lint issues
    - Replace `{ children: any }` with `{ children: React.ReactNode }` in `Providers` component
    - _References: [GitHub Issue #22](https://github.com/hashpass-tech/JACK/issues/22)_
  - [ ] 0.4 Run `pnpm --filter dashboard lint` and `pnpm --filter dashboard build` to verify all fixes
    - _References: [GitHub Issue #22](https://github.com/hashpass-tech/JACK/issues/22)_

- [ ] 1. Install `@lifi/sdk` dependency and create LI.FI types
  - [ ] 1.1 Add `@lifi/sdk` as a runtime dependency in `packages/sdk/package.json` and run `pnpm install`
    - _Requirements: 1.1_
  - [ ] 1.2 Create `packages/sdk/src/lifi/types.ts` with `LifiProviderType`, `LifiReasonCode`, `LifiFallback`, `LifiQuotePayload`, `LifiRoutePayload`, `LifiStatusPayload` types
    - Define all type definitions as specified in the design document
    - _Requirements: 3.2, 4.2, 7.2_

- [ ] 2. Implement ChainMap and TokenMap pure modules
  - [ ] 2.1 Create `packages/sdk/src/lifi/chain-map.ts` with `resolveChain` and `getSupportedChains`
    - Implement case-insensitive lookup via `name.toLowerCase()`
    - Default mappings: arbitrum→42161, optimism→10, base→8453, polygon→137
    - Return `{ ok: true, chainId }` or `{ ok: false, reason }` discriminated union
    - _Requirements: 2.1, 2.2, 2.5_
  - [ ]* 2.2 Write property tests for ChainMap
    - **Property 1: Chain resolution is correct and case-insensitive**
    - **Property 2: Unsupported chain names produce error results**
    - **Validates: Requirements 2.1, 2.2, 2.5**
  - [ ] 2.3 Create `packages/sdk/src/lifi/token-map.ts` with `resolveToken` and `getSupportedTokens`
    - Implement case-insensitive lookup via `symbol.toUpperCase()`
    - Default mappings per chain for USDC, WETH, ETH with addresses and decimals from design
    - Return `{ ok: true, token }` or `{ ok: false, reason }` discriminated union
    - _Requirements: 2.3, 2.4, 2.6_
  - [ ]* 2.4 Write property tests for TokenMap
    - **Property 3: Token resolution is correct and case-insensitive**
    - **Property 4: Unsupported tokens produce error results**
    - **Validates: Requirements 2.3, 2.4, 2.6**

- [ ] 3. Implement unit conversion utilities and fallback provider
  - [ ] 3.1 Create `packages/sdk/src/lifi/utils.ts` with `toBaseUnits` and `fromBaseUnits`
    - Port the conversion logic from `apps/dashboard/src/lib/lifi.ts`
    - _Requirements: 3.3_
  - [ ]* 3.2 Write property test for base unit conversion round-trip
    - **Property 5: Base unit conversion round-trip**
    - **Validates: Requirements 3.3**
  - [ ] 3.3 Create `packages/sdk/src/lifi/fallback.ts` with `buildFallbackQuote`, `buildFallbackRoute`, `buildFallbackStatus`, and `deterministicId`
    - Port fallback logic and static rates from `apps/dashboard/src/lib/lifi.ts`
    - Ensure deterministic IDs use DJB2 hash producing `JK-LIFI-{hash}` format
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 3.4 Write property tests for fallback provider
    - **Property 10: Fallback payloads have correct structure and use static rates**
    - **Property 11: Deterministic ID is idempotent**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement LifiProvider core
  - [ ] 5.1 Create `packages/sdk/src/lifi/lifi-provider.ts` with `LifiConfig` interface and `LifiProvider` class
    - Constructor calls `createConfig` from `@lifi/sdk` with integrator "jackkernel" and config options
    - Implement private `executeWithRetry` method with exponential backoff for retryable errors (429, 5xx)
    - Implement private `validateParams` method that checks required IntentParams fields
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 6.1, 6.2, 6.3, 6.4_
  - [ ] 5.2 Implement `fetchQuote` method on LifiProvider
    - Validate params, resolve chains/tokens, call `getQuote` from `@lifi/sdk` with retry, normalize response, fallback on error
    - Convert amounts between base units and human-readable using utils
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 8.1, 8.2_
  - [ ] 5.3 Implement `fetchRoute` method on LifiProvider
    - Validate params, resolve chains/tokens, call `getRoutes` from `@lifi/sdk` with retry, select best route by output amount, normalize, fallback on error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 5.4 Implement `fetchStatus` method on LifiProvider
    - Check for missing txHash, call `getStatus` from `@lifi/sdk`, normalize response, fallback on error
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 5.5 Write property tests for LifiProvider normalization and validation
    - **Property 6: All quote responses conform to LifiQuotePayload shape**
    - **Property 7: Missing intent params produce fallback without SDK call**
    - **Property 8: Route normalization produces complete payloads**
    - **Property 9: Best route selection maximizes output**
    - **Property 13: Status normalization produces complete payloads**
    - **Property 14: Gas cost is a string when present**
    - **Validates: Requirements 3.2, 3.7, 3.8, 4.2, 4.3, 7.2, 8.1, 8.2**
  - [ ]* 5.6 Write property test for retry logic
    - **Property 12: Retry logic retries retryable errors and falls back on exhaustion**
    - **Validates: Requirements 6.1, 6.2**
  - [ ]* 5.7 Write unit tests for LifiProvider error scenarios
    - Test network errors, bad requests, rate limiting, empty responses, createConfig failure
    - Test non-retryable errors return immediately without retry
    - _Requirements: 1.5, 3.4, 3.5, 3.6, 4.4, 4.5, 6.3, 6.4, 7.3, 7.4_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Wire LifiProvider into JACK_SDK and add barrel exports
  - [ ] 7.1 Create `packages/sdk/src/lifi/index.ts` barrel export for the lifi submodule
    - Export LifiProvider, LifiConfig, all types, resolveChain, getSupportedChains, resolveToken, getSupportedTokens, toBaseUnits, fromBaseUnits
    - _Requirements: 1.6_
  - [ ] 7.2 Update `packages/sdk/src/index.ts` to re-export from `./lifi/index.js`
    - Add LifiProvider, LifiConfig, and all LI.FI types to the SDK barrel export
    - _Requirements: 1.6_
  - [ ] 7.3 Extend `JACK_SDK` class to accept optional `lifi` config and expose `LifiProvider` instance
    - Add `lifi?: LifiProvider` readonly property
    - Add `getLifiQuote` and `getLifiRoute` convenience methods
    - Only instantiate LifiProvider when `config.lifi` is provided
    - _Requirements: 1.6, 1.7_
  - [ ]* 7.4 Write unit tests for JACK_SDK LI.FI integration
    - Test SDK instantiation with and without lifi config
    - Test convenience methods delegate to LifiProvider
    - _Requirements: 1.6, 1.7_

- [ ] 8. Add serialization property tests
  - [ ]* 8.1 Write property tests for LI.FI payload serialization
    - **Property 15: LifiQuotePayload JSON round-trip**
    - **Property 16: LifiRoutePayload JSON round-trip**
    - **Validates: Requirements 10.3, 10.4**
  - [ ]* 8.2 Write unit test for invalid JSON deserialization
    - Test that parsing invalid JSON throws a descriptive error
    - _Requirements: 10.5_

- [ ] 9. Migrate dashboard to use SDK-level LifiProvider
  - [ ] 9.1 Refactor `apps/dashboard/src/lib/lifi.ts` to import from `@jack-kernel/sdk`
    - Replace raw REST calls with LifiProvider method calls
    - Preserve the same export function signatures (fetchLifiQuote, fetchLifiRoute, fetchLifiStatus)
    - Remove duplicated chain/token mappings, fallback logic, and utility functions
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `@lifi/sdk` functions are mocked in tests to avoid real API calls
- All new source files go under `packages/sdk/src/lifi/`
- All new test files go under `packages/sdk/tests/property/` and `packages/sdk/tests/unit/`
