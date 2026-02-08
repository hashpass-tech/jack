/**
 * Property-based tests for Yellow Network Serialization Round-Trips
 *
 * Feature: yellow-network-integration
 * Property 14: ChannelState JSON round-trip
 * Property 15: YellowQuote JSON round-trip
 *
 * Tests that for any valid ChannelState or YellowQuote object,
 * JSON.parse(JSON.stringify(obj)) produces a deeply equal object.
 *
 * Validates: Requirements 11.3, 11.4
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import type { ChannelState, ChannelAllocation, YellowQuote } from '../../src/yellow/types.js';
import {
  toSerializableChannelState,
  toSerializableYellowQuote,
} from '../../src/yellow/serialization.js';

// ============================================================================
// Generators
// ============================================================================

/** Generates a hex string of a given byte length (e.g., 20 bytes for an address) */
const arbHexString = (byteLength: number) =>
  fc
    .uint8Array({ minLength: byteLength, maxLength: byteLength })
    .map((bytes) => '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''));

/** Generates a hex address (20 bytes / 40 hex chars) */
const arbHexAddress = arbHexString(20);

/** Generates a bytes32 hex string (32 bytes / 64 hex chars) */
const arbBytes32 = arbHexString(32);

/** Generates a non-negative integer as a string (for BigInt-serialized amounts) */
const arbAmountString = fc.nat({ max: Number.MAX_SAFE_INTEGER }).map((n) => String(n));

/** Generates a valid ChannelAllocation */
const arbChannelAllocation: fc.Arbitrary<ChannelAllocation> = fc.record({
  destination: arbHexAddress,
  token: arbHexAddress,
  amount: arbAmountString,
});

/** Generates a valid channel status */
const arbChannelStatus = fc.constantFrom(
  'VOID' as const,
  'INITIAL' as const,
  'ACTIVE' as const,
  'DISPUTE' as const,
  'FINAL' as const,
);

/** Generates a valid state intent */
const arbStateIntent = fc.constantFrom('INITIALIZE', 'OPERATE', 'RESIZE', 'FINALIZE');

/** Generates a valid ChannelState */
const arbChannelState: fc.Arbitrary<ChannelState> = fc.record({
  channelId: arbBytes32,
  status: arbChannelStatus,
  chainId: fc.integer({ min: 1, max: 100000 }),
  token: arbHexAddress,
  allocations: fc.array(arbChannelAllocation, { minLength: 1, maxLength: 5 }),
  stateVersion: fc.nat({ max: 1000000 }),
  stateIntent: arbStateIntent,
  stateHash: fc.option(arbBytes32, { nil: undefined }),
  adjudicator: arbHexAddress,
  challengePeriod: fc.integer({ min: 1, max: 86400 }),
  challengeExpiration: fc.option(fc.integer({ min: 1, max: 2000000000 }), { nil: undefined }),
  createdAt: fc.integer({ min: 1, max: 2000000000 }),
  updatedAt: fc.integer({ min: 1, max: 2000000000 }),
});

/** Generates a valid YellowQuote */
const arbYellowQuote: fc.Arbitrary<YellowQuote> = fc.record({
  solverId: fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
  channelId: arbBytes32,
  amountIn: arbAmountString,
  amountOut: arbAmountString,
  estimatedTime: fc.integer({ min: 1, max: 3600 }),
  timestamp: fc.integer({ min: 1, max: 2000000000 }),
});

// ============================================================================
// Property 14: ChannelState JSON round-trip
// ============================================================================

describe('Feature: yellow-network-integration, Property 14: ChannelState JSON round-trip', () => {
  /**
   * **Validates: Requirements 11.3**
   *
   * For any valid ChannelState object (with string-serialized amounts),
   * JSON.parse(JSON.stringify(state)) produces a deeply equal object.
   */
  it('ChannelState survives JSON round-trip after serialization', () => {
    fc.assert(
      fc.property(arbChannelState, (state) => {
        // Ensure the state is JSON-safe via the serialization helper
        const serializable = toSerializableChannelState(state);

        // Perform JSON round-trip
        const json = JSON.stringify(serializable);
        const parsed = JSON.parse(json) as ChannelState;

        // The round-tripped object should be deeply equal to the serializable form
        expect(parsed).toEqual(serializable);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 11.3**
   *
   * JSON.stringify does not throw for any valid ChannelState after serialization.
   */
  it('JSON.stringify does not throw for any serialized ChannelState', () => {
    fc.assert(
      fc.property(arbChannelState, (state) => {
        const serializable = toSerializableChannelState(state);

        // JSON.stringify should not throw
        expect(() => JSON.stringify(serializable)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 11.3**
   *
   * The serialized ChannelState preserves all required fields through the round-trip.
   */
  it('ChannelState round-trip preserves all structural fields', () => {
    fc.assert(
      fc.property(arbChannelState, (state) => {
        const serializable = toSerializableChannelState(state);
        const parsed = JSON.parse(JSON.stringify(serializable)) as ChannelState;

        // Verify all required fields are present and correct
        expect(parsed.channelId).toBe(serializable.channelId);
        expect(parsed.status).toBe(serializable.status);
        expect(parsed.chainId).toBe(serializable.chainId);
        expect(parsed.token).toBe(serializable.token);
        expect(parsed.stateVersion).toBe(serializable.stateVersion);
        expect(parsed.stateIntent).toBe(serializable.stateIntent);
        expect(parsed.adjudicator).toBe(serializable.adjudicator);
        expect(parsed.challengePeriod).toBe(serializable.challengePeriod);
        expect(parsed.createdAt).toBe(serializable.createdAt);
        expect(parsed.updatedAt).toBe(serializable.updatedAt);

        // Optional fields
        expect(parsed.stateHash).toBe(serializable.stateHash);
        expect(parsed.challengeExpiration).toBe(serializable.challengeExpiration);

        // Allocations array preserved
        expect(parsed.allocations).toHaveLength(serializable.allocations.length);
        for (let i = 0; i < serializable.allocations.length; i++) {
          expect(parsed.allocations[i].destination).toBe(serializable.allocations[i].destination);
          expect(parsed.allocations[i].token).toBe(serializable.allocations[i].token);
          expect(parsed.allocations[i].amount).toBe(serializable.allocations[i].amount);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// Property 15: YellowQuote JSON round-trip
// ============================================================================

describe('Feature: yellow-network-integration, Property 15: YellowQuote JSON round-trip', () => {
  /**
   * **Validates: Requirements 11.4**
   *
   * For any valid YellowQuote object, JSON.parse(JSON.stringify(quote))
   * produces a deeply equal object.
   */
  it('YellowQuote survives JSON round-trip after serialization', () => {
    fc.assert(
      fc.property(arbYellowQuote, (quote) => {
        // Ensure the quote is JSON-safe via the serialization helper
        const serializable = toSerializableYellowQuote(quote);

        // Perform JSON round-trip
        const json = JSON.stringify(serializable);
        const parsed = JSON.parse(json) as YellowQuote;

        // The round-tripped object should be deeply equal to the serializable form
        expect(parsed).toEqual(serializable);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 11.4**
   *
   * JSON.stringify does not throw for any valid YellowQuote after serialization.
   */
  it('JSON.stringify does not throw for any serialized YellowQuote', () => {
    fc.assert(
      fc.property(arbYellowQuote, (quote) => {
        const serializable = toSerializableYellowQuote(quote);

        // JSON.stringify should not throw
        expect(() => JSON.stringify(serializable)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 11.4**
   *
   * The serialized YellowQuote preserves all required fields through the round-trip.
   */
  it('YellowQuote round-trip preserves all structural fields', () => {
    fc.assert(
      fc.property(arbYellowQuote, (quote) => {
        const serializable = toSerializableYellowQuote(quote);
        const parsed = JSON.parse(JSON.stringify(serializable)) as YellowQuote;

        // Verify all fields are present and correct
        expect(parsed.solverId).toBe(serializable.solverId);
        expect(parsed.channelId).toBe(serializable.channelId);
        expect(parsed.amountIn).toBe(serializable.amountIn);
        expect(parsed.amountOut).toBe(serializable.amountOut);
        expect(parsed.estimatedTime).toBe(serializable.estimatedTime);
        expect(parsed.timestamp).toBe(serializable.timestamp);
      }),
      { numRuns: 100 },
    );
  });
});
