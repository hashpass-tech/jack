/**
 * LifiProvider — main entry point for all LI.FI operations.
 *
 * Handles initialization, parameter validation, SDK delegation,
 * response normalization, retry logic, and fallback.
 *
 * @module
 */

import { createConfig, getQuote, getRoutes, getStatus } from '@lifi/sdk';
import type { IntentParams } from '../types.js';
import type {
  LifiFallback,
  LifiQuotePayload,
  LifiRoutePayload,
  LifiStatusPayload,
  LifiReasonCode,
} from './types.js';
import {
  buildFallbackQuote,
  buildFallbackRoute,
  buildFallbackStatus,
  deterministicId,
} from './fallback.js';
import { resolveChain } from './chain-map.js';
import { resolveToken } from './token-map.js';
import { toBaseUnits, fromBaseUnits } from './utils.js';

/**
 * Configuration options for the LI.FI SDK integration.
 */
export interface LifiConfig {
  /** LI.FI integrator identifier (max 23 chars). Default: "jackkernel" */
  integrator?: string;
  /** Optional API key for higher rate limits */
  apiKey?: string;
  /** LI.FI API base URL. Default: "https://li.quest/v1" */
  apiUrl?: string;
  /** Custom RPC URLs per chain ID */
  rpcUrls?: Record<number, string[]>;
  /** Supported chain IDs. Default: [42161, 10, 8453, 137] */
  chains?: number[];
  /** Request timeout in ms. Default: 30000 */
  timeout?: number;
  /** Max retry attempts for retryable errors. Default: 3 */
  maxRetries?: number;
  /** Initial retry delay in ms. Default: 1000 */
  retryDelay?: number;
}

/** Default configuration values. */
const DEFAULTS = {
  integrator: 'jackkernel',
  apiUrl: 'https://li.quest/v1',
  chains: [42161, 10, 8453, 137],
  timeout: 30_000,
  maxRetries: 3,
  retryDelay: 1_000,
} as const;

/** Internal resolved configuration with all defaults applied. */
interface ResolvedConfig {
  integrator: string;
  apiKey?: string;
  apiUrl: string;
  rpcUrls: Record<number, string[]>;
  chains: number[];
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * LifiProvider wraps the `@lifi/sdk` to provide quote fetching, route
 * discovery, status tracking, and execution capabilities for the JACK SDK.
 *
 * The constructor calls `createConfig` from `@lifi/sdk` with the integrator
 * string "jackkernel" and any user-supplied configuration. Each public method
 * validates input, delegates to the SDK with retry logic, normalizes the
 * response, and falls back to the FallbackProvider on any error.
 */
export class LifiProvider {
  private readonly config: ResolvedConfig;

  /**
   * Create a new LifiProvider.
   *
   * @param userConfig - Optional configuration overrides
   * @throws If `createConfig` from `@lifi/sdk` fails
   */
  constructor(userConfig?: LifiConfig) {
    this.config = {
      integrator: userConfig?.integrator ?? DEFAULTS.integrator,
      apiKey: userConfig?.apiKey,
      apiUrl: userConfig?.apiUrl ?? DEFAULTS.apiUrl,
      rpcUrls: userConfig?.rpcUrls ?? {},
      chains: userConfig?.chains ?? [...DEFAULTS.chains],
      timeout: userConfig?.timeout ?? DEFAULTS.timeout,
      maxRetries: userConfig?.maxRetries ?? DEFAULTS.maxRetries,
      retryDelay: userConfig?.retryDelay ?? DEFAULTS.retryDelay,
    };

    try {
      createConfig({
        integrator: this.config.integrator,
        ...(this.config.apiKey ? { apiKey: this.config.apiKey } : {}),
        ...(Object.keys(this.config.rpcUrls).length > 0
          ? { rpcUrls: this.config.rpcUrls }
          : {}),
        chains: this.config.chains.map((id) => ({ id, name: String(id), network: String(id) })) as never,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `LifiProvider: failed to initialize LI.FI SDK — ${message}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Public API (stubs — implemented in tasks 5.2, 5.3, 5.4)
  // ---------------------------------------------------------------------------

  /**
   * Fetch a quote for the given intent parameters.
   *
   * Validates params, resolves chains/tokens, calls `getQuote` from `@lifi/sdk`
   * with retry, normalizes the response, and falls back on error.
   *
   * @param params - Intent parameters
   * @returns A normalized {@link LifiQuotePayload}
   */
  async fetchQuote(params: IntentParams): Promise<LifiQuotePayload> {
    // 1. Validate params
    const invalid = this.validateParams(params);
    if (invalid) {
      return buildFallbackQuote(params, invalid);
    }

    // 2. Resolve source chain
    const fromChainRes = resolveChain(params.sourceChain);
    if (!fromChainRes.ok) {
      return buildFallbackQuote(params, {
        enabled: true,
        reasonCode: 'UNSUPPORTED_CHAIN',
        message: fromChainRes.reason,
      });
    }
    const fromChainId = fromChainRes.chainId;

    // 3. Resolve destination chain
    const toChainRes = resolveChain(params.destinationChain);
    if (!toChainRes.ok) {
      return buildFallbackQuote(params, {
        enabled: true,
        reasonCode: 'UNSUPPORTED_CHAIN',
        message: toChainRes.reason,
      });
    }
    const toChainId = toChainRes.chainId;

    // 4. Resolve source token
    const fromTokenRes = resolveToken(fromChainId, params.tokenIn);
    if (!fromTokenRes.ok) {
      return buildFallbackQuote(params, {
        enabled: true,
        reasonCode: 'UNSUPPORTED_TOKEN',
        message: fromTokenRes.reason,
      });
    }
    const fromToken = fromTokenRes.token;

    // 5. Resolve destination token
    const toTokenRes = resolveToken(toChainId, params.tokenOut);
    if (!toTokenRes.ok) {
      return buildFallbackQuote(params, {
        enabled: true,
        reasonCode: 'UNSUPPORTED_TOKEN',
        message: toTokenRes.reason,
      });
    }
    const toToken = toTokenRes.token;

    // 6. Convert amountIn to base units
    const fromAmount = toBaseUnits(params.amountIn, fromToken.decimals);

    try {
      // 7. Call getQuote from @lifi/sdk with retry
      const data = await this.executeWithRetry(() =>
        getQuote({
          fromChain: fromChainId,
          toChain: toChainId,
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount: fromAmount,
          fromAddress: '0x0000000000000000000000000000000000000000',
        }),
      );

      // 8. If data is empty/null, return fallback
      if (!data) {
        return buildFallbackQuote(params, {
          enabled: true,
          reasonCode: 'LIFI_EMPTY_RESPONSE',
          message: 'LI.FI returned an empty response',
        });
      }

      // 9. Normalize the response
      const amountOut = data.estimate?.toAmount
        ? fromBaseUnits(data.estimate.toAmount, toToken.decimals)
        : params.amountIn;

      const routeId = data.id ?? deterministicId(JSON.stringify(data));

      const estimatedGasUsd =
        data.estimate?.gasCosts?.[0]?.amountUSD ?? undefined;

      return {
        provider: 'lifi',
        routeId,
        timestamp: Date.now(),
        quote: {
          amountIn: params.amountIn,
          amountOut,
          minAmountOut: params.minAmountOut,
          fromChainId,
          toChainId,
          fromToken: params.tokenIn,
          toToken: params.tokenOut,
          estimatedGasUsd,
        },
        raw: data,
      };
    } catch (error: unknown) {
      // 10. Catch errors and return fallback with mapped reason code
      const reasonCode = this.mapErrorToReasonCode(error);
      const message =
        error instanceof Error ? error.message : 'LI.FI quote request failed';
      return buildFallbackQuote(params, {
        enabled: true,
        reasonCode,
        message,
      });
    }
  }

  /**
   * Fetch the best route for the given intent parameters.
   *
   * Validates params, resolves chains/tokens, calls `getRoutes` from `@lifi/sdk`
   * with retry, selects the best route by output amount, normalizes, and falls
   * back on error.
   *
   * @param params - Intent parameters
   * @returns A normalized {@link LifiRoutePayload}
   */
  async fetchRoute(params: IntentParams): Promise<LifiRoutePayload> {
    // 1. Validate params
    const invalid = this.validateParams(params);
    if (invalid) {
      return buildFallbackRoute(params, invalid);
    }

    // 2. Resolve source chain
    const fromChainRes = resolveChain(params.sourceChain);
    if (!fromChainRes.ok) {
      return buildFallbackRoute(params, {
        enabled: true,
        reasonCode: 'UNSUPPORTED_CHAIN',
        message: fromChainRes.reason,
      });
    }
    const fromChainId = fromChainRes.chainId;

    // 3. Resolve destination chain
    const toChainRes = resolveChain(params.destinationChain);
    if (!toChainRes.ok) {
      return buildFallbackRoute(params, {
        enabled: true,
        reasonCode: 'UNSUPPORTED_CHAIN',
        message: toChainRes.reason,
      });
    }
    const toChainId = toChainRes.chainId;

    // 4. Resolve source token
    const fromTokenRes = resolveToken(fromChainId, params.tokenIn);
    if (!fromTokenRes.ok) {
      return buildFallbackRoute(params, {
        enabled: true,
        reasonCode: 'UNSUPPORTED_TOKEN',
        message: fromTokenRes.reason,
      });
    }
    const fromToken = fromTokenRes.token;

    // 5. Resolve destination token
    const toTokenRes = resolveToken(toChainId, params.tokenOut);
    if (!toTokenRes.ok) {
      return buildFallbackRoute(params, {
        enabled: true,
        reasonCode: 'UNSUPPORTED_TOKEN',
        message: toTokenRes.reason,
      });
    }
    const toToken = toTokenRes.token;

    // 6. Convert amountIn to base units
    const fromAmount = toBaseUnits(params.amountIn, fromToken.decimals);

    try {
      // 7. Call getRoutes from @lifi/sdk with retry
      const data = await this.executeWithRetry(() =>
        getRoutes({
          fromChainId,
          toChainId,
          fromTokenAddress: fromToken.address,
          toTokenAddress: toToken.address,
          fromAmount: fromAmount,
        }),
      ) as unknown as { routes?: Array<Record<string, unknown>> };

      // 8. If no routes returned, return fallback
      if (!data.routes || data.routes.length === 0) {
        return buildFallbackRoute(params, {
          enabled: true,
          reasonCode: 'LIFI_EMPTY_RESPONSE',
          message: 'LI.FI returned no routes',
        });
      }

      // 9. Select the best route by highest toAmount
      const bestRoute = data.routes.reduce(
        (best: Record<string, unknown>, route: Record<string, unknown>) =>
          BigInt((route.toAmount as string) ?? '0') > BigInt((best.toAmount as string) ?? '0')
            ? route
            : best,
      );

      // 10. Compute estimated duration as sum of step durations
      const steps = bestRoute.steps as Array<Record<string, unknown>> | undefined;
      const estimatedDuration = Array.isArray(steps)
        ? steps.reduce(
            (sum: number, step: Record<string, unknown>) => {
              const estimate = step.estimate as Record<string, unknown> | undefined;
              if (typeof estimate === 'object' && estimate !== null) {
                return sum + Number(estimate.executionDuration ?? 0);
              }
              return sum;
            },
            0,
          )
        : undefined;

      // 11. Normalize the response into a LifiRoutePayload
      const routeId =
        bestRoute.id != null
          ? String(bestRoute.id)
          : deterministicId(JSON.stringify(bestRoute));

      return {
        provider: 'lifi',
        routeId,
        timestamp: Date.now(),
        route: {
          fromChainId,
          toChainId,
          fromToken: params.tokenIn,
          toToken: params.tokenOut,
          steps: steps as unknown[],
          tags: bestRoute.tags as string[] | undefined,
          estimatedDuration,
        },
        raw: bestRoute,
      };
    } catch (error: unknown) {
      // 12. Catch errors and return fallback with mapped reason code
      const reasonCode = this.mapErrorToReasonCode(error);
      const message =
        error instanceof Error ? error.message : 'LI.FI route request failed';
      return buildFallbackRoute(params, {
        enabled: true,
        reasonCode,
        message,
      });
    }
  }

  /**
   * Check the status of a LI.FI transaction.
   *
   * 1. Checks for missing txHash — returns fallback with 'MISSING_TX_HASH'
   * 2. Calls `getStatus` from `@lifi/sdk` with retry
   * 3. If data is empty/null, returns fallback with 'LIFI_EMPTY_RESPONSE'
   * 4. Normalizes the response into a LifiStatusPayload
   * 5. Catches errors and returns fallback with mapped reason code
   *
   * @param txHash - Transaction hash to query
   * @returns A normalized {@link LifiStatusPayload}
   */
  async fetchStatus(txHash?: string): Promise<LifiStatusPayload> {
    // 1. Check for missing txHash
    if (!txHash) {
      return buildFallbackStatus(txHash, {
        enabled: true,
        reasonCode: 'MISSING_TX_HASH',
        message: 'Transaction hash is required',
      });
    }

    try {
      // 2. Call getStatus from @lifi/sdk with retry
      const data = await this.executeWithRetry(() =>
        getStatus({ txHash } as never),
      );

      // 3. If data is empty/null, return fallback
      if (!data) {
        return buildFallbackStatus(txHash, {
          enabled: true,
          reasonCode: 'LIFI_EMPTY_RESPONSE',
          message: 'LI.FI returned an empty status response',
        });
      }

      // 4. Normalize the response into a LifiStatusPayload
      const statusData = data as unknown as Record<string, unknown>;
      return {
        provider: 'lifi',
        timestamp: Date.now(),
        status: {
          state: (statusData.status as string) ?? 'UNKNOWN',
          substatus: statusData.substatus as string | undefined,
          txHash,
        },
        raw: data,
      };
    } catch (error: unknown) {
      // 5. Catch errors and return fallback with mapped reason code
      const reasonCode = this.mapErrorToReasonCode(error);
      const message =
        error instanceof Error
          ? error.message
          : 'LI.FI status request failed';
      return buildFallbackStatus(txHash, {
        enabled: true,
        reasonCode,
        message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Execute a function with exponential backoff retry logic.
   *
   * Retries on rate-limit (429) and server errors (5xx). Non-retryable errors
   * are re-thrown immediately.
   *
   * @param fn - Async function to execute
   * @returns The result of `fn`
   * @throws The last error if all retries are exhausted
   */
  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let delay = this.config.retryDelay;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        if (!this.isRetryable(error) || attempt === this.config.maxRetries) {
          throw error;
        }
        await this.sleep(delay);
        delay *= 2; // exponential backoff
      }
    }

    // Unreachable in practice, but satisfies the compiler
    throw new Error('Retry exhausted');
  }

  /**
   * Determine whether an error is retryable.
   *
   * Retryable errors:
   * - HTTP 429 (rate limited)
   * - HTTP 5xx (server errors)
   * - Network errors (TypeError, or message containing 'network' / 'fetch')
   *
   * @param error - The caught error
   * @returns `true` if the request should be retried
   */
  private isRetryable(error: unknown): boolean {
    // Check for HTTP status codes on the error object
    if (error !== null && typeof error === 'object') {
      const statusCode =
        (error as Record<string, unknown>)['status'] ??
        (error as Record<string, unknown>)['statusCode'];

      if (typeof statusCode === 'number') {
        if (statusCode === 429) return true;
        if (statusCode >= 500) return true;
        // Non-retryable client errors (4xx except 429)
        return false;
      }
    }

    // Network errors
    if (error instanceof TypeError) return true;

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('network') || msg.includes('fetch')) return true;
    }

    return false;
  }

  /**
   * Sleep for the given number of milliseconds.
   *
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate that all required IntentParams fields are present and valid.
   *
   * @param params - Intent parameters to validate
   * @returns A {@link LifiFallback} if validation fails, or `null` if valid
   */
  private validateParams(params: IntentParams): LifiFallback | null {
    const requiredFields: Array<keyof IntentParams> = [
      'sourceChain',
      'destinationChain',
      'tokenIn',
      'tokenOut',
      'amountIn',
    ];

    for (const field of requiredFields) {
      const value = params[field];
      if (value === undefined || value === null || value === '') {
        return {
          enabled: true,
          reasonCode: 'MISSING_PARAMS' as LifiReasonCode,
          message: `Missing required parameter: ${field}`,
        };
      }
    }

    // Validate amountIn is a valid positive number
    const amount = Number(params.amountIn);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        enabled: true,
        reasonCode: 'INVALID_AMOUNT' as LifiReasonCode,
        message: `Invalid amount: "${params.amountIn}" must be a positive number`,
      };
    }

    return null;
  }

  /**
   * Map an error to a LI.FI reason code based on HTTP status codes.
   *
   * - 400 or 422 → 'LIFI_BAD_REQUEST'
   * - 429 → 'LIFI_RATE_LIMITED'
   * - >= 500 → 'LIFI_SERVER_ERROR'
   * - Otherwise → 'LIFI_UNAVAILABLE'
   *
   * @param error - The caught error
   * @returns The appropriate {@link LifiReasonCode}
   */
  private mapErrorToReasonCode(error: unknown): LifiReasonCode {
    if (error !== null && typeof error === 'object') {
      const statusCode =
        (error as Record<string, unknown>)['status'] ??
        (error as Record<string, unknown>)['statusCode'];

      if (typeof statusCode === 'number') {
        if (statusCode === 400 || statusCode === 422) return 'LIFI_BAD_REQUEST';
        if (statusCode === 429) return 'LIFI_RATE_LIMITED';
        if (statusCode >= 500) return 'LIFI_SERVER_ERROR';
      }
    }

    return 'LIFI_UNAVAILABLE';
  }
}
