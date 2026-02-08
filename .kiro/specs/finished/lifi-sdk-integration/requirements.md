# Requirements Document

## Introduction

This feature integrates the official LI.FI SDK (`@lifi/sdk`) into the JACK cross-chain execution kernel at the SDK level (`packages/sdk`). The integration replaces the existing raw REST API calls in the dashboard (`apps/dashboard/src/lib/lifi.ts`) with a reusable, SDK-level LI.FI provider that plugs into the JACK intent flow. This enables optimal cross-chain route discovery, quote fetching, and route execution through LI.FI's aggregated DEX and bridge network, while maintaining fallback resilience when LI.FI is unavailable.

This spec supersedes and unifies the earlier `lifi-integration` spec. LI.FI's Standard (free) tier is used via the official `@lifi/sdk` package with the integrator string "jackkernel".

## Glossary

- **JACK_SDK**: The main SDK class in `packages/sdk` that orchestrates intent management, execution tracking, cost tracking, and agent utilities.
- **LifiProvider**: A new module in `packages/sdk` that wraps the `@lifi/sdk` to provide quote fetching, route discovery, status tracking, and execution capabilities.
- **IntentManager**: The existing JACK SDK class responsible for creating, submitting, and querying intents.
- **ExecutionTracker**: The existing JACK SDK class responsible for polling intent status and waiting for execution completion.
- **CostTracker**: The existing JACK SDK class that queries execution costs and budgets.
- **LifiConfig**: Configuration object for initializing the LI.FI SDK with integrator string, API key, RPC URLs, supported chains, timeout, and retry settings.
- **LifiQuote**: A normalized quote object returned by the LifiProvider containing price, route steps, estimated gas, and execution time.
- **LifiRoute**: A normalized route object containing ordered execution steps (swaps, bridges) for fulfilling a cross-chain intent.
- **FallbackProvider**: Logic that produces estimated quotes using static rates when the LI.FI SDK is unavailable or returns errors.
- **ChainMap**: A mapping from human-readable chain names (e.g., "arbitrum") to numeric chain IDs (e.g., 42161).
- **TokenMap**: A mapping from chain IDs and token symbols to on-chain token addresses and decimal precision.
- **RouteStep**: A single step within a multi-step route (e.g., swap on Uniswap, bridge via Stargate).

## Requirements

### Requirement 1: LI.FI SDK Configuration and Initialization

**User Story:** As a developer using the JACK SDK, I want to configure and initialize the LI.FI SDK with the correct integrator string and chain settings, so that all LI.FI operations use consistent configuration.

#### Acceptance Criteria

1. WHEN the LifiProvider is instantiated with a LifiConfig, THE LifiProvider SHALL call `createConfig` from `@lifi/sdk` with the integrator string "jackkernel"
2. WHEN no API key is provided in LifiConfig, THE LifiProvider SHALL initialize the LI.FI SDK without an API key (free Standard plan)
3. WHEN custom RPC URLs are provided in LifiConfig, THE LifiProvider SHALL pass them to the LI.FI SDK configuration
4. WHEN the LifiProvider is instantiated, THE LifiProvider SHALL support at minimum chains Arbitrum (42161), Optimism (10), Base (8453), and Polygon (137)
5. IF the LI.FI SDK `createConfig` call fails, THEN THE LifiProvider SHALL throw a descriptive error including the failure reason
6. WHEN the JACK_SDK is initialized with a LifiConfig, THE JACK_SDK SHALL create a LifiProvider instance and expose it as a public readonly property
7. WHEN the JACK_SDK is initialized without a LifiConfig, THE JACK_SDK SHALL not create a LifiProvider instance
8. THE LifiConfig SHALL accept optional fields for API base URL, API key, RPC URLs, supported chains, request timeout, maximum retries, and retry delay

### Requirement 2: Chain and Token Resolution

**User Story:** As a developer using the JACK SDK, I want chain names and token symbols resolved to their numeric IDs and on-chain addresses, so that I can use human-readable identifiers in intent parameters.

#### Acceptance Criteria

1. WHEN a valid chain name is provided (e.g., "arbitrum"), THE ChainMap SHALL resolve it to the correct numeric chain ID (e.g., 42161)
2. WHEN an unsupported chain name is provided, THE ChainMap SHALL return an error result indicating the chain is not supported
3. WHEN a valid token symbol and chain ID are provided, THE TokenMap SHALL resolve to the correct on-chain address and decimal count
4. WHEN an unsupported token symbol is provided for a given chain, THE TokenMap SHALL return an error result indicating the token is not supported on that chain
5. THE ChainMap SHALL perform case-insensitive lookups for chain names
6. THE TokenMap SHALL perform case-insensitive lookups for token symbols

### Requirement 3: Quote Fetching via LI.FI SDK

**User Story:** As a developer using the JACK SDK, I want to fetch cross-chain swap and bridge quotes through the LI.FI SDK, so that I can present optimal pricing to users before executing intents.

#### Acceptance Criteria

1. WHEN valid IntentParams are provided, THE LifiProvider SHALL call the LI.FI SDK `getQuote` function with resolved chain IDs, token addresses, and amounts in base units
2. WHEN the LI.FI SDK returns a quote, THE LifiProvider SHALL normalize the response into a LifiQuote object containing amountIn, amountOut, estimatedGas, fromChainId, toChainId, fromToken, and toToken
3. WHEN the LI.FI SDK returns a quote with an estimated output amount, THE LifiProvider SHALL convert the amount from base units to human-readable format using the correct token decimals
4. IF the LI.FI SDK quote request fails due to a network error, THEN THE LifiProvider SHALL return a fallback quote with a reason code of "LIFI_UNAVAILABLE"
5. IF the LI.FI SDK quote request fails due to a bad request (invalid parameters), THEN THE LifiProvider SHALL return a fallback quote with a reason code of "LIFI_BAD_REQUEST"
6. IF the LI.FI SDK quote request fails due to rate limiting, THEN THE LifiProvider SHALL return a fallback quote with a reason code of "LIFI_RATE_LIMITED"
7. WHEN IntentParams are missing required fields (sourceChain, destinationChain, tokenIn, tokenOut, or amountIn), THE LifiProvider SHALL return a fallback quote with a reason code of "MISSING_PARAMS" without calling the LI.FI SDK
8. THE LifiProvider SHALL normalize all LI.FI SDK responses into the LifiQuote format regardless of whether the response came from LI.FI or the fallback path

### Requirement 4: Route Discovery via LI.FI SDK

**User Story:** As a developer using the JACK SDK, I want to discover optimal cross-chain routes through the LI.FI SDK, so that intents are fulfilled using the best available DEX aggregators and bridges.

#### Acceptance Criteria

1. WHEN valid IntentParams are provided, THE LifiProvider SHALL call the LI.FI SDK `getRoutes` function with resolved chain IDs, token addresses, and amounts
2. WHEN the LI.FI SDK returns routes, THE LifiProvider SHALL normalize the best route into a LifiRoute object containing fromChainId, toChainId, fromToken, toToken, steps, tags, and estimatedDuration
3. WHEN multiple routes are returned, THE LifiProvider SHALL select the route with the best output amount as the primary route
4. IF the LI.FI SDK route request fails, THEN THE LifiProvider SHALL return a fallback route with the appropriate reason code
5. IF the LI.FI SDK returns zero routes, THEN THE LifiProvider SHALL return a fallback route with a reason code of "LIFI_EMPTY_RESPONSE"

### Requirement 5: Fallback Quote and Route Generation

**User Story:** As a developer using the JACK SDK, I want fallback quotes and routes when LI.FI is unavailable, so that the system remains functional with estimated pricing.

#### Acceptance Criteria

1. WHEN a fallback quote is generated, THE FallbackProvider SHALL use static exchange rates to estimate the output amount
2. WHEN a fallback quote is generated, THE FallbackProvider SHALL include a `fallback` field with `enabled: true`, the reason code, and a human-readable message
3. WHEN a fallback quote is generated, THE FallbackProvider SHALL set the provider field to "fallback" instead of "lifi"
4. THE FallbackProvider SHALL generate deterministic route IDs from the intent parameters so that identical parameters produce identical IDs
5. WHEN a fallback route is generated, THE FallbackProvider SHALL include the same fallback metadata as fallback quotes

### Requirement 6: Error Handling and Retry Logic

**User Story:** As a developer using the JACK SDK, I want robust error handling for LI.FI SDK calls, so that transient failures do not break the user experience.

#### Acceptance Criteria

1. WHEN the LI.FI SDK call fails with a retryable error (rate limit or server error), THE LifiProvider SHALL retry the request with exponential backoff up to a configurable maximum number of retries
2. WHEN all retry attempts are exhausted, THE LifiProvider SHALL return a fallback payload with a reason code indicating the original failure
3. WHEN the LI.FI SDK call fails with a non-retryable client error, THE LifiProvider SHALL return a fallback payload immediately without retrying
4. IF a network error occurs during a LI.FI SDK call, THEN THE LifiProvider SHALL catch the error and return a fallback payload with reason code "LIFI_UNAVAILABLE"

### Requirement 7: LI.FI Transaction Status Tracking

**User Story:** As a developer using the JACK SDK, I want to check the status of LI.FI transactions by hash, so that I can monitor cross-chain execution progress.

#### Acceptance Criteria

1. WHEN a valid transaction hash is provided, THE LifiProvider SHALL call the LI.FI SDK `getStatus` function and return the transaction state
2. WHEN the LI.FI SDK returns a status, THE LifiProvider SHALL normalize it into a status object containing state, substatus, and txHash
3. IF no transaction hash is provided, THEN THE LifiProvider SHALL return a fallback status with reason code "MISSING_TX_HASH"
4. IF the LI.FI SDK status request fails, THEN THE LifiProvider SHALL return a fallback status with the appropriate reason code

### Requirement 8: Cost Tracking Integration

**User Story:** As a developer using the JACK SDK, I want LI.FI gas cost estimates included in cost tracking, so that I can budget and report on total execution costs.

#### Acceptance Criteria

1. WHEN a LifiQuote includes a gas cost estimate, THE LifiProvider SHALL expose the gas cost in a format compatible with the CostTracker module
2. THE LifiQuote SHALL include the estimated gas cost in USD as a string field

### Requirement 9: Dashboard Migration

**User Story:** As a dashboard developer, I want the dashboard to use the SDK-level LI.FI integration, so that quoting logic is centralized and consistent.

#### Acceptance Criteria

1. WHEN the dashboard needs a LI.FI quote, THE Dashboard SHALL import and call the LifiProvider from `@jack-kernel/sdk` instead of making direct REST calls
2. WHEN the dashboard needs a LI.FI route, THE Dashboard SHALL import and call the LifiProvider from `@jack-kernel/sdk` instead of making direct REST calls
3. WHEN the dashboard needs a LI.FI transaction status, THE Dashboard SHALL import and call the LifiProvider from `@jack-kernel/sdk` instead of making direct REST calls
4. THE Dashboard SHALL maintain the same external behavior (quote display, route display, status display) after migration

### Requirement 10: LI.FI Data Serialization

**User Story:** As a developer using the JACK SDK, I want LI.FI quotes and routes to be serializable to and from JSON, so that they can be cached, logged, and transmitted.

#### Acceptance Criteria

1. THE LifiProvider SHALL produce LifiQuote objects that are serializable to JSON using `JSON.stringify`
2. THE LifiProvider SHALL produce LifiRoute objects that are serializable to JSON using `JSON.stringify`
3. FOR ALL valid LifiQuote objects, serializing to JSON then parsing back SHALL produce an equivalent object (round-trip property)
4. FOR ALL valid LifiRoute objects, serializing to JSON then parsing back SHALL produce an equivalent object (round-trip property)
5. WHEN an invalid JSON string is provided to the deserializer, THE Serializer SHALL throw a descriptive error
