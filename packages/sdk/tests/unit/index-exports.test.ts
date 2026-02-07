/**
 * Test that all types are properly exported from the main index.ts
 * This ensures consumers can import types from '@jack/sdk'
 */

import { describe, it, expect } from 'vitest';

// Test importing types from the main index
import type {
  IntentParams,
  Intent,
  ExecutionStatus,
  ExecutionStep,
  Quote,
  RouteStep,
  CostEntry,
  IssueCost,
  CostsResponse,
  ClientConfig,
  RequestOptions,
  PollOptions,
  BatchSubmitResult,
  DryRunResult,
  ValidationResult,
  EIP712Domain,
  TypedData,
  Subscription,
  ExecutionWatcher,
  Policy
} from '../../src/index';

// Test importing enum
import { ExecutionStatus as ExecutionStatusEnum } from '../../src/index';

// Test importing the main class
import { JACK_SDK } from '../../src/index';

// Test importing error classes
import {
  JackError,
  NetworkError,
  APIError,
  ValidationError,
  TimeoutError,
  RetryError
} from '../../src/index';

// Test importing validation functions
import { validateIntentParams } from '../../src/index';

// Test importing manager classes
import { IntentManager, ExecutionTracker, CostTracker } from '../../src/index';

// Test importing client
import { JackClient } from '../../src/index';

describe('Index Exports', () => {
  it('should export ExecutionStatus enum', () => {
    expect(ExecutionStatusEnum.CREATED).toBe('CREATED');
    expect(ExecutionStatusEnum.SETTLED).toBe('SETTLED');
  });

  it('should export JACK_SDK class', () => {
    const sdk = new JACK_SDK({ baseUrl: 'https://api.jack.example' });
    expect(sdk).toBeInstanceOf(JACK_SDK);
  });

  it('should allow using exported types', () => {
    // This test verifies TypeScript compilation works with exported types
    const params: IntentParams = {
      sourceChain: 'arbitrum',
      destinationChain: 'base',
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amountIn: '1000000',
      minAmountOut: '42000000000000000',
      deadline: Date.now() + 3600000
    };

    const intent: Intent = {
      id: 'JK-ABC123456',
      params,
      status: ExecutionStatusEnum.CREATED,
      createdAt: Date.now(),
      executionSteps: []
    };

    const config: ClientConfig = {
      baseUrl: 'https://api.jack.example',
      timeout: 30000
    };

    const result: ValidationResult = {
      valid: true,
      errors: []
    };

    // If this compiles, the types are properly exported
    expect(params.sourceChain).toBe('arbitrum');
    expect(intent.id).toBe('JK-ABC123456');
    expect(config.baseUrl).toBe('https://api.jack.example');
    expect(result.valid).toBe(true);
  });

  it('should allow using JACK_SDK methods with exported types', () => {
    const sdk = new JACK_SDK({ baseUrl: 'https://api.jack.example' });
    
    const params: IntentParams = {
      sourceChain: 'arbitrum',
      destinationChain: 'base',
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amountIn: '1000000',
      minAmountOut: '42000000000000000',
      deadline: Date.now() + 3600000
    };

    const typedData = sdk.getIntentTypedData(params);
    
    expect(typedData.domain.name).toBe('JACK');
    expect(typedData.primaryType).toBe('Intent');
  });

  it('should export all error classes', () => {
    // Test that error classes are exported and can be instantiated
    const jackError = new JackError('Test error');
    const networkError = new NetworkError('Network error', new Error('Original'));
    const apiError = new APIError('API error', 500);
    const validationError = new ValidationError('Validation error', ['error1']);
    const timeoutError = new TimeoutError('Timeout error', 5000);
    const retryError = new RetryError('Retry error', 3, new Error('Last'));

    expect(jackError).toBeInstanceOf(JackError);
    expect(networkError).toBeInstanceOf(NetworkError);
    expect(apiError).toBeInstanceOf(APIError);
    expect(validationError).toBeInstanceOf(ValidationError);
    expect(timeoutError).toBeInstanceOf(TimeoutError);
    expect(retryError).toBeInstanceOf(RetryError);
  });

  it('should allow error classes to be used in type annotations', () => {
    // This test verifies TypeScript compilation works with error types
    const handleError = (error: JackError): string => {
      if (error instanceof NetworkError) {
        return `Network error: ${error.originalError.message}`;
      } else if (error instanceof APIError) {
        return `API error ${error.statusCode}: ${error.message}`;
      } else if (error instanceof ValidationError) {
        return `Validation errors: ${error.errors.join(', ')}`;
      } else if (error instanceof TimeoutError) {
        return `Timeout after ${error.timeoutMs}ms`;
      } else if (error instanceof RetryError) {
        return `Failed after ${error.attempts} attempts`;
      }
      return error.message;
    };

    const networkError = new NetworkError('Failed', new Error('ECONNREFUSED'));
    const apiError = new APIError('Not found', 404);
    
    expect(handleError(networkError)).toContain('ECONNREFUSED');
    expect(handleError(apiError)).toContain('404');
  });

  it('should export validateIntentParams function', () => {
    // Test that validation function is exported and works correctly
    const validParams: IntentParams = {
      sourceChain: 'arbitrum',
      destinationChain: 'base',
      tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      amountIn: '1000000',
      minAmountOut: '950000',
      deadline: Date.now() + 3600000
    };

    const result = validateIntentParams(validParams);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);

    // Test with invalid params
    const invalidParams: IntentParams = {
      sourceChain: '',
      destinationChain: 'base',
      tokenIn: 'invalid',
      tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      amountIn: '0',
      minAmountOut: '950000',
      deadline: Date.now() - 1000
    };

    const invalidResult = validateIntentParams(invalidParams);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('should export manager classes', () => {
    // Test that manager classes are exported and can be instantiated
    const client = new JackClient({ baseUrl: 'https://api.jack.test' });
    
    const intentManager = new IntentManager(client);
    const executionTracker = new ExecutionTracker(client);
    const costTracker = new CostTracker(client);

    expect(intentManager).toBeInstanceOf(IntentManager);
    expect(executionTracker).toBeInstanceOf(ExecutionTracker);
    expect(costTracker).toBeInstanceOf(CostTracker);
  });
});

