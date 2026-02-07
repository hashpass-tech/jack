/**
 * Unit tests for error classes
 * 
 * These tests verify that all error classes are properly constructed,
 * include the correct context fields, and maintain proper inheritance.
 * 
 * Requirements: 5.2, 5.3
 */

import { describe, it, expect } from 'vitest';
import {
  JackError,
  NetworkError,
  APIError,
  ValidationError,
  TimeoutError,
  RetryError
} from '../../src/errors';

describe('JackError', () => {
  it('should create error with message', () => {
    const error = new JackError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(JackError);
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('JackError');
  });

  it('should create error with message and context', () => {
    const context = { requestId: '123', timestamp: Date.now() };
    const error = new JackError('Test error', context);
    
    expect(error.message).toBe('Test error');
    expect(error.context).toEqual(context);
    expect(error.context?.requestId).toBe('123');
  });

  it('should create error without context', () => {
    const error = new JackError('Test error');
    
    expect(error.context).toBeUndefined();
  });

  it('should have a stack trace', () => {
    const error = new JackError('Test error');
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('JackError');
  });

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new JackError('Test error');
    }).toThrow(JackError);
    
    expect(() => {
      throw new JackError('Test error');
    }).toThrow('Test error');
  });
});

describe('NetworkError', () => {
  it('should create error with message and original error', () => {
    const originalError = new Error('Connection refused');
    const error = new NetworkError('Failed to connect', originalError);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(JackError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe('Failed to connect');
    expect(error.name).toBe('NetworkError');
    expect(error.originalError).toBe(originalError);
  });

  it('should create error with context', () => {
    const originalError = new Error('DNS lookup failed');
    const context = { url: 'https://api.jack.example', attempt: 1 };
    const error = new NetworkError('Network failure', originalError, context);
    
    expect(error.originalError).toBe(originalError);
    expect(error.context).toEqual(context);
    expect(error.context?.url).toBe('https://api.jack.example');
  });

  it('should preserve original error message and stack', () => {
    const originalError = new Error('ECONNREFUSED');
    originalError.stack = 'Original stack trace';
    const error = new NetworkError('Failed to connect', originalError);
    
    expect(error.originalError.message).toBe('ECONNREFUSED');
    expect(error.originalError.stack).toBe('Original stack trace');
  });

  it('should be distinguishable from base JackError', () => {
    const originalError = new Error('Network error');
    const error = new NetworkError('Failed', originalError);
    
    expect(error instanceof NetworkError).toBe(true);
    expect(error instanceof JackError).toBe(true);
    expect(error.name).toBe('NetworkError');
  });
});

describe('APIError', () => {
  it('should create error with message and status code', () => {
    const error = new APIError('Not found', 404);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(JackError);
    expect(error).toBeInstanceOf(APIError);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('APIError');
    expect(error.statusCode).toBe(404);
  });

  it('should create error with response body', () => {
    const response = { error: 'Intent not found', code: 'INTENT_NOT_FOUND' };
    const error = new APIError('Not found', 404, response);
    
    expect(error.statusCode).toBe(404);
    expect(error.response).toEqual(response);
  });

  it('should create error with context', () => {
    const context = { intentId: 'JK-ABC123456', endpoint: '/api/intents' };
    const error = new APIError('Not found', 404, undefined, context);
    
    expect(error.context).toEqual(context);
    expect(error.context?.intentId).toBe('JK-ABC123456');
  });

  it('should identify client errors (4xx)', () => {
    const error400 = new APIError('Bad request', 400);
    const error404 = new APIError('Not found', 404);
    const error422 = new APIError('Unprocessable entity', 422);
    
    expect(error400.isClientError()).toBe(true);
    expect(error404.isClientError()).toBe(true);
    expect(error422.isClientError()).toBe(true);
    
    expect(error400.isServerError()).toBe(false);
    expect(error404.isServerError()).toBe(false);
    expect(error422.isServerError()).toBe(false);
  });

  it('should identify server errors (5xx)', () => {
    const error500 = new APIError('Internal server error', 500);
    const error502 = new APIError('Bad gateway', 502);
    const error503 = new APIError('Service unavailable', 503);
    
    expect(error500.isServerError()).toBe(true);
    expect(error502.isServerError()).toBe(true);
    expect(error503.isServerError()).toBe(true);
    
    expect(error500.isClientError()).toBe(false);
    expect(error502.isClientError()).toBe(false);
    expect(error503.isClientError()).toBe(false);
  });

  it('should identify retryable errors', () => {
    const error404 = new APIError('Not found', 404);
    const error500 = new APIError('Internal server error', 500);
    const error503 = new APIError('Service unavailable', 503);
    
    // Client errors (4xx) are not retryable
    expect(error404.isRetryable()).toBe(false);
    
    // Server errors (5xx) are retryable
    expect(error500.isRetryable()).toBe(true);
    expect(error503.isRetryable()).toBe(true);
  });

  it('should handle various status codes correctly', () => {
    const testCases = [
      { code: 200, isClient: false, isServer: false, isRetryable: false },
      { code: 400, isClient: true, isServer: false, isRetryable: false },
      { code: 401, isClient: true, isServer: false, isRetryable: false },
      { code: 403, isClient: true, isServer: false, isRetryable: false },
      { code: 404, isClient: true, isServer: false, isRetryable: false },
      { code: 429, isClient: true, isServer: false, isRetryable: false },
      { code: 500, isClient: false, isServer: true, isRetryable: true },
      { code: 502, isClient: false, isServer: true, isRetryable: true },
      { code: 503, isClient: false, isServer: true, isRetryable: true },
      { code: 504, isClient: false, isServer: true, isRetryable: true }
    ];

    testCases.forEach(({ code, isClient, isServer, isRetryable }) => {
      const error = new APIError(`Status ${code}`, code);
      expect(error.isClientError()).toBe(isClient);
      expect(error.isServerError()).toBe(isServer);
      expect(error.isRetryable()).toBe(isRetryable);
    });
  });
});

describe('ValidationError', () => {
  it('should create error with message and errors array', () => {
    const errors = ['Amount must be positive', 'Deadline must be in the future'];
    const error = new ValidationError('Invalid parameters', errors);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(JackError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Invalid parameters');
    expect(error.name).toBe('ValidationError');
    expect(error.errors).toEqual(errors);
  });

  it('should create error with empty errors array', () => {
    const error = new ValidationError('Validation failed', []);
    
    expect(error.errors).toEqual([]);
    expect(error.errors).toHaveLength(0);
  });

  it('should create error with single error', () => {
    const error = new ValidationError('Invalid amount', ['Amount must be positive']);
    
    expect(error.errors).toHaveLength(1);
    expect(error.errors[0]).toBe('Amount must be positive');
  });

  it('should create error with context', () => {
    const errors = ['Invalid field'];
    const context = { field: 'amountIn', value: '-100' };
    const error = new ValidationError('Validation failed', errors, context);
    
    expect(error.errors).toEqual(errors);
    expect(error.context).toEqual(context);
  });

  it('should preserve all error messages', () => {
    const errors = [
      'sourceChain is required',
      'destinationChain is required',
      'amountIn must be positive',
      'deadline must be in the future'
    ];
    const error = new ValidationError('Multiple validation errors', errors);
    
    expect(error.errors).toHaveLength(4);
    expect(error.errors).toEqual(errors);
  });
});

describe('TimeoutError', () => {
  it('should create error with message and timeout duration', () => {
    const error = new TimeoutError('Request timed out', 30000);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(JackError);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.message).toBe('Request timed out');
    expect(error.name).toBe('TimeoutError');
    expect(error.timeoutMs).toBe(30000);
  });

  it('should create error with context', () => {
    const context = { operation: 'polling', intentId: 'JK-ABC123456' };
    const error = new TimeoutError('Polling timed out', 60000, context);
    
    expect(error.timeoutMs).toBe(60000);
    expect(error.context).toEqual(context);
  });

  it('should handle various timeout durations', () => {
    const testCases = [1000, 5000, 30000, 60000, 120000];
    
    testCases.forEach(timeout => {
      const error = new TimeoutError(`Timeout after ${timeout}ms`, timeout);
      expect(error.timeoutMs).toBe(timeout);
    });
  });

  it('should be distinguishable from other error types', () => {
    const error = new TimeoutError('Timeout', 5000);
    
    expect(error instanceof TimeoutError).toBe(true);
    expect(error instanceof JackError).toBe(true);
    expect(error instanceof NetworkError).toBe(false);
    expect(error instanceof APIError).toBe(false);
  });
});

describe('RetryError', () => {
  it('should create error with message, attempts, and last error', () => {
    const lastError = new Error('Final attempt failed');
    const error = new RetryError('All retries exhausted', 3, lastError);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(JackError);
    expect(error).toBeInstanceOf(RetryError);
    expect(error.message).toBe('All retries exhausted');
    expect(error.name).toBe('RetryError');
    expect(error.attempts).toBe(3);
    expect(error.lastError).toBe(lastError);
  });

  it('should create error with context', () => {
    const lastError = new Error('Connection failed');
    const context = { url: 'https://api.jack.example', totalDelay: 7000 };
    const error = new RetryError('Retries failed', 3, lastError, context);
    
    expect(error.attempts).toBe(3);
    expect(error.lastError).toBe(lastError);
    expect(error.context).toEqual(context);
  });

  it('should preserve last error details', () => {
    const lastError = new APIError('Service unavailable', 503);
    const error = new RetryError('Failed after retries', 5, lastError);
    
    expect(error.lastError).toBe(lastError);
    expect(error.lastError).toBeInstanceOf(APIError);
    expect((error.lastError as APIError).statusCode).toBe(503);
  });

  it('should handle different attempt counts', () => {
    const lastError = new Error('Failed');
    const testCases = [1, 2, 3, 5, 10];
    
    testCases.forEach(attempts => {
      const error = new RetryError(`Failed after ${attempts} attempts`, attempts, lastError);
      expect(error.attempts).toBe(attempts);
    });
  });

  it('should work with different error types as last error', () => {
    const networkError = new NetworkError('Network failed', new Error('ECONNREFUSED'));
    const apiError = new APIError('Server error', 500);
    const timeoutError = new TimeoutError('Timeout', 30000);
    
    const retryError1 = new RetryError('Failed', 3, networkError);
    const retryError2 = new RetryError('Failed', 3, apiError);
    const retryError3 = new RetryError('Failed', 3, timeoutError);
    
    expect(retryError1.lastError).toBeInstanceOf(NetworkError);
    expect(retryError2.lastError).toBeInstanceOf(APIError);
    expect(retryError3.lastError).toBeInstanceOf(TimeoutError);
  });
});

describe('Error Inheritance Chain', () => {
  it('should maintain proper inheritance for all error types', () => {
    const jackError = new JackError('Base error');
    const networkError = new NetworkError('Network error', new Error('Original'));
    const apiError = new APIError('API error', 500);
    const validationError = new ValidationError('Validation error', []);
    const timeoutError = new TimeoutError('Timeout error', 5000);
    const retryError = new RetryError('Retry error', 3, new Error('Last'));
    
    // All should be instances of Error
    expect(jackError).toBeInstanceOf(Error);
    expect(networkError).toBeInstanceOf(Error);
    expect(apiError).toBeInstanceOf(Error);
    expect(validationError).toBeInstanceOf(Error);
    expect(timeoutError).toBeInstanceOf(Error);
    expect(retryError).toBeInstanceOf(Error);
    
    // All should be instances of JackError
    expect(jackError).toBeInstanceOf(JackError);
    expect(networkError).toBeInstanceOf(JackError);
    expect(apiError).toBeInstanceOf(JackError);
    expect(validationError).toBeInstanceOf(JackError);
    expect(timeoutError).toBeInstanceOf(JackError);
    expect(retryError).toBeInstanceOf(JackError);
    
    // Each should be instance of its own type
    expect(networkError).toBeInstanceOf(NetworkError);
    expect(apiError).toBeInstanceOf(APIError);
    expect(validationError).toBeInstanceOf(ValidationError);
    expect(timeoutError).toBeInstanceOf(TimeoutError);
    expect(retryError).toBeInstanceOf(RetryError);
  });

  it('should allow catching specific error types', () => {
    const throwNetworkError = () => {
      throw new NetworkError('Network failed', new Error('Connection refused'));
    };
    
    const throwAPIError = () => {
      throw new APIError('Not found', 404);
    };
    
    // Can catch specific type
    expect(() => throwNetworkError()).toThrow(NetworkError);
    expect(() => throwAPIError()).toThrow(APIError);
    
    // Can catch as base type
    expect(() => throwNetworkError()).toThrow(JackError);
    expect(() => throwAPIError()).toThrow(JackError);
    
    // Can catch as Error
    expect(() => throwNetworkError()).toThrow(Error);
    expect(() => throwAPIError()).toThrow(Error);
  });

  it('should allow type-specific error handling', () => {
    const errors = [
      new NetworkError('Network error', new Error('ECONNREFUSED')),
      new APIError('Server error', 500),
      new ValidationError('Invalid params', ['error1']),
      new TimeoutError('Timeout', 5000),
      new RetryError('Retries exhausted', 3, new Error('Last'))
    ];
    
    errors.forEach(error => {
      if (error instanceof NetworkError) {
        expect(error.originalError).toBeDefined();
      } else if (error instanceof APIError) {
        expect(error.statusCode).toBeDefined();
      } else if (error instanceof ValidationError) {
        expect(error.errors).toBeDefined();
      } else if (error instanceof TimeoutError) {
        expect(error.timeoutMs).toBeDefined();
      } else if (error instanceof RetryError) {
        expect(error.attempts).toBeDefined();
        expect(error.lastError).toBeDefined();
      }
    });
  });
});

describe('Error Serialization', () => {
  it('should serialize JackError for logging', () => {
    const error = new JackError('Test error', { key: 'value' });
    const serialized = JSON.stringify({
      name: error.name,
      message: error.message,
      context: error.context
    });
    
    expect(serialized).toContain('JackError');
    expect(serialized).toContain('Test error');
    expect(serialized).toContain('value');
  });

  it('should serialize NetworkError with original error', () => {
    const originalError = new Error('Connection refused');
    const error = new NetworkError('Network failed', originalError);
    const serialized = JSON.stringify({
      name: error.name,
      message: error.message,
      originalError: {
        name: error.originalError.name,
        message: error.originalError.message
      }
    });
    
    expect(serialized).toContain('NetworkError');
    expect(serialized).toContain('Connection refused');
  });

  it('should serialize APIError with status code and response', () => {
    const response = { error: 'Not found', code: 'INTENT_NOT_FOUND' };
    const error = new APIError('Intent not found', 404, response);
    const serialized = JSON.stringify({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      response: error.response
    });
    
    expect(serialized).toContain('APIError');
    expect(serialized).toContain('404');
    expect(serialized).toContain('INTENT_NOT_FOUND');
  });

  it('should serialize ValidationError with errors array', () => {
    const errors = ['Error 1', 'Error 2'];
    const error = new ValidationError('Validation failed', errors);
    const serialized = JSON.stringify({
      name: error.name,
      message: error.message,
      errors: error.errors
    });
    
    expect(serialized).toContain('ValidationError');
    expect(serialized).toContain('Error 1');
    expect(serialized).toContain('Error 2');
  });

  it('should serialize TimeoutError with timeout duration', () => {
    const error = new TimeoutError('Request timed out', 30000);
    const serialized = JSON.stringify({
      name: error.name,
      message: error.message,
      timeoutMs: error.timeoutMs
    });
    
    expect(serialized).toContain('TimeoutError');
    expect(serialized).toContain('30000');
  });

  it('should serialize RetryError with attempts and last error', () => {
    const lastError = new Error('Final failure');
    const error = new RetryError('Retries exhausted', 3, lastError);
    const serialized = JSON.stringify({
      name: error.name,
      message: error.message,
      attempts: error.attempts,
      lastError: {
        name: error.lastError.name,
        message: error.lastError.message
      }
    });
    
    expect(serialized).toContain('RetryError');
    expect(serialized).toContain('"attempts":3');
    expect(serialized).toContain('Final failure');
  });
});
