/**
 * Unit tests for EIP-712 serialization
 * 
 * Tests the getTypedData() function and related serialization utilities.
 * Validates Requirements 1.1, 14.1
 */

import { describe, it, expect } from 'vitest';
import { getTypedData, serializeIntentParams, parseIntentParams } from '../../src/serialization.js';
import type { IntentParams } from '../../src/types.js';

describe('serialization', () => {
  const mockParams: IntentParams = {
    sourceChain: 'arbitrum',
    destinationChain: 'base',
    tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    tokenOut: '0x4200000000000000000000000000000000000006',
    amountIn: '1000000',
    minAmountOut: '42000000000000000',
    deadline: 1704067200000,
  };

  describe('getTypedData', () => {
    it('should return properly formatted TypedData object', () => {
      const typedData = getTypedData(mockParams);

      expect(typedData).toHaveProperty('domain');
      expect(typedData).toHaveProperty('types');
      expect(typedData).toHaveProperty('message');
      expect(typedData).toHaveProperty('primaryType');
    });

    it('should set correct domain values', () => {
      const chainId = 42161;
      const verifyingContract = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      
      const typedData = getTypedData(mockParams, chainId, verifyingContract);

      expect(typedData.domain.name).toBe('JACK');
      expect(typedData.domain.version).toBe('1');
      expect(typedData.domain.chainId).toBe(chainId);
      expect(typedData.domain.verifyingContract).toBe(verifyingContract);
    });

    it('should use default chainId and verifyingContract when not provided', () => {
      const typedData = getTypedData(mockParams);

      expect(typedData.domain.chainId).toBe(1);
      expect(typedData.domain.verifyingContract).toBe('0x0000000000000000000000000000000000000000');
    });

    it('should define Intent type structure correctly', () => {
      const typedData = getTypedData(mockParams);

      expect(typedData.types.Intent).toBeDefined();
      expect(typedData.types.Intent).toHaveLength(7);
      
      const fieldNames = typedData.types.Intent.map(field => field.name);
      expect(fieldNames).toEqual([
        'sourceChain',
        'destinationChain',
        'tokenIn',
        'tokenOut',
        'amountIn',
        'minAmountOut',
        'deadline',
      ]);
    });

    it('should set primaryType to Intent', () => {
      const typedData = getTypedData(mockParams);
      expect(typedData.primaryType).toBe('Intent');
    });

    it('should include all intent parameters in message', () => {
      const typedData = getTypedData(mockParams);

      expect(typedData.message.sourceChain).toBe(mockParams.sourceChain);
      expect(typedData.message.destinationChain).toBe(mockParams.destinationChain);
      expect(typedData.message.tokenIn).toBe(mockParams.tokenIn);
      expect(typedData.message.tokenOut).toBe(mockParams.tokenOut);
      expect(typedData.message.amountIn).toBe(mockParams.amountIn);
      expect(typedData.message.minAmountOut).toBe(mockParams.minAmountOut);
      expect(typedData.message.deadline).toBe(mockParams.deadline);
    });

    it('should produce consistent output for same input', () => {
      const typedData1 = getTypedData(mockParams, 1, '0x1234567890123456789012345678901234567890');
      const typedData2 = getTypedData(mockParams, 1, '0x1234567890123456789012345678901234567890');

      expect(typedData1).toEqual(typedData2);
    });

    it('should handle different chainIds', () => {
      const typedData1 = getTypedData(mockParams, 1);
      const typedData2 = getTypedData(mockParams, 42161);

      expect(typedData1.domain.chainId).toBe(1);
      expect(typedData2.domain.chainId).toBe(42161);
      expect(typedData1.domain.chainId).not.toBe(typedData2.domain.chainId);
    });

    it('should handle different verifying contracts', () => {
      const contract1 = '0x1111111111111111111111111111111111111111' as `0x${string}`;
      const contract2 = '0x2222222222222222222222222222222222222222' as `0x${string}`;

      const typedData1 = getTypedData(mockParams, 1, contract1);
      const typedData2 = getTypedData(mockParams, 1, contract2);

      expect(typedData1.domain.verifyingContract).toBe(contract1);
      expect(typedData2.domain.verifyingContract).toBe(contract2);
    });

    it('should only include core intent fields in message', () => {
      const paramsWithExtra = {
        ...mockParams,
        extraField: 'should not be included',
        anotherExtra: 123,
      };

      const typedData = getTypedData(paramsWithExtra);
      const messageKeys = Object.keys(typedData.message);

      expect(messageKeys).toHaveLength(7);
      expect(messageKeys).not.toContain('extraField');
      expect(messageKeys).not.toContain('anotherExtra');
    });
  });

  describe('serializeIntentParams', () => {
    it('should serialize intent parameters to JSON string', () => {
      const serialized = serializeIntentParams(mockParams);
      
      expect(typeof serialized).toBe('string');
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('should produce deterministic output', () => {
      const serialized1 = serializeIntentParams(mockParams);
      const serialized2 = serializeIntentParams(mockParams);

      expect(serialized1).toBe(serialized2);
    });

    it('should include all core intent fields', () => {
      const serialized = serializeIntentParams(mockParams);
      const parsed = JSON.parse(serialized);

      expect(parsed.sourceChain).toBe(mockParams.sourceChain);
      expect(parsed.destinationChain).toBe(mockParams.destinationChain);
      expect(parsed.tokenIn).toBe(mockParams.tokenIn);
      expect(parsed.tokenOut).toBe(mockParams.tokenOut);
      expect(parsed.amountIn).toBe(mockParams.amountIn);
      expect(parsed.minAmountOut).toBe(mockParams.minAmountOut);
      expect(parsed.deadline).toBe(mockParams.deadline);
    });

    it('should exclude extra fields', () => {
      const paramsWithExtra = {
        ...mockParams,
        extraField: 'should not be included',
      };

      const serialized = serializeIntentParams(paramsWithExtra);
      const parsed = JSON.parse(serialized);

      expect(parsed.extraField).toBeUndefined();
    });
  });

  describe('parseIntentParams', () => {
    it('should parse serialized intent parameters', () => {
      const serialized = serializeIntentParams(mockParams);
      const parsed = parseIntentParams(serialized);

      expect(parsed.sourceChain).toBe(mockParams.sourceChain);
      expect(parsed.destinationChain).toBe(mockParams.destinationChain);
      expect(parsed.tokenIn).toBe(mockParams.tokenIn);
      expect(parsed.tokenOut).toBe(mockParams.tokenOut);
      expect(parsed.amountIn).toBe(mockParams.amountIn);
      expect(parsed.minAmountOut).toBe(mockParams.minAmountOut);
      expect(parsed.deadline).toBe(mockParams.deadline);
    });

    it('should round-trip correctly', () => {
      const serialized = serializeIntentParams(mockParams);
      const parsed = parseIntentParams(serialized);
      const reSerialized = serializeIntentParams(parsed);

      expect(reSerialized).toBe(serialized);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseIntentParams('not valid json')).toThrow('Failed to parse intent parameters');
    });

    it('should throw error for missing required fields', () => {
      const incomplete = JSON.stringify({
        sourceChain: 'arbitrum',
        destinationChain: 'base',
        // missing other required fields
      });

      expect(() => parseIntentParams(incomplete)).toThrow('Missing required field');
    });

    it('should throw error for empty string', () => {
      expect(() => parseIntentParams('')).toThrow('Failed to parse intent parameters');
    });
  });

  describe('EIP-712 consistency', () => {
    it('should produce identical typed data for identical inputs', () => {
      const params1 = { ...mockParams };
      const params2 = { ...mockParams };

      const typedData1 = getTypedData(params1, 1, '0x1234567890123456789012345678901234567890');
      const typedData2 = getTypedData(params2, 1, '0x1234567890123456789012345678901234567890');

      expect(JSON.stringify(typedData1)).toBe(JSON.stringify(typedData2));
    });

    it('should produce different typed data for different parameters', () => {
      const params1 = { ...mockParams };
      const params2 = { ...mockParams, amountIn: '2000000' };

      const typedData1 = getTypedData(params1);
      const typedData2 = getTypedData(params2);

      expect(JSON.stringify(typedData1)).not.toBe(JSON.stringify(typedData2));
    });

    it('should produce different typed data for different chainIds', () => {
      const typedData1 = getTypedData(mockParams, 1);
      const typedData2 = getTypedData(mockParams, 42161);

      expect(JSON.stringify(typedData1)).not.toBe(JSON.stringify(typedData2));
    });
  });
});
