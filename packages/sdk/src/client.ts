import { NetworkError, APIError, ValidationError, TimeoutError, RetryError } from './errors.js';
import type { ClientConfig, RequestOptions } from './types.js';
import { Cache } from './cache.js';

/**
 * Core HTTP client for JACK API with retry logic, timeout handling, and caching
 */
export class JackClient {
  private readonly config: Required<ClientConfig>;
  private readonly cache: Cache;

  constructor(config: ClientConfig) {
    this.validateConfig(config);
    
    this.config = {
      baseUrl: config.baseUrl,
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      retryBackoff: config.retryBackoff ?? 2,
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 60000,
      headers: config.headers ?? {},
    };

    this.cache = new Cache(this.config.cacheTTL);
  }

  /**
   * Validate client configuration
   */
  private validateConfig(config: ClientConfig): void {
    const errors: string[] = [];

    if (!config.baseUrl || config.baseUrl.trim() === '') {
      errors.push('baseUrl is required and cannot be empty');
    }

    if (config.timeout !== undefined && config.timeout <= 0) {
      errors.push('timeout must be positive');
    }

    if (config.maxRetries !== undefined && config.maxRetries < 0) {
      errors.push('maxRetries cannot be negative');
    }

    if (config.retryDelay !== undefined && config.retryDelay < 0) {
      errors.push('retryDelay cannot be negative');
    }

    if (config.retryBackoff !== undefined && config.retryBackoff < 1) {
      errors.push('retryBackoff must be >= 1');
    }

    if (config.cacheTTL !== undefined && config.cacheTTL < 0) {
      errors.push('cacheTTL cannot be negative');
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid client configuration', errors);
    }
  }

  /**
   * Perform GET request with caching support
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const cacheKey = this.getCacheKey(path, options);
    
    // Check cache if enabled
    if (this.config.enableCache && !options?.skipCache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Execute request with retry
    const result = await this.executeWithRetry(() => 
      this.executeRequest<T>('GET', path, undefined, options)
    );

    // Cache successful GET responses
    if (this.config.enableCache && !options?.skipCache) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Perform POST request (never cached)
   */
  async post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.executeWithRetry(() => 
      this.executeRequest<T>('POST', path, body, options)
    );
  }

  /**
   * Clear cache entries matching pattern
   */
  clearCache(pattern?: string): void {
    this.cache.clear(pattern);
  }

  /**
   * Generate cache key from URL and options
   */
  private getCacheKey(path: string, options?: RequestOptions): string {
    const params = options?.params ? JSON.stringify(options.params) : '';
    return `${path}${params}`;
  }

  /**
   * Execute HTTP request with timeout
   */
  private async executeRequest<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const timeout = options?.timeout ?? this.config.timeout;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...options?.headers,
      };

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage: string;
        
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorJson.error || response.statusText;
        } catch {
          errorMessage = errorBody || response.statusText;
        }

        throw new APIError(
          errorMessage,
          response.status,
          errorBody
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(
            `Request timed out after ${timeout}ms`,
            timeout
          );
        }

        throw new NetworkError(
          `Network request failed: ${error.message}`,
          error
        );
      }

      throw new NetworkError('Unknown network error', new Error(String(error)));
    }
  }

  /**
   * Execute function with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.config.retryDelay;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors - throw immediately
        if (error instanceof APIError && !this.isRetryable(error)) {
          throw error;
        }

        if (error instanceof ValidationError) {
          throw error;
        }

        if (error instanceof TimeoutError) {
          throw error;
        }

        // Don't retry if we've exhausted attempts
        if (attempt === this.config.maxRetries) {
          // If maxRetries is 0, throw the original error, not RetryError
          if (this.config.maxRetries === 0) {
            throw error;
          }
          break;
        }

        // Wait before retrying
        await this.sleep(delay);
        delay *= this.config.retryBackoff;
      }
    }

    // All retries exhausted
    throw new RetryError(
      `Request failed after ${this.config.maxRetries + 1} attempts`,
      this.config.maxRetries + 1,
      lastError!
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: APIError): boolean {
    // Retry on 5xx server errors and 429 rate limit
    return error.statusCode >= 500 || error.statusCode === 429;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
