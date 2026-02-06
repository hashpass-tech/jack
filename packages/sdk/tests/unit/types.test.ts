/**
 * Unit tests for TypeScript type definitions
 * 
 * These tests verify that all types are properly exported and can be used
 * in TypeScript code with correct type checking.
 */

import { describe, it, expect } from 'vitest';
import type {
  // Core Intent Types
  IntentParams,
  Intent,
  ExecutionStatus,
  ExecutionStep,
  // Quote Types
  Quote,
  RouteStep,
  // Cost Types
  CostEntry,
  IssueCost,
  CostsResponse,
  // Configuration Types
  ClientConfig,
  RequestOptions,
  PollOptions,
  // Result Types
  BatchSubmitResult,
  DryRunResult,
  ValidationResult,
  // EIP-712 Types
  EIP712Domain,
  TypedData,
  // Subscription Types
  Subscription,
  ExecutionWatcher,
  // Policy Types
  Policy
} from '../../src/types';

// Also test enum import
import { ExecutionStatus as ExecutionStatusEnum } from '../../src/types';

describe('Type Exports', () => {
  it('should export ExecutionStatus enum with all values', () => {
    expect(ExecutionStatusEnum.CREATED).toBe('CREATED');
    expect(ExecutionStatusEnum.QUOTED).toBe('QUOTED');
    expect(ExecutionStatusEnum.EXECUTING).toBe('EXECUTING');
    expect(ExecutionStatusEnum.SETTLING).toBe('SETTLING');
    expect(ExecutionStatusEnum.SETTLED).toBe('SETTLED');
    expect(ExecutionStatusEnum.ABORTED).toBe('ABORTED');
    expect(ExecutionStatusEnum.EXPIRED).toBe('EXPIRED');
  });

  it('should allow creating valid IntentParams objects', () => {
    const params: IntentParams = {
      sourceChain: 'arbitrum',
      destinationChain: 'base',
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amountIn: '1000000',
      minAmountOut: '42000000000000000',
      deadline: Date.now() + 3600000
    };

    expect(params.sourceChain).toBe('arbitrum');
    expect(params.destinationChain).toBe('base');
  });

  it('should allow creating valid Intent objects', () => {
    const intent: Intent = {
      id: 'JK-ABC123456',
      params: {
        sourceChain: 'arbitrum',
        destinationChain: 'base',
        tokenIn: '0xUSDC',
        tokenOut: '0xWETH',
        amountIn: '1000000',
        minAmountOut: '42000000000000000',
        deadline: Date.now() + 3600000
      },
      status: ExecutionStatusEnum.CREATED,
      createdAt: Date.now(),
      executionSteps: []
    };

    expect(intent.id).toBe('JK-ABC123456');
    expect(intent.status).toBe('CREATED');
  });

  it('should allow creating valid ExecutionStep objects', () => {
    const step: ExecutionStep = {
      step: 'signing',
      status: 'COMPLETED',
      timestamp: Date.now(),
      details: 'Signature verified'
    };

    expect(step.step).toBe('signing');
    expect(step.status).toBe('COMPLETED');
  });

  it('should allow creating valid Quote objects', () => {
    const quote: Quote = {
      solverId: 'solver-1',
      solverName: 'Fast Solver',
      totalFee: '1000',
      estimatedTime: 300,
      route: [
        {
          chain: 'arbitrum',
          protocol: 'uniswap',
          action: 'swap'
        }
      ]
    };

    expect(quote.solverId).toBe('solver-1');
    expect(quote.route).toHaveLength(1);
  });

  it('should allow creating valid IssueCost objects', () => {
    const cost: IssueCost = {
      issueId: 'issue-1',
      totalCost: 100,
      budget: 200,
      overBudget: false
    };

    expect(cost.issueId).toBe('issue-1');
    expect(cost.overBudget).toBe(false);
  });

  it('should allow creating valid ClientConfig objects', () => {
    const config: ClientConfig = {
      baseUrl: 'https://api.jack.example',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      retryBackoff: 2,
      enableCache: true,
      cacheTTL: 60000,
      headers: {
        'Authorization': 'Bearer token'
      }
    };

    expect(config.baseUrl).toBe('https://api.jack.example');
    expect(config.maxRetries).toBe(3);
  });

  it('should allow creating minimal ClientConfig with only baseUrl', () => {
    const config: ClientConfig = {
      baseUrl: 'https://api.jack.example'
    };

    expect(config.baseUrl).toBe('https://api.jack.example');
    expect(config.timeout).toBeUndefined();
  });

  it('should allow creating valid PollOptions objects', () => {
    const options: PollOptions = {
      interval: 2000,
      timeout: 60000,
      stopStatuses: [ExecutionStatusEnum.SETTLED, ExecutionStatusEnum.ABORTED]
    };

    expect(options.interval).toBe(2000);
    expect(options.stopStatuses).toHaveLength(2);
  });

  it('should allow creating valid BatchSubmitResult objects', () => {
    const successResult: BatchSubmitResult = {
      intentId: 'JK-ABC123456',
      success: true
    };

    const failureResult: BatchSubmitResult = {
      intentId: '',
      success: false,
      error: new Error('Submission failed')
    };

    expect(successResult.success).toBe(true);
    expect(failureResult.success).toBe(false);
    expect(failureResult.error).toBeInstanceOf(Error);
  });

  it('should allow creating valid ValidationResult objects', () => {
    const validResult: ValidationResult = {
      valid: true,
      errors: []
    };

    const invalidResult: ValidationResult = {
      valid: false,
      errors: ['Amount must be positive', 'Deadline must be in the future']
    };

    expect(validResult.valid).toBe(true);
    expect(invalidResult.errors).toHaveLength(2);
  });

  it('should allow creating valid DryRunResult objects', () => {
    const result: DryRunResult = {
      valid: true,
      estimatedCost: '1000',
      errors: []
    };

    expect(result.valid).toBe(true);
    expect(result.estimatedCost).toBe('1000');
  });

  it('should allow creating valid EIP712Domain objects', () => {
    const domain: EIP712Domain = {
      name: 'JACK',
      version: '1',
      chainId: 84532,
      verifyingContract: '0x0000000000000000000000000000000000000000'
    };

    expect(domain.name).toBe('JACK');
    expect(domain.chainId).toBe(84532);
  });

  it('should allow creating valid TypedData objects', () => {
    const typedData: TypedData = {
      domain: {
        name: 'JACK',
        version: '1',
        chainId: 84532,
        verifyingContract: '0x0000000000000000000000000000000000000000'
      },
      types: {
        Intent: [
          { name: 'sourceChain', type: 'string' },
          { name: 'destinationChain', type: 'string' }
        ]
      },
      message: {
        sourceChain: 'arbitrum',
        destinationChain: 'base'
      },
      primaryType: 'Intent'
    };

    expect(typedData.primaryType).toBe('Intent');
    expect(typedData.types.Intent).toHaveLength(2);
  });

  it('should allow creating valid Policy objects', () => {
    const policy: Policy = {
      maxAmountIn: '1000000000',
      minAmountOut: '1000',
      allowedSourceChains: ['arbitrum', 'ethereum'],
      allowedDestinationChains: ['base', 'optimism'],
      allowedTokensIn: ['0xUSDC', '0xUSDT'],
      allowedTokensOut: ['0xWETH', '0xDAI'],
      maxDeadlineOffset: 3600000
    };

    expect(policy.allowedSourceChains).toHaveLength(2);
    expect(policy.maxDeadlineOffset).toBe(3600000);
  });
});

describe('Type Compatibility', () => {
  it('should allow IntentParams with additional properties', () => {
    const params: IntentParams = {
      sourceChain: 'arbitrum',
      destinationChain: 'base',
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amountIn: '1000000',
      minAmountOut: '42000000000000000',
      deadline: Date.now() + 3600000,
      customField: 'custom value',
      numericField: 42
    };

    expect(params.customField).toBe('custom value');
    expect(params.numericField).toBe(42);
  });

  it('should allow optional fields to be undefined', () => {
    const intent: Intent = {
      id: 'JK-ABC123456',
      params: {
        sourceChain: 'arbitrum',
        destinationChain: 'base',
        tokenIn: '0xUSDC',
        tokenOut: '0xWETH',
        amountIn: '1000000',
        minAmountOut: '42000000000000000',
        deadline: Date.now() + 3600000
      },
      status: ExecutionStatusEnum.CREATED,
      createdAt: Date.now(),
      executionSteps: []
      // signature and settlementTx are optional
    };

    expect(intent.signature).toBeUndefined();
    expect(intent.settlementTx).toBeUndefined();
  });

  it('should allow ExecutionStep status to be one of the valid values', () => {
    const statuses: Array<ExecutionStep['status']> = [
      'COMPLETED',
      'IN_PROGRESS',
      'PENDING',
      'FAILED'
    ];

    statuses.forEach(status => {
      const step: ExecutionStep = {
        step: 'test',
        status,
        timestamp: Date.now()
      };
      expect(step.status).toBe(status);
    });
  });
});
