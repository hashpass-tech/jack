/**
 * Unit tests for validation module
 * Requirements: 5.4, 8.5
 */

import { describe, it, expect } from 'vitest';
import { validateIntentParams } from '../../src/validation.js';
import type { IntentParams } from '../../src/types.js';

describe('validateIntentParams', () => {
  // Helper to create valid params
  const createValidParams = (): IntentParams => ({
    sourceChain: 'arbitrum',
    destinationChain: 'base',
    tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    amountIn: '1000000',
    minAmountOut: '950000',
    deadline: Date.now() + 3600000 // 1 hour from now
  });

  describe('valid parameters', () => {
    it('should return valid=true for correct parameters', () => {
      const params = createValidParams();
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept large amounts as strings', () => {
      const params = createValidParams();
      params.amountIn = '1000000000000000000000'; // 1000 tokens with 18 decimals
      params.minAmountOut = '999000000000000000000';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept deadline far in the future', () => {
      const params = createValidParams();
      params.deadline = Date.now() + 86400000 * 365; // 1 year from now
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept addresses with mixed case', () => {
      const params = createValidParams();
      params.tokenIn = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      params.tokenOut = '0x1234567890aBcDeF1234567890aBcDeF12345678';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('required fields validation', () => {
    it('should reject missing sourceChain', () => {
      const params = createValidParams();
      delete (params as any).sourceChain;
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sourceChain is required and must not be empty');
    });

    it('should reject empty sourceChain', () => {
      const params = createValidParams();
      params.sourceChain = '';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sourceChain is required and must not be empty');
    });

    it('should reject whitespace-only sourceChain', () => {
      const params = createValidParams();
      params.sourceChain = '   ';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sourceChain is required and must not be empty');
    });

    it('should reject missing destinationChain', () => {
      const params = createValidParams();
      delete (params as any).destinationChain;
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('destinationChain is required and must not be empty');
    });

    it('should reject empty destinationChain', () => {
      const params = createValidParams();
      params.destinationChain = '';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('destinationChain is required and must not be empty');
    });

    it('should reject missing tokenIn', () => {
      const params = createValidParams();
      delete (params as any).tokenIn;
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenIn is required and must not be empty');
    });

    it('should reject empty tokenIn', () => {
      const params = createValidParams();
      params.tokenIn = '';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenIn is required and must not be empty');
    });

    it('should reject missing tokenOut', () => {
      const params = createValidParams();
      delete (params as any).tokenOut;
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenOut is required and must not be empty');
    });

    it('should reject empty tokenOut', () => {
      const params = createValidParams();
      params.tokenOut = '';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenOut is required and must not be empty');
    });

    it('should reject missing amountIn', () => {
      const params = createValidParams();
      delete (params as any).amountIn;
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amountIn is required and must not be empty');
    });

    it('should reject empty amountIn', () => {
      const params = createValidParams();
      params.amountIn = '';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amountIn is required and must not be empty');
    });

    it('should reject missing minAmountOut', () => {
      const params = createValidParams();
      delete (params as any).minAmountOut;
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('minAmountOut is required and must not be empty');
    });

    it('should reject empty minAmountOut', () => {
      const params = createValidParams();
      params.minAmountOut = '';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('minAmountOut is required and must not be empty');
    });

    it('should reject missing deadline', () => {
      const params = createValidParams();
      delete (params as any).deadline;
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('deadline is required');
    });

    it('should reject null deadline', () => {
      const params = createValidParams();
      (params as any).deadline = null;
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('deadline is required');
    });
  });

  describe('amount validation', () => {
    it('should reject zero amountIn', () => {
      const params = createValidParams();
      params.amountIn = '0';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amountIn must be a positive number');
    });

    it('should reject negative amountIn', () => {
      const params = createValidParams();
      params.amountIn = '-1000';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amountIn must be a positive number');
    });

    it('should reject non-numeric amountIn', () => {
      const params = createValidParams();
      params.amountIn = 'not-a-number';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amountIn must be a positive number');
    });

    it('should reject decimal amountIn', () => {
      const params = createValidParams();
      params.amountIn = '1000.5';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amountIn must be a positive number');
    });

    it('should reject zero minAmountOut', () => {
      const params = createValidParams();
      params.minAmountOut = '0';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('minAmountOut must be a positive number');
    });

    it('should reject negative minAmountOut', () => {
      const params = createValidParams();
      params.minAmountOut = '-500';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('minAmountOut must be a positive number');
    });

    it('should reject non-numeric minAmountOut', () => {
      const params = createValidParams();
      params.minAmountOut = 'invalid';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('minAmountOut must be a positive number');
    });
  });

  describe('deadline validation', () => {
    it('should reject deadline in the past', () => {
      const params = createValidParams();
      params.deadline = Date.now() - 1000; // 1 second ago
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('deadline must be in the future');
    });

    it('should reject deadline equal to current time', () => {
      const params = createValidParams();
      params.deadline = Date.now();
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('deadline must be in the future');
    });

    it('should accept deadline 1ms in the future', () => {
      const params = createValidParams();
      params.deadline = Date.now() + 1;
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('address validation', () => {
    it('should reject tokenIn without 0x prefix', () => {
      const params = createValidParams();
      params.tokenIn = 'A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenIn must be a valid Ethereum address (0x followed by 40 hex characters)');
    });

    it('should reject tokenIn with wrong length', () => {
      const params = createValidParams();
      params.tokenIn = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB'; // too short
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenIn must be a valid Ethereum address (0x followed by 40 hex characters)');
    });

    it('should reject tokenIn with invalid characters', () => {
      const params = createValidParams();
      params.tokenIn = '0xG0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // G is not hex
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenIn must be a valid Ethereum address (0x followed by 40 hex characters)');
    });

    it('should reject tokenOut without 0x prefix', () => {
      const params = createValidParams();
      params.tokenOut = 'C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenOut must be a valid Ethereum address (0x followed by 40 hex characters)');
    });

    it('should reject tokenOut with wrong length', () => {
      const params = createValidParams();
      params.tokenOut = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc'; // too short
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenOut must be a valid Ethereum address (0x followed by 40 hex characters)');
    });

    it('should reject tokenOut with invalid characters', () => {
      const params = createValidParams();
      params.tokenOut = '0xZ02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // Z is not hex
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tokenOut must be a valid Ethereum address (0x followed by 40 hex characters)');
    });
  });

  describe('multiple errors', () => {
    it('should return all validation errors', () => {
      const params: IntentParams = {
        sourceChain: '',
        destinationChain: '',
        tokenIn: 'invalid',
        tokenOut: 'invalid',
        amountIn: '0',
        minAmountOut: '-100',
        deadline: Date.now() - 1000
      };
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
      expect(result.errors).toContain('sourceChain is required and must not be empty');
      expect(result.errors).toContain('destinationChain is required and must not be empty');
      expect(result.errors).toContain('amountIn must be a positive number');
      expect(result.errors).toContain('minAmountOut must be a positive number');
      expect(result.errors).toContain('deadline must be in the future');
      expect(result.errors).toContain('tokenIn must be a valid Ethereum address (0x followed by 40 hex characters)');
      expect(result.errors).toContain('tokenOut must be a valid Ethereum address (0x followed by 40 hex characters)');
    });
  });

  describe('edge cases', () => {
    it('should handle very large amounts', () => {
      const params = createValidParams();
      params.amountIn = '999999999999999999999999999999999999999999';
      params.minAmountOut = '999999999999999999999999999999999999999998';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle minimum valid amount (1)', () => {
      const params = createValidParams();
      params.amountIn = '1';
      params.minAmountOut = '1';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle all lowercase addresses', () => {
      const params = createValidParams();
      params.tokenIn = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      params.tokenOut = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle all uppercase addresses', () => {
      const params = createValidParams();
      params.tokenIn = '0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48';
      params.tokenOut = '0xC02AAA39B223FE8D0A0E5C4F27EAD9083C756CC2';
      
      const result = validateIntentParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
