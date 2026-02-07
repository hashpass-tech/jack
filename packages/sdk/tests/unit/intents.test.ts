/**
 * Unit tests for IntentManager
 * 
 * Tests the IntentManager class methods for creating, validating, and managing intents.
 * Validates Requirements 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentManager } from '../../src/intents.js';
import { JackClient } from '../../src/client.js';
import { ValidationError, APIError, NetworkError } from '../../src/errors.js';
import type { IntentParams, Intent, ExecutionStatus } from '../../src/types.js';

describe('IntentManager', () => {
  let mockClient: JackClient;
  let manager: IntentManager;

  const validParams: IntentParams = {
    sourceChain: 'arbitrum',
    destinationChain: 'base',
    tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    tokenOut: '0x4200000000000000000000000000000000000006',
    amountIn: '1000000',
    minAmountOut: '42000000000000000',
    deadline: Date.now() + 3600000, // 1 hour from now
  };

  const mockIntent: Intent = {
    id: 'JK-ABC123456',
    params: validParams,
    signature: '0x1234567890abcdef',
    status: 'CREATED' as ExecutionStatus,
    createdAt: Date.now(),
    executionSteps: [],
  };

  beforeEach(() => {
    // Create a real client instance for testing
    mockClient = new JackClient({
      baseUrl: 'https://api.jack.test',
      timeout: 5000,
      maxRetries: 0, // Disable retries for unit tests
    });

    manager = new IntentManager(mockClient);
  });

  describe('constructor', () => {
    it('should create an IntentManager instance', () => {
      expect(manager).toBeInstanceOf(IntentManager);
    });

    it('should accept a JackClient instance', () => {
      const client = new JackClient({ baseUrl: 'https://api.jack.test' });
      const mgr = new IntentManager(client);
      expect(mgr).toBeInstanceOf(IntentManager);
    });
  });

  describe('getTypedData', () => {
    it('should return properly formatted TypedData object', () => {
      const typedData = manager.getTypedData(validParams);

      expect(typedData).toHaveProperty('domain');
      expect(typedData).toHaveProperty('types');
      expect(typedData).toHaveProperty('message');
      expect(typedData).toHaveProperty('primaryType');
    });

    it('should delegate to serialization module', () => {
      const typedData = manager.getTypedData(validParams);

      expect(typedData.domain.name).toBe('JACK');
      expect(typedData.domain.version).toBe('1');
      expect(typedData.primaryType).toBe('Intent');
    });

    it('should accept custom chainId', () => {
      const typedData = manager.getTypedData(validParams, 42161);
      expect(typedData.domain.chainId).toBe(42161);
    });

    it('should accept custom verifying contract', () => {
      const contract = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const typedData = manager.getTypedData(validParams, 1, contract);
      expect(typedData.domain.verifyingContract).toBe(contract);
    });

    it('should use default values when not provided', () => {
      const typedData = manager.getTypedData(validParams);
      expect(typedData.domain.chainId).toBe(1);
      expect(typedData.domain.verifyingContract).toBe('0x0000000000000000000000000000000000000000');
    });

    it('should include all intent parameters in message', () => {
      const typedData = manager.getTypedData(validParams);

      expect(typedData.message.sourceChain).toBe(validParams.sourceChain);
      expect(typedData.message.destinationChain).toBe(validParams.destinationChain);
      expect(typedData.message.tokenIn).toBe(validParams.tokenIn);
      expect(typedData.message.tokenOut).toBe(validParams.tokenOut);
      expect(typedData.message.amountIn).toBe(validParams.amountIn);
      expect(typedData.message.minAmountOut).toBe(validParams.minAmountOut);
      expect(typedData.message.deadline).toBe(validParams.deadline);
    });

    it('should produce consistent output for same input (Requirement 1.1)', () => {
      const typedData1 = manager.getTypedData(validParams);
      const typedData2 = manager.getTypedData(validParams);

      expect(JSON.stringify(typedData1)).toBe(JSON.stringify(typedData2));
    });
  });

  describe('validate', () => {
    it('should return valid result for valid parameters', () => {
      const result = manager.validate(validParams);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should delegate to validation module', () => {
      const result = manager.validate(validParams);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
    });

    it('should detect missing required fields', () => {
      const invalidParams = {
        ...validParams,
        sourceChain: '',
      };

      const result = manager.validate(invalidParams);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('sourceChain'))).toBe(true);
    });

    it('should detect invalid amounts', () => {
      const invalidParams = {
        ...validParams,
        amountIn: '0',
      };

      const result = manager.validate(invalidParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('amountIn'))).toBe(true);
    });

    it('should detect past deadline', () => {
      const invalidParams = {
        ...validParams,
        deadline: Date.now() - 1000, // 1 second ago
      };

      const result = manager.validate(invalidParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('deadline'))).toBe(true);
    });

    it('should detect invalid addresses', () => {
      const invalidParams = {
        ...validParams,
        tokenIn: 'not-an-address',
      };

      const result = manager.validate(invalidParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('tokenIn'))).toBe(true);
    });

    it('should return multiple errors for multiple issues', () => {
      const invalidParams = {
        ...validParams,
        sourceChain: '',
        amountIn: '-100',
        deadline: Date.now() - 1000,
      };

      const result = manager.validate(invalidParams);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('submit', () => {
    it('should validate parameters before submission', async () => {
      const invalidParams = {
        ...validParams,
        amountIn: '0',
      };

      await expect(
        manager.submit(invalidParams, '0xsignature')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError with error details for invalid params', async () => {
      const invalidParams = {
        ...validParams,
        sourceChain: '',
      };

      try {
        await manager.submit(invalidParams, '0xsignature');
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.errors.length).toBeGreaterThan(0);
          expect(error.message).toContain('Invalid intent parameters');
        }
      }
    });

    it('should make POST request to /api/intents with valid params', async () => {
      // Mock the client's post method
      const postSpy = vi.spyOn(mockClient, 'post').mockResolvedValue({
        intentId: 'JK-ABC123456',
      });

      const signature = '0x1234567890abcdef';
      const intentId = await manager.submit(validParams, signature);

      expect(postSpy).toHaveBeenCalledWith('/api/intents', {
        params: validParams,
        signature,
      });
      expect(intentId).toBe('JK-ABC123456');
    });

    it('should return intent ID on successful submission (Requirement 1.2)', async () => {
      vi.spyOn(mockClient, 'post').mockResolvedValue({
        intentId: 'JK-XYZ789012',
      });

      const intentId = await manager.submit(validParams, '0xsignature');

      expect(intentId).toBe('JK-XYZ789012');
      expect(typeof intentId).toBe('string');
      expect(intentId.length).toBeGreaterThan(0);
    });

    it('should propagate API errors', async () => {
      vi.spyOn(mockClient, 'post').mockRejectedValue(
        new APIError('Server error', 500)
      );

      await expect(
        manager.submit(validParams, '0xsignature')
      ).rejects.toThrow(APIError);
    });

    it('should propagate network errors', async () => {
      vi.spyOn(mockClient, 'post').mockRejectedValue(
        new NetworkError('Connection failed', new Error('Network error'))
      );

      await expect(
        manager.submit(validParams, '0xsignature')
      ).rejects.toThrow(NetworkError);
    });

    it('should not make network request if validation fails', async () => {
      const postSpy = vi.spyOn(mockClient, 'post');
      
      const invalidParams = {
        ...validParams,
        amountIn: '0',
      };

      await expect(
        manager.submit(invalidParams, '0xsignature')
      ).rejects.toThrow(ValidationError);

      expect(postSpy).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should make GET request to /api/intents/[id]', async () => {
      const getSpy = vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

      const intent = await manager.get('JK-ABC123456');

      expect(getSpy).toHaveBeenCalledWith('/api/intents/JK-ABC123456');
      expect(intent).toEqual(mockIntent);
    });

    it('should return complete Intent object (Requirement 1.3)', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);

      const intent = await manager.get('JK-ABC123456');

      expect(intent).toHaveProperty('id');
      expect(intent).toHaveProperty('params');
      expect(intent).toHaveProperty('status');
      expect(intent).toHaveProperty('createdAt');
      expect(intent).toHaveProperty('executionSteps');
    });

    it('should handle intent with settlement transaction', async () => {
      const settledIntent = {
        ...mockIntent,
        status: 'SETTLED' as ExecutionStatus,
        settlementTx: '0xabcdef1234567890',
      };

      vi.spyOn(mockClient, 'get').mockResolvedValue(settledIntent);

      const intent = await manager.get('JK-ABC123456');

      expect(intent.status).toBe('SETTLED');
      expect(intent.settlementTx).toBe('0xabcdef1234567890');
    });

    it('should propagate 404 errors for non-existent intents', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new APIError('Intent not found', 404)
      );

      await expect(
        manager.get('JK-NOTFOUND')
      ).rejects.toThrow(APIError);
    });

    it('should propagate API errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new APIError('Server error', 500)
      );

      await expect(
        manager.get('JK-ABC123456')
      ).rejects.toThrow(APIError);
    });

    it('should propagate network errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new NetworkError('Connection failed', new Error('Network error'))
      );

      await expect(
        manager.get('JK-ABC123456')
      ).rejects.toThrow(NetworkError);
    });
  });

  describe('list', () => {
    it('should make GET request to /api/intents', async () => {
      const getSpy = vi.spyOn(mockClient, 'get').mockResolvedValue([mockIntent]);

      const intents = await manager.list();

      expect(getSpy).toHaveBeenCalledWith('/api/intents');
      expect(intents).toEqual([mockIntent]);
    });

    it('should return array of Intent objects (Requirement 1.4)', async () => {
      const mockIntents = [
        mockIntent,
        { ...mockIntent, id: 'JK-DEF456789' },
        { ...mockIntent, id: 'JK-GHI789012' },
      ];

      vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntents);

      const intents = await manager.list();

      expect(Array.isArray(intents)).toBe(true);
      expect(intents).toHaveLength(3);
      expect(intents[0]).toHaveProperty('id');
      expect(intents[0]).toHaveProperty('params');
      expect(intents[0]).toHaveProperty('status');
    });

    it('should return empty array when no intents exist', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue([]);

      const intents = await manager.list();

      expect(Array.isArray(intents)).toBe(true);
      expect(intents).toHaveLength(0);
    });

    it('should propagate API errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new APIError('Server error', 500)
      );

      await expect(
        manager.list()
      ).rejects.toThrow(APIError);
    });

    it('should propagate network errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new NetworkError('Connection failed', new Error('Network error'))
      );

      await expect(
        manager.list()
      ).rejects.toThrow(NetworkError);
    });
  });

  describe('integration scenarios', () => {
    it('should support complete workflow: validate -> getTypedData -> submit -> get', async () => {
      // Step 1: Validate
      const validation = manager.validate(validParams);
      expect(validation.valid).toBe(true);

      // Step 2: Get typed data for signing
      const typedData = manager.getTypedData(validParams);
      expect(typedData.primaryType).toBe('Intent');

      // Step 3: Submit (mock signature)
      vi.spyOn(mockClient, 'post').mockResolvedValue({
        intentId: 'JK-ABC123456',
      });
      const intentId = await manager.submit(validParams, '0xsignature');
      expect(intentId).toBe('JK-ABC123456');

      // Step 4: Get intent
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockIntent);
      const intent = await manager.get(intentId);
      expect(intent.id).toBe(intentId);
    });

    it('should handle validation failure before submission', async () => {
      const invalidParams = {
        ...validParams,
        amountIn: '0',
      };

      // Validation should fail
      const validation = manager.validate(invalidParams);
      expect(validation.valid).toBe(false);

      // Submit should throw without making network request
      const postSpy = vi.spyOn(mockClient, 'post');
      await expect(
        manager.submit(invalidParams, '0xsignature')
      ).rejects.toThrow(ValidationError);
      expect(postSpy).not.toHaveBeenCalled();
    });
  });
});
