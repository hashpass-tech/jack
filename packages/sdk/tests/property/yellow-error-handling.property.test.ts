/**
 * Property-based tests for Error Reason Code Mapping
 *
 * Feature: yellow-network-integration
 * Property 16: Error reason codes are correctly mapped
 *
 * For any Yellow Network operation failure, the returned fallback reason code
 * matches the error type: WebSocket errors produce "YELLOW_UNAVAILABLE",
 * on-chain reverts produce "YELLOW_TX_FAILED" with a non-empty revert reason,
 * and timeouts produce "YELLOW_TIMEOUT".
 *
 * Tests the centralized mapErrorToReasonCode and extractRevertReason functions
 * from YellowProvider.
 *
 * Validates: Requirements 13.1, 13.2, 13.4
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import {
  mapErrorToReasonCode,
  extractRevertReason,
} from '../../src/yellow/yellow-provider.js';

// ============================================================================
// Generators
// ============================================================================

/**
 * Generates WebSocket-related error messages that should map to YELLOW_UNAVAILABLE.
 * Requirement 13.1: WebSocket errors → YELLOW_UNAVAILABLE
 */
const arbWebSocketError = fc.oneof(
  fc.constant('WebSocket connection failed'),
  fc.constant('WebSocket is not connected'),
  fc.constant('Connection refused'),
  fc.constant('Connection closed by client'),
  fc.constant('All reconnection attempts exhausted'),
  fc.constant('ClearNode is not available'),
  fc.constant('WebSocket error: ECONNREFUSED'),
  fc.constant('Socket hang up'),
  fc.constant('Not connected to ClearNode'),
  fc.constant('Connection dropped unexpectedly'),
  fc.constant('WebSocket closed before connection was established'),
  fc.constant('Failed to create WebSocket: unavailable'),
  fc.constant('disconnected from server'),
);

/**
 * Generates on-chain transaction revert error messages that should map to YELLOW_TX_FAILED.
 * Requirement 13.2: On-chain reverts → YELLOW_TX_FAILED
 */
const arbTxRevertError = fc.oneof(
  fc.constant('execution reverted: insufficient funds'),
  fc.constant('Transaction failed on-chain'),
  fc.constant('tx failed: out of gas'),
  fc.constant('execution reverted: ERC20: transfer amount exceeds balance'),
  fc.constant('revert: channel already exists'),
  fc.constant('On-chain transaction reverted'),
  fc.constant('contract call failed'),
  fc.constant('reverted with reason: invalid state'),
);

/**
 * Generates timeout error messages that should map to YELLOW_TIMEOUT.
 * Requirement 13.4: Timeouts → YELLOW_TIMEOUT
 */
const arbTimeoutError = fc.oneof(
  fc.constant('Request timed out waiting for response to method: create_channel'),
  fc.constant('Request timed out waiting for response to method: resize_channel'),
  fc.constant('Request timed out waiting for response to method: close_channel'),
  fc.constant('Request timed out waiting for response to method: transfer'),
  fc.constant('Request timed out waiting for response to method: submit_intent'),
  fc.constant('Operation timeout exceeded'),
  fc.constant('Timed out waiting for ClearNode response'),
  fc.constant('Message timed_out'),
);

/**
 * Generates authentication failure error messages that should map to YELLOW_AUTH_FAILED.
 * Requirement 13.3: Auth failures → YELLOW_AUTH_FAILED
 */
const arbAuthError = fc.oneof(
  fc.constant('Authentication failed: could not receive auth_challenge'),
  fc.constant('Authentication failed: EIP-712 signing error'),
  fc.constant('Authentication failed: ClearNode rejected the auth_verify request'),
  fc.constant('Unauthorized access'),
  fc.constant('Session expired'),
  fc.constant('Session invalid'),
  fc.constant('auth_request rejected by server'),
);

/**
 * Generates revert error messages with extractable revert reasons.
 */
const arbRevertWithReason = fc.oneof(
  fc.constant({ message: 'execution reverted: insufficient funds', expectedReason: 'insufficient funds' }),
  fc.constant({ message: 'execution reverted: ERC20: transfer amount exceeds balance', expectedReason: 'ERC20: transfer amount exceeds balance' }),
  fc.constant({ message: 'reverted with reason: invalid state', expectedReason: 'invalid state' }),
  fc.constant({ message: 'revert: channel already exists', expectedReason: 'channel already exists' }),
);

// ============================================================================
// Property 16: Error reason codes are correctly mapped
// ============================================================================

describe('Feature: yellow-network-integration, Property 16: Error reason codes are correctly mapped', () => {
  /**
   * **Validates: Requirements 13.1**
   *
   * For any WebSocket-related error, mapErrorToReasonCode returns YELLOW_UNAVAILABLE.
   */
  it('WebSocket errors map to YELLOW_UNAVAILABLE', () => {
    fc.assert(
      fc.property(arbWebSocketError, (errorMessage) => {
        const error = new Error(errorMessage);
        const reasonCode = mapErrorToReasonCode(error);
        expect(reasonCode).toBe('YELLOW_UNAVAILABLE');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 13.2**
   *
   * For any on-chain transaction revert error, mapErrorToReasonCode returns YELLOW_TX_FAILED.
   */
  it('on-chain transaction reverts map to YELLOW_TX_FAILED', () => {
    fc.assert(
      fc.property(arbTxRevertError, (errorMessage) => {
        const error = new Error(errorMessage);
        const reasonCode = mapErrorToReasonCode(error);
        expect(reasonCode).toBe('YELLOW_TX_FAILED');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 13.4**
   *
   * For any timeout error, mapErrorToReasonCode returns YELLOW_TIMEOUT.
   */
  it('timeout errors map to YELLOW_TIMEOUT', () => {
    fc.assert(
      fc.property(arbTimeoutError, (errorMessage) => {
        const error = new Error(errorMessage);
        const reasonCode = mapErrorToReasonCode(error);
        expect(reasonCode).toBe('YELLOW_TIMEOUT');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 13.3**
   *
   * For any authentication failure error, mapErrorToReasonCode returns YELLOW_AUTH_FAILED.
   */
  it('authentication failures map to YELLOW_AUTH_FAILED', () => {
    fc.assert(
      fc.property(arbAuthError, (errorMessage) => {
        const error = new Error(errorMessage);
        const reasonCode = mapErrorToReasonCode(error);
        expect(reasonCode).toBe('YELLOW_AUTH_FAILED');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 13.1, 13.2, 13.4**
   *
   * For any error type, mapErrorToReasonCode always returns a valid YellowReasonCode.
   */
  it('mapErrorToReasonCode always returns a valid YellowReasonCode', () => {
    const validReasonCodes = new Set([
      'MISSING_PARAMS',
      'UNSUPPORTED_CHAIN',
      'INSUFFICIENT_BALANCE',
      'INSUFFICIENT_CHANNEL_BALANCE',
      'NO_SOLVER_QUOTES',
      'YELLOW_UNAVAILABLE',
      'YELLOW_TX_FAILED',
      'YELLOW_AUTH_FAILED',
      'YELLOW_TIMEOUT',
      'YELLOW_CHANNEL_DISPUTE',
      'YELLOW_WS_ERROR',
    ]);

    fc.assert(
      fc.property(fc.string(), (errorMessage) => {
        const error = new Error(errorMessage);
        const reasonCode = mapErrorToReasonCode(error);
        expect(validReasonCodes.has(reasonCode)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 13.1, 13.2, 13.4**
   *
   * mapErrorToReasonCode works with both Error objects and plain strings.
   */
  it('mapErrorToReasonCode handles both Error objects and strings', () => {
    fc.assert(
      fc.property(
        fc.oneof(arbWebSocketError, arbTxRevertError, arbTimeoutError, arbAuthError),
        (errorMessage) => {
          const fromError = mapErrorToReasonCode(new Error(errorMessage));
          const fromString = mapErrorToReasonCode(errorMessage);
          expect(fromError).toBe(fromString);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 13.2**
   *
   * For on-chain revert errors with extractable reasons, extractRevertReason
   * returns a non-empty string.
   */
  it('extractRevertReason extracts non-empty reason from revert errors', () => {
    fc.assert(
      fc.property(arbRevertWithReason, ({ message, expectedReason }) => {
        const error = new Error(message);
        const reason = extractRevertReason(error);
        expect(reason).toBeDefined();
        expect(reason).toBe(expectedReason);
        expect(reason!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 13.2**
   *
   * extractRevertReason returns undefined for non-revert errors.
   */
  it('extractRevertReason returns undefined for non-revert errors', () => {
    fc.assert(
      fc.property(
        fc.oneof(arbWebSocketError, arbTimeoutError, arbAuthError),
        (errorMessage) => {
          const error = new Error(errorMessage);
          const reason = extractRevertReason(error);
          expect(reason).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Security: ReDoS Protection**
   *
   * Verifies that extractRevertReason handles malicious inputs with many spaces
   * without catastrophic backtracking (ReDoS vulnerability).
   */
  it('extractRevertReason handles strings with many spaces efficiently', () => {
    // Test with pathological input that would cause ReDoS with vulnerable regex
    const manySpaces = ' '.repeat(1000);
    const maliciousInput1 = `execution reverted:${manySpaces}`;
    const maliciousInput2 = `execution reverted:${manySpaces}reason`;
    
    const startTime1 = Date.now();
    const result1 = extractRevertReason(new Error(maliciousInput1));
    const duration1 = Date.now() - startTime1;
    
    const startTime2 = Date.now();
    const result2 = extractRevertReason(new Error(maliciousInput2));
    const duration2 = Date.now() - startTime2;
    
    // Should complete in under 100ms (vulnerable regex could take seconds)
    expect(duration1).toBeLessThan(100);
    expect(duration2).toBeLessThan(100);
    
    // Should still extract reason correctly
    expect(result1).toBe(''); // Spaces get trimmed to empty string
    expect(result2).toBeDefined();
    expect(result2).toContain('reason');
  });

  /**
   * **Security: ReDoS Protection**
   *
   * Verifies extractRevertReason handles edge case with spaces before reason.
   */
  it('extractRevertReason handles spaces before reason correctly', () => {
    const testCases = [
      { input: 'execution reverted: reason', expected: 'reason' },
      { input: 'execution reverted:reason', expected: 'reason' },
      { input: 'execution reverted:  reason', expected: 'reason' }, // extra space trimmed
      { input: 'revert: reason', expected: 'reason' },
      { input: 'reverted with reason: reason', expected: 'reason' },
    ];
    
    testCases.forEach(({ input, expected }) => {
      const result = extractRevertReason(new Error(input));
      expect(result).toBe(expected);
    });
  });
});
