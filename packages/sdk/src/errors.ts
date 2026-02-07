/**
 * Error hierarchy for the JACK SDK
 * 
 * This module defines custom error classes for different failure scenarios.
 * All errors extend the base JackError class and include context for debugging.
 * Requirements: 5.2, 5.3
 */

/**
 * Base error class for all JACK SDK errors
 * 
 * Extends the native Error class and adds optional context for debugging.
 * All SDK-specific errors inherit from this class.
 * 
 * @example
 * ```typescript
 * throw new JackError('Something went wrong', { requestId: '123', timestamp: Date.now() });
 * ```
 * 
 * Requirement 5.2
 */
export class JackError extends Error {
  /**
   * Additional context information for debugging
   * Can include request details, timestamps, or any relevant metadata
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Creates a new JackError
   * 
   * @param message - Human-readable error message
   * @param context - Optional context object with debugging information
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'JackError';
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when network-level failures occur
 * 
 * This includes connection failures, DNS resolution errors, timeouts at the
 * network layer, and other transport-level issues. The original error is
 * preserved for detailed debugging.
 * 
 * @example
 * ```typescript
 * try {
 *   await fetch('https://api.jack.example');
 * } catch (err) {
 *   throw new NetworkError('Failed to connect to API', err as Error);
 * }
 * ```
 * 
 * Requirement 5.3
 */
export class NetworkError extends JackError {
  /**
   * The original error that caused the network failure
   * Preserved for detailed debugging and error analysis
   */
  public readonly originalError: Error;

  /**
   * Creates a new NetworkError
   * 
   * @param message - Human-readable error message
   * @param originalError - The underlying error that caused the network failure
   * @param context - Optional additional context
   */
  constructor(message: string, originalError: Error, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

/**
 * Error thrown when the API returns an error response
 * 
 * This includes 4xx client errors (bad request, not found, unauthorized) and
 * 5xx server errors (internal server error, service unavailable). The HTTP
 * status code and response body are included for debugging.
 * 
 * @example
 * ```typescript
 * if (response.status >= 400) {
 *   throw new APIError(
 *     'Intent not found',
 *     404,
 *     { error: 'Intent with ID JK-ABC123456 does not exist' }
 *   );
 * }
 * ```
 * 
 * Requirement 5.3
 */
export class APIError extends JackError {
  /**
   * HTTP status code from the API response
   * Used to distinguish between client errors (4xx) and server errors (5xx)
   */
  public readonly statusCode: number;

  /**
   * The parsed response body from the API
   * May contain error details, validation messages, or other diagnostic information
   */
  public readonly response?: unknown;

  /**
   * Creates a new APIError
   * 
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code from the response
   * @param response - Optional parsed response body
   * @param context - Optional additional context
   */
  constructor(
    message: string,
    statusCode: number,
    response?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, context);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
  }

  /**
   * Check if this is a client error (4xx status code)
   * @returns true if status code is in the 400-499 range
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if this is a server error (5xx status code)
   * @returns true if status code is in the 500-599 range
   */
  isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  /**
   * Check if this error is retryable
   * Server errors (5xx) are typically retryable, client errors (4xx) are not
   * @returns true if the error should be retried
   */
  isRetryable(): boolean {
    return this.isServerError();
  }
}

/**
 * Error thrown when client-side validation fails
 * 
 * This error is thrown before making any network requests when input parameters
 * fail validation checks. It includes an array of specific validation errors
 * to help developers identify and fix issues.
 * 
 * @example
 * ```typescript
 * const errors = [];
 * if (params.amountIn <= 0) errors.push('amountIn must be positive');
 * if (params.deadline < Date.now()) errors.push('deadline must be in the future');
 * if (errors.length > 0) {
 *   throw new ValidationError('Invalid intent parameters', errors);
 * }
 * ```
 * 
 * Requirement 5.3
 */
export class ValidationError extends JackError {
  /**
   * Array of specific validation error messages
   * Each message describes a single validation failure
   */
  public readonly errors: string[];

  /**
   * Creates a new ValidationError
   * 
   * @param message - Human-readable error message
   * @param errors - Array of specific validation error messages
   * @param context - Optional additional context
   */
  constructor(message: string, errors: string[], context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Error thrown when an operation exceeds its timeout
 * 
 * This includes request timeouts, polling timeouts, and any other time-bound
 * operations. The timeout duration is included for debugging.
 * 
 * @example
 * ```typescript
 * const timeout = 30000; // 30 seconds
 * const timeoutPromise = new Promise((_, reject) => {
 *   setTimeout(() => {
 *     reject(new TimeoutError('Request timed out', timeout));
 *   }, timeout);
 * });
 * await Promise.race([fetchPromise, timeoutPromise]);
 * ```
 * 
 * Requirement 5.3
 */
export class TimeoutError extends JackError {
  /**
   * The timeout duration in milliseconds
   * Indicates how long the operation was allowed to run before timing out
   */
  public readonly timeoutMs: number;

  /**
   * Creates a new TimeoutError
   * 
   * @param message - Human-readable error message
   * @param timeoutMs - The timeout duration in milliseconds
   * @param context - Optional additional context
   */
  constructor(message: string, timeoutMs: number, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when retry attempts are exhausted
 * 
 * This error is thrown after all retry attempts have failed. It includes the
 * number of attempts made and the final error that caused the failure.
 * 
 * @example
 * ```typescript
 * let lastError: Error;
 * for (let attempt = 1; attempt <= maxRetries; attempt++) {
 *   try {
 *     return await makeRequest();
 *   } catch (err) {
 *     lastError = err as Error;
 *     if (attempt === maxRetries) {
 *       throw new RetryError(
 *         'All retry attempts exhausted',
 *         attempt,
 *         lastError
 *       );
 *     }
 *     await delay(retryDelay * Math.pow(retryBackoff, attempt - 1));
 *   }
 * }
 * ```
 * 
 * Requirement 5.3
 */
export class RetryError extends JackError {
  /**
   * The number of retry attempts that were made
   * Includes the initial attempt plus all retries
   */
  public readonly attempts: number;

  /**
   * The final error that caused the retry loop to fail
   * This is the error from the last retry attempt
   */
  public readonly lastError: Error;

  /**
   * Creates a new RetryError
   * 
   * @param message - Human-readable error message
   * @param attempts - The number of attempts that were made
   * @param lastError - The final error from the last attempt
   * @param context - Optional additional context
   */
  constructor(
    message: string,
    attempts: number,
    lastError: Error,
    context?: Record<string, unknown>
  ) {
    super(message, context);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}
