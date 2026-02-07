/**
 * Unit tests for JACK_SDK main class
 * 
 * Tests that the SDK properly initializes all managers and provides
 * convenience methods that delegate to the appropriate managers.
 * 
 * Validates Requirements 1.1, 1.2, 1.3, 1.4, 2.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JACK_SDK } from '../../src/index.js';
import { ExecutionStatus } from '../../src/types.js';
import type { IntentParams, Intent } from '../../src/types.js';

describe('JACK_SDK', () => {
  let sdk: JACK_SDK;
  const baseUrl = 'https://api.jack.test';

  beforeEach(() => {
    sdk = new JACK_SDK({ baseUrl });
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with valid configuration', () => {
      const sdk = new JACK_SDK({ baseUrl: 'https://api.jack.example' });
      expect(sdk).toBeInstanceOf(JACK_SDK);
    });

    it('should initialize with custom configuration', () => {
      const sdk = new JACK_SDK({
        baseUrl: 'https://api.jack.example',
        timeout: 60000,
        maxRetries: 5,
        enableCache: true,
        cacheTTL: 120000,
        headers: { 'Authorization': 'Bearer token' }
      });
      expect(sdk).toBeInstanceOf(JACK_SDK);
    });

    it('should throw ValidationError for invalid configuration', () => {
      expect(() => {
        new JACK_SDK({ baseUrl: '' });
      }).toThrow('Invalid client configuration');
    });

    it('should expose all managers as public readonly properties', () => {
      expect(sdk.intents).toBeDefined();
      expect(sdk.execution).toBeDefined();
      expect(sdk.costs).toBeDefined();
      expect(sdk.agent).toBeDefined();
    });
  });

  describe('Manager Initialization', () => {
    it('should initialize IntentManager', () => {
      expect(sdk.intents).toBeDefined();
      expect(typeof sdk.intents.getTypedData).toBe('function');
      expect(typeof sdk.intents.submit).toBe('function');
      expect(typeof sdk.intents.get).toBe('function');
      expect(typeof sdk.intents.list).toBe('function');
    });

    it('should initialize ExecutionTracker', () => {
      expect(sdk.execution).toBeDefined();
      expect(typeof sdk.execution.getStatus).toBe('function');
      expect(typeof sdk.execution.waitForStatus).toBe('function');
      expect(typeof sdk.execution.watch).toBe('function');
    });

    it('should initialize CostTracker', () => {
      expect(sdk.costs).toBeDefined();
      expect(typeof sdk.costs.getCosts).toBe('function');
      expect(typeof sdk.costs.getIssueCost).toBe('function');
      expect(typeof sdk.costs.getOverBudgetIssues).toBe('function');
    });

    it('should initialize AgentUtils', () => {
      expect(sdk.agent).toBeDefined();
      expect(typeof sdk.agent.batchSubmit).toBe('function');
      expect(typeof sdk.agent.dryRun).toBe('function');
      expect(typeof sdk.agent.validatePolicy).toBe('function');
      expect(typeof sdk.agent.subscribeToUpdates).toBe('function');
    });
  });

  describe('Convenience Methods', () => {
    const mockParams: IntentParams = {
      sourceChain: 'arbitrum',
      destinationChain: 'base',
      tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      amountIn: '1000000',
      minAmountOut: '950000',
      deadline: Date.now() + 3600000
    };

    const mockIntent: Intent = {
      id: 'JK-ABC123456',
      params: mockParams,
      status: ExecutionStatus.SETTLED,
      createdAt: Date.now(),
      executionSteps: [],
      settlementTx: '0x123...'
    };

    describe('submitIntent()', () => {
      it('should delegate to IntentManager.submit()', async () => {
        const submitSpy = vi.spyOn(sdk.intents, 'submit').mockResolvedValue('JK-ABC123456');

        const result = await sdk.submitIntent(mockParams, '0xsignature');

        expect(submitSpy).toHaveBeenCalledWith(mockParams, '0xsignature');
        expect(result).toBe('JK-ABC123456');
      });

      it('should throw ValidationError for invalid params', async () => {
        const invalidParams = { ...mockParams, amountIn: '-100' };

        await expect(sdk.submitIntent(invalidParams, '0xsignature')).rejects.toThrow();
      });
    });

    describe('getIntent()', () => {
      it('should delegate to IntentManager.get()', async () => {
        const getSpy = vi.spyOn(sdk.intents, 'get').mockResolvedValue(mockIntent);

        const result = await sdk.getIntent('JK-ABC123456');

        expect(getSpy).toHaveBeenCalledWith('JK-ABC123456');
        expect(result).toEqual(mockIntent);
      });
    });

    describe('listIntents()', () => {
      it('should delegate to IntentManager.list()', async () => {
        const mockIntents = [mockIntent];
        const listSpy = vi.spyOn(sdk.intents, 'list').mockResolvedValue(mockIntents);

        const result = await sdk.listIntents();

        expect(listSpy).toHaveBeenCalled();
        expect(result).toEqual(mockIntents);
      });
    });

    describe('waitForSettlement()', () => {
      it('should delegate to ExecutionTracker.waitForStatus() with SETTLED status', async () => {
        const waitSpy = vi.spyOn(sdk.execution, 'waitForStatus').mockResolvedValue(mockIntent);

        const result = await sdk.waitForSettlement('JK-ABC123456');

        expect(waitSpy).toHaveBeenCalledWith(
          'JK-ABC123456',
          ExecutionStatus.SETTLED,
          { timeout: 120000, interval: 2000 }
        );
        expect(result).toEqual(mockIntent);
      });

      it('should accept custom timeout', async () => {
        const waitSpy = vi.spyOn(sdk.execution, 'waitForStatus').mockResolvedValue(mockIntent);

        await sdk.waitForSettlement('JK-ABC123456', 300000);

        expect(waitSpy).toHaveBeenCalledWith(
          'JK-ABC123456',
          ExecutionStatus.SETTLED,
          { timeout: 300000, interval: 2000 }
        );
      });

      it('should use default timeout of 120000ms when not specified', async () => {
        const waitSpy = vi.spyOn(sdk.execution, 'waitForStatus').mockResolvedValue(mockIntent);

        await sdk.waitForSettlement('JK-ABC123456');

        expect(waitSpy).toHaveBeenCalledWith(
          'JK-ABC123456',
          ExecutionStatus.SETTLED,
          expect.objectContaining({ timeout: 120000 })
        );
      });
    });
  });

  describe('Legacy Methods (Backward Compatibility)', () => {
    const mockParams: IntentParams = {
      sourceChain: 'arbitrum',
      destinationChain: 'base',
      tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      amountIn: '1000000',
      minAmountOut: '950000',
      deadline: Date.now() + 3600000
    };

    const mockIntent: Intent = {
      id: 'JK-ABC123456',
      params: mockParams,
      status: ExecutionStatus.CREATED,
      createdAt: Date.now(),
      executionSteps: []
    };

    describe('getExecutionStatus()', () => {
      it('should delegate to ExecutionTracker.getStatus()', async () => {
        const getSpy = vi.spyOn(sdk.execution, 'getStatus').mockResolvedValue(mockIntent);

        const result = await sdk.getExecutionStatus('JK-ABC123456');

        expect(getSpy).toHaveBeenCalledWith('JK-ABC123456');
        expect(result).toEqual(mockIntent);
      });
    });

    describe('getIntentTypedData()', () => {
      it('should delegate to IntentManager.getTypedData()', () => {
        const getTypedDataSpy = vi.spyOn(sdk.intents, 'getTypedData');

        const result = sdk.getIntentTypedData(mockParams);

        expect(getTypedDataSpy).toHaveBeenCalledWith(mockParams);
        expect(result.domain.name).toBe('JACK');
        expect(result.primaryType).toBe('Intent');
      });

      it('should return properly formatted EIP-712 typed data', () => {
        const typedData = sdk.getIntentTypedData(mockParams);

        expect(typedData).toHaveProperty('domain');
        expect(typedData).toHaveProperty('types');
        expect(typedData).toHaveProperty('message');
        expect(typedData).toHaveProperty('primaryType');
        expect(typedData.domain.name).toBe('JACK');
        expect(typedData.domain.version).toBe('1');
        expect(typedData.primaryType).toBe('Intent');
      });
    });
  });

  describe('Integration with Managers', () => {
    it('should allow chaining operations through managers', async () => {
      const mockParams: IntentParams = {
        sourceChain: 'arbitrum',
        destinationChain: 'base',
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        amountIn: '1000000',
        minAmountOut: '950000',
        deadline: Date.now() + 3600000
      };

      // Test that we can use managers directly
      const typedData = sdk.intents.getTypedData(mockParams);
      expect(typedData.domain.name).toBe('JACK');

      const validation = sdk.intents.validate(mockParams);
      expect(validation.valid).toBe(true);
    });

    it('should allow using agent utilities through sdk.agent', async () => {
      const mockParams: IntentParams = {
        sourceChain: 'arbitrum',
        destinationChain: 'base',
        tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        amountIn: '1000000',
        minAmountOut: '950000',
        deadline: Date.now() + 3600000
      };

      const dryRunResult = await sdk.agent.dryRun(mockParams);
      expect(dryRunResult.valid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from managers', async () => {
      const error = new Error('API Error');
      vi.spyOn(sdk.intents, 'get').mockRejectedValue(error);

      await expect(sdk.getIntent('JK-ABC123456')).rejects.toThrow('API Error');
    });

    it('should propagate validation errors from submitIntent', async () => {
      const invalidParams: IntentParams = {
        sourceChain: '',
        destinationChain: 'base',
        tokenIn: 'invalid',
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        amountIn: '-100',
        minAmountOut: '950000',
        deadline: Date.now() - 1000
      };

      await expect(sdk.submitIntent(invalidParams, '0xsignature')).rejects.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should return properly typed results', async () => {
      const mockIntent: Intent = {
        id: 'JK-ABC123456',
        params: {
          sourceChain: 'arbitrum',
          destinationChain: 'base',
          tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          amountIn: '1000000',
          minAmountOut: '950000',
          deadline: Date.now() + 3600000
        },
        status: ExecutionStatus.CREATED,
        createdAt: Date.now(),
        executionSteps: []
      };

      vi.spyOn(sdk.intents, 'get').mockResolvedValue(mockIntent);

      const result = await sdk.getIntent('JK-ABC123456');
      
      // TypeScript should infer the correct type
      expect(result.id).toBe('JK-ABC123456');
      expect(result.status).toBe(ExecutionStatus.CREATED);
      expect(result.params.sourceChain).toBe('arbitrum');
    });
  });
});
