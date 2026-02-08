/**
 * Property-based tests for Yellow Network Event-to-Status Mapping
 *
 * Feature: yellow-network-integration
 * Property 11: Event-to-status mapping is correct and complete
 *
 * Tests that all known Yellow event names, channel statuses, and state intents
 * produce the correct ExecutionStatus and isTerminal flag. Also verifies that
 * unknown/random strings return undefined.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { ExecutionStatus } from '../../src/types.js';
import {
  mapYellowEvent,
  mapChannelStatus,
  mapStateIntent,
  inferMapping,
} from '../../src/yellow/event-mapper.js';

// ============================================================================
// Expected mapping tables — the source of truth for property assertions
// ============================================================================

/** Yellow event name → expected ExecutionStatus */
const EXPECTED_EVENT_MAP: Record<string, ExecutionStatus> = {
  quote_accepted: ExecutionStatus.QUOTED,
  solver_quoted: ExecutionStatus.QUOTED,
  execution_started: ExecutionStatus.EXECUTING,
  routing_started: ExecutionStatus.EXECUTING,
  settlement_submitted: ExecutionStatus.SETTLING,
  settled: ExecutionStatus.SETTLED,
  settlement_finalized: ExecutionStatus.SETTLED,
  failed: ExecutionStatus.ABORTED,
  execution_failed: ExecutionStatus.ABORTED,
  settlement_failed: ExecutionStatus.ABORTED,
  expired: ExecutionStatus.EXPIRED,
  canceled: ExecutionStatus.ABORTED,
};

/** Channel status → expected ExecutionStatus */
const EXPECTED_CHANNEL_STATUS_MAP: Record<string, ExecutionStatus> = {
  VOID: ExecutionStatus.CREATED,
  INITIAL: ExecutionStatus.QUOTED,
  ACTIVE: ExecutionStatus.EXECUTING,
  DISPUTE: ExecutionStatus.EXECUTING,
  FINAL: ExecutionStatus.SETTLED,
};

/** State intent → expected ExecutionStatus */
const EXPECTED_STATE_INTENT_MAP: Record<string, ExecutionStatus> = {
  INITIALIZE: ExecutionStatus.QUOTED,
  OPERATE: ExecutionStatus.EXECUTING,
  RESIZE: ExecutionStatus.EXECUTING,
  FINALIZE: ExecutionStatus.SETTLED,
};

/** Terminal statuses — isTerminal should be true only for these */
const TERMINAL_STATUSES = new Set([
  ExecutionStatus.SETTLED,
  ExecutionStatus.ABORTED,
  ExecutionStatus.EXPIRED,
]);

// ============================================================================
// Generators
// ============================================================================

const ALL_EVENT_NAMES = Object.keys(EXPECTED_EVENT_MAP);
const ALL_CHANNEL_STATUSES = Object.keys(EXPECTED_CHANNEL_STATUS_MAP);
const ALL_STATE_INTENTS = Object.keys(EXPECTED_STATE_INTENT_MAP);

/** Generates a known Yellow event name */
const arbYellowEvent = fc.constantFrom(...ALL_EVENT_NAMES);

/** Generates a known channel status */
const arbChannelStatus = fc.constantFrom(...ALL_CHANNEL_STATUSES);

/** Generates a known state intent */
const arbStateIntent = fc.constantFrom(...ALL_STATE_INTENTS);

/**
 * Generates a case variant of a string (uppercase, lowercase, mixed, with
 * whitespace padding, or hyphens instead of underscores) to test normalization.
 */
const arbCaseVariant = (base: fc.Arbitrary<string>) =>
  fc.tuple(base, fc.constantFrom('lower', 'upper', 'mixed', 'padded', 'hyphen')).map(
    ([str, variant]) => {
      switch (variant) {
        case 'lower':
          return str.toLowerCase();
        case 'upper':
          return str.toUpperCase();
        case 'mixed':
          return str
            .split('')
            .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
            .join('');
        case 'padded':
          return `  ${str}  `;
        case 'hyphen':
          return str.replace(/_/g, '-');
        default:
          return str;
      }
    },
  );

/**
 * Generates a random string that is NOT a known event name, channel status,
 * or state intent (after normalization).
 */
const allKnownNormalized = new Set([
  ...ALL_EVENT_NAMES.map((s) => s.toLowerCase()),
  ...ALL_CHANNEL_STATUSES.map((s) => s.toLowerCase()),
  ...ALL_STATE_INTENTS.map((s) => s.toLowerCase()),
]);

const arbUnknownString = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => {
    const normalized = s.trim().toLowerCase().replace(/[\s-]+/g, '_');
    return normalized.length > 0 && !allKnownNormalized.has(normalized);
  });

// ============================================================================
// Property 11: Event-to-status mapping is correct and complete
// ============================================================================

describe('Feature: yellow-network-integration, Property 11: Event-to-status mapping is correct and complete', () => {
  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
   *
   * For any known Yellow event name, mapYellowEvent returns a defined
   * MappedEvent with the correct ExecutionStatus and isTerminal flag.
   */
  it('mapYellowEvent returns correct ExecutionStatus for all known events', () => {
    fc.assert(
      fc.property(arbYellowEvent, (eventName) => {
        const result = mapYellowEvent(eventName);

        // 1. The mapping function returns a defined MappedEvent
        expect(result).toBeDefined();

        // 2. The executionStatus matches the expected value
        const expectedStatus = EXPECTED_EVENT_MAP[eventName];
        expect(result!.executionStatus).toBe(expectedStatus);

        // 3. The isTerminal flag is true only for SETTLED, ABORTED, EXPIRED
        expect(result!.isTerminal).toBe(TERMINAL_STATUSES.has(expectedStatus));

        // 4. stepLabel is a non-empty string
        expect(result!.stepLabel.length).toBeGreaterThan(0);

        // 5. stepStatus is a valid value
        expect(['COMPLETED', 'IN_PROGRESS', 'PENDING', 'FAILED']).toContain(result!.stepStatus);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
   *
   * For any known Yellow event name in any case variant, mapYellowEvent
   * returns the same ExecutionStatus as the canonical lowercase form.
   */
  it('mapYellowEvent handles case-insensitive event names correctly', () => {
    fc.assert(
      fc.property(arbCaseVariant(arbYellowEvent), (eventVariant) => {
        const result = mapYellowEvent(eventVariant);
        expect(result).toBeDefined();

        // Normalize to find the canonical key
        const normalized = eventVariant.trim().toLowerCase().replace(/[\s-]+/g, '_');
        const expectedStatus = EXPECTED_EVENT_MAP[normalized];
        expect(result!.executionStatus).toBe(expectedStatus);
        expect(result!.isTerminal).toBe(TERMINAL_STATUSES.has(expectedStatus));
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.6**
   *
   * For any known channel status, mapChannelStatus returns a defined
   * MappedEvent with the correct ExecutionStatus and isTerminal flag.
   */
  it('mapChannelStatus returns correct ExecutionStatus for all known statuses', () => {
    fc.assert(
      fc.property(arbChannelStatus, (status) => {
        const result = mapChannelStatus(status);

        expect(result).toBeDefined();

        const expectedStatus = EXPECTED_CHANNEL_STATUS_MAP[status];
        expect(result!.executionStatus).toBe(expectedStatus);
        expect(result!.isTerminal).toBe(TERMINAL_STATUSES.has(expectedStatus));
        expect(result!.stepLabel.length).toBeGreaterThan(0);
        expect(['COMPLETED', 'IN_PROGRESS', 'PENDING', 'FAILED']).toContain(result!.stepStatus);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.6**
   *
   * For any known channel status in any case variant, mapChannelStatus
   * returns the correct ExecutionStatus.
   */
  it('mapChannelStatus handles case-insensitive statuses correctly', () => {
    fc.assert(
      fc.property(arbCaseVariant(arbChannelStatus), (statusVariant) => {
        const result = mapChannelStatus(statusVariant);
        expect(result).toBeDefined();

        const normalized = statusVariant.trim().toLowerCase().replace(/[\s-]+/g, '_');
        // Find the canonical key by matching normalized form
        const canonicalKey = ALL_CHANNEL_STATUSES.find((k) => k.toLowerCase() === normalized);
        expect(canonicalKey).toBeDefined();
        const expectedStatus = EXPECTED_CHANNEL_STATUS_MAP[canonicalKey!];
        expect(result!.executionStatus).toBe(expectedStatus);
        expect(result!.isTerminal).toBe(TERMINAL_STATUSES.has(expectedStatus));
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.6**
   *
   * For any known state intent, mapStateIntent returns a defined
   * MappedEvent with the correct ExecutionStatus and isTerminal flag.
   */
  it('mapStateIntent returns correct ExecutionStatus for all known intents', () => {
    fc.assert(
      fc.property(arbStateIntent, (intent) => {
        const result = mapStateIntent(intent);

        expect(result).toBeDefined();

        const expectedStatus = EXPECTED_STATE_INTENT_MAP[intent];
        expect(result!.executionStatus).toBe(expectedStatus);
        expect(result!.isTerminal).toBe(TERMINAL_STATUSES.has(expectedStatus));
        expect(result!.stepLabel.length).toBeGreaterThan(0);
        expect(['COMPLETED', 'IN_PROGRESS', 'PENDING', 'FAILED']).toContain(result!.stepStatus);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.6**
   *
   * For any known state intent in any case variant, mapStateIntent
   * returns the correct ExecutionStatus.
   */
  it('mapStateIntent handles case-insensitive intents correctly', () => {
    fc.assert(
      fc.property(arbCaseVariant(arbStateIntent), (intentVariant) => {
        const result = mapStateIntent(intentVariant);
        expect(result).toBeDefined();

        const normalized = intentVariant.trim().toLowerCase().replace(/[\s-]+/g, '_');
        const canonicalKey = ALL_STATE_INTENTS.find((k) => k.toLowerCase() === normalized);
        expect(canonicalKey).toBeDefined();
        const expectedStatus = EXPECTED_STATE_INTENT_MAP[canonicalKey!];
        expect(result!.executionStatus).toBe(expectedStatus);
        expect(result!.isTerminal).toBe(TERMINAL_STATUSES.has(expectedStatus));
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
   *
   * For any unknown/random string that is not a known event, channel status,
   * or state intent, all three mapping functions return undefined.
   */
  it('unknown strings return undefined from all mapping functions', () => {
    fc.assert(
      fc.property(arbUnknownString, (unknownStr) => {
        expect(mapYellowEvent(unknownStr)).toBeUndefined();
        expect(mapChannelStatus(unknownStr)).toBeUndefined();
        expect(mapStateIntent(unknownStr)).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
   *
   * For any known event/status/intent, the isTerminal flag is consistent:
   * true if and only if the executionStatus is SETTLED, ABORTED, or EXPIRED.
   */
  it('isTerminal flag is consistent with executionStatus across all mappings', () => {
    const arbAnyKnownInput = fc.oneof(
      arbYellowEvent.map((e) => ({ type: 'event' as const, value: e })),
      arbChannelStatus.map((s) => ({ type: 'channelStatus' as const, value: s })),
      arbStateIntent.map((i) => ({ type: 'stateIntent' as const, value: i })),
    );

    fc.assert(
      fc.property(arbAnyKnownInput, ({ type, value }) => {
        let result;
        switch (type) {
          case 'event':
            result = mapYellowEvent(value);
            break;
          case 'channelStatus':
            result = mapChannelStatus(value);
            break;
          case 'stateIntent':
            result = mapStateIntent(value);
            break;
        }

        expect(result).toBeDefined();
        // isTerminal must be true iff executionStatus is in TERMINAL_STATUSES
        expect(result!.isTerminal).toBe(TERMINAL_STATUSES.has(result!.executionStatus));
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
   *
   * inferMapping prioritizes event > channelStatus > stateIntent, and for
   * any single known input, returns the correct mapping.
   */
  it('inferMapping returns correct mapping for any single known input', () => {
    const arbNotification = fc.oneof(
      arbYellowEvent.map((e) => ({
        notification: { event: e },
        expectedStatus: EXPECTED_EVENT_MAP[e],
      })),
      arbChannelStatus.map((s) => ({
        notification: { channelStatus: s },
        expectedStatus: EXPECTED_CHANNEL_STATUS_MAP[s],
      })),
      arbStateIntent.map((i) => ({
        notification: { stateIntent: i },
        expectedStatus: EXPECTED_STATE_INTENT_MAP[i],
      })),
    );

    fc.assert(
      fc.property(arbNotification, ({ notification, expectedStatus }) => {
        const result = inferMapping(notification);
        expect(result).toBeDefined();
        expect(result!.executionStatus).toBe(expectedStatus);
        expect(result!.isTerminal).toBe(TERMINAL_STATUSES.has(expectedStatus));
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
   *
   * inferMapping with all unknown fields returns undefined.
   */
  it('inferMapping returns undefined when all fields are unknown', () => {
    fc.assert(
      fc.property(arbUnknownString, arbUnknownString, arbUnknownString, (e, cs, si) => {
        const result = inferMapping({
          event: e,
          channelStatus: cs,
          stateIntent: si,
        });
        expect(result).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});
