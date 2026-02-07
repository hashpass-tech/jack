/**
 * Integration test for serialization module
 * 
 * Verifies that the serialization functions can be imported and used correctly
 * from the main SDK export.
 */

import { describe, it, expect } from 'vitest';
import { getTypedData, serializeIntentParams, parseIntentParams } from '../../src/index.js';
import type { IntentParams } from '../../src/index.js';

describe('Serialization Integration', () => {
  const mockParams: IntentParams = {
    sourceChain: 'arbitrum',
    destinationChain: 'base',
    tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    tokenOut: '0x4200000000000000000000000000000000000006',
    amountIn: '1000000',
    minAmountOut: '42000000000000000',
    deadline: 1704067200000,
  };

  it('should export getTypedData function', () => {
    expect(typeof getTypedData).toBe('function');
  });

  it('should export serializeIntentParams function', () => {
    expect(typeof serializeIntentParams).toBe('function');
  });

  it('should export parseIntentParams function', () => {
    expect(typeof parseIntentParams).toBe('function');
  });

  it('should create valid EIP-712 typed data', () => {
    const typedData = getTypedData(mockParams, 42161, '0x1234567890123456789012345678901234567890');

    expect(typedData.domain.name).toBe('JACK');
    expect(typedData.domain.version).toBe('1');
    expect(typedData.domain.chainId).toBe(42161);
    expect(typedData.primaryType).toBe('Intent');
    expect(typedData.types.Intent).toBeDefined();
    expect(typedData.message).toBeDefined();
  });

  it('should serialize and parse intent parameters correctly', () => {
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

  it('should work with default parameters', () => {
    const typedData = getTypedData(mockParams);

    expect(typedData.domain.chainId).toBe(1);
    expect(typedData.domain.verifyingContract).toBe('0x0000000000000000000000000000000000000000');
  });

  it('should produce consistent typed data for same inputs', () => {
    const typedData1 = getTypedData(mockParams, 1, '0x1234567890123456789012345678901234567890');
    const typedData2 = getTypedData(mockParams, 1, '0x1234567890123456789012345678901234567890');

    expect(JSON.stringify(typedData1)).toBe(JSON.stringify(typedData2));
  });
});
