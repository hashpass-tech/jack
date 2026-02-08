/**
 * Unit tests for Yellow Network Event-to-Status Mapper
 *
 * Tests the pure mapping functions that convert Yellow Network events,
 * channel statuses, and state intents to JACK ExecutionStatus values.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { describe, it, expect } from 'vitest';
import { ExecutionStatus } from '../../src/types';
import {
  mapYellowEvent,
  mapChannelStatus,
  mapStateIntent,
  inferMapping,
  type MappedEvent,
} from '../../src/yellow/event-mapper';

// ============================================================================
// mapYellowEvent
// ============================================================================

describe('mapYellowEvent', () => {
  describe('QUOTED events (Requirement 9.1)', () => {
    it('should map quote_accepted to QUOTED with COMPLETED step', () => {
      const result = mapYellowEvent('quote_accepted');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.QUOTED);
      expect(result!.stepStatus).toBe('COMPLETED');
      expect(result!.isTerminal).toBe(false);
    });

    it('should map solver_quoted to QUOTED with COMPLETED step', () => {
      const result = mapYellowEvent('solver_quoted');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.QUOTED);
      expect(result!.stepStatus).toBe('COMPLETED');
      expect(result!.isTerminal).toBe(false);
    });
  });

  describe('EXECUTING events (Requirement 9.2)', () => {
    it('should map execution_started to EXECUTING with IN_PROGRESS step', () => {
      const result = mapYellowEvent('execution_started');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
      expect(result!.stepStatus).toBe('IN_PROGRESS');
      expect(result!.isTerminal).toBe(false);
    });

    it('should map routing_started to EXECUTING with IN_PROGRESS step', () => {
      const result = mapYellowEvent('routing_started');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
      expect(result!.stepStatus).toBe('IN_PROGRESS');
      expect(result!.isTerminal).toBe(false);
    });
  });

  describe('SETTLING events (Requirement 9.3)', () => {
    it('should map settlement_submitted to SETTLING with IN_PROGRESS step', () => {
      const result = mapYellowEvent('settlement_submitted');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.SETTLING);
      expect(result!.stepStatus).toBe('IN_PROGRESS');
      expect(result!.isTerminal).toBe(false);
    });
  });

  describe('SETTLED events (Requirement 9.4)', () => {
    it('should map settled to SETTLED with COMPLETED step and terminal', () => {
      const result = mapYellowEvent('settled');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
      expect(result!.stepStatus).toBe('COMPLETED');
      expect(result!.isTerminal).toBe(true);
    });

    it('should map settlement_finalized to SETTLED with COMPLETED step and terminal', () => {
      const result = mapYellowEvent('settlement_finalized');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
      expect(result!.stepStatus).toBe('COMPLETED');
      expect(result!.isTerminal).toBe(true);
    });
  });

  describe('Terminal failure events (Requirement 9.5)', () => {
    it('should map failed to ABORTED with FAILED step and terminal', () => {
      const result = mapYellowEvent('failed');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.ABORTED);
      expect(result!.stepStatus).toBe('FAILED');
      expect(result!.isTerminal).toBe(true);
    });

    it('should map execution_failed to ABORTED with FAILED step and terminal', () => {
      const result = mapYellowEvent('execution_failed');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.ABORTED);
      expect(result!.stepStatus).toBe('FAILED');
      expect(result!.isTerminal).toBe(true);
    });

    it('should map settlement_failed to ABORTED with FAILED step and terminal', () => {
      const result = mapYellowEvent('settlement_failed');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.ABORTED);
      expect(result!.stepStatus).toBe('FAILED');
      expect(result!.isTerminal).toBe(true);
    });

    it('should map expired to EXPIRED with FAILED step and terminal', () => {
      const result = mapYellowEvent('expired');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.EXPIRED);
      expect(result!.stepStatus).toBe('FAILED');
      expect(result!.isTerminal).toBe(true);
    });

    it('should map canceled to ABORTED with FAILED step and terminal', () => {
      const result = mapYellowEvent('canceled');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.ABORTED);
      expect(result!.stepStatus).toBe('FAILED');
      expect(result!.isTerminal).toBe(true);
    });
  });

  describe('Case normalization', () => {
    it('should handle uppercase event names', () => {
      const result = mapYellowEvent('SETTLED');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
    });

    it('should handle mixed case event names', () => {
      const result = mapYellowEvent('Quote_Accepted');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.QUOTED);
    });

    it('should handle events with leading/trailing whitespace', () => {
      const result = mapYellowEvent('  settled  ');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
    });

    it('should handle events with hyphens instead of underscores', () => {
      const result = mapYellowEvent('execution-started');
      expect(result).toBeDefined();
      expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
    });
  });

  describe('Unknown events', () => {
    it('should return undefined for unknown events', () => {
      expect(mapYellowEvent('unknown_event')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(mapYellowEvent('')).toBeUndefined();
    });
  });

  describe('Step labels', () => {
    it('should include descriptive step labels', () => {
      const result = mapYellowEvent('quote_accepted');
      expect(result!.stepLabel).toContain('Yellow Network');
    });
  });
});

// ============================================================================
// mapChannelStatus
// ============================================================================

describe('mapChannelStatus', () => {
  it('should map VOID to CREATED with COMPLETED step', () => {
    const result = mapChannelStatus('VOID');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.CREATED);
    expect(result!.stepStatus).toBe('COMPLETED');
    expect(result!.isTerminal).toBe(false);
  });

  it('should map INITIAL to QUOTED with IN_PROGRESS step', () => {
    const result = mapChannelStatus('INITIAL');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.QUOTED);
    expect(result!.stepStatus).toBe('IN_PROGRESS');
    expect(result!.isTerminal).toBe(false);
  });

  it('should map ACTIVE to EXECUTING with IN_PROGRESS step', () => {
    const result = mapChannelStatus('ACTIVE');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
    expect(result!.stepStatus).toBe('IN_PROGRESS');
    expect(result!.isTerminal).toBe(false);
  });

  it('should map DISPUTE to EXECUTING with IN_PROGRESS step', () => {
    const result = mapChannelStatus('DISPUTE');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
    expect(result!.stepStatus).toBe('IN_PROGRESS');
    expect(result!.isTerminal).toBe(false);
  });

  it('should map FINAL to SETTLED with COMPLETED step and terminal', () => {
    const result = mapChannelStatus('FINAL');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
    expect(result!.stepStatus).toBe('COMPLETED');
    expect(result!.isTerminal).toBe(true);
  });

  it('should handle lowercase channel statuses', () => {
    const result = mapChannelStatus('active');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
  });

  it('should return undefined for unknown channel statuses', () => {
    expect(mapChannelStatus('UNKNOWN')).toBeUndefined();
  });

  it('should include ERC-7824 in step labels', () => {
    const result = mapChannelStatus('ACTIVE');
    expect(result!.stepLabel).toContain('ERC-7824');
  });
});

// ============================================================================
// mapStateIntent
// ============================================================================

describe('mapStateIntent', () => {
  it('should map INITIALIZE to QUOTED with IN_PROGRESS step', () => {
    const result = mapStateIntent('INITIALIZE');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.QUOTED);
    expect(result!.stepStatus).toBe('IN_PROGRESS');
    expect(result!.isTerminal).toBe(false);
  });

  it('should map OPERATE to EXECUTING with IN_PROGRESS step', () => {
    const result = mapStateIntent('OPERATE');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
    expect(result!.stepStatus).toBe('IN_PROGRESS');
    expect(result!.isTerminal).toBe(false);
  });

  it('should map RESIZE to EXECUTING with COMPLETED step', () => {
    const result = mapStateIntent('RESIZE');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
    expect(result!.stepStatus).toBe('COMPLETED');
    expect(result!.isTerminal).toBe(false);
  });

  it('should map FINALIZE to SETTLED with COMPLETED step and terminal', () => {
    const result = mapStateIntent('FINALIZE');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
    expect(result!.stepStatus).toBe('COMPLETED');
    expect(result!.isTerminal).toBe(true);
  });

  it('should handle lowercase state intents', () => {
    const result = mapStateIntent('finalize');
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
  });

  it('should return undefined for unknown state intents', () => {
    expect(mapStateIntent('UNKNOWN')).toBeUndefined();
  });

  it('should include ERC-7824 in step labels', () => {
    const result = mapStateIntent('OPERATE');
    expect(result!.stepLabel).toContain('ERC-7824');
  });
});

// ============================================================================
// inferMapping
// ============================================================================

describe('inferMapping', () => {
  it('should prioritize event over channelStatus and stateIntent', () => {
    const result = inferMapping({
      event: 'settled',
      channelStatus: 'ACTIVE',
      stateIntent: 'OPERATE',
    });
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
  });

  it('should fall back to channelStatus when event is missing', () => {
    const result = inferMapping({
      channelStatus: 'FINAL',
      stateIntent: 'OPERATE',
    });
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
  });

  it('should fall back to stateIntent when event and channelStatus are missing', () => {
    const result = inferMapping({
      stateIntent: 'FINALIZE',
    });
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.SETTLED);
  });

  it('should fall back to channelStatus when event is unknown', () => {
    const result = inferMapping({
      event: 'unknown_event',
      channelStatus: 'ACTIVE',
    });
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
  });

  it('should fall back to stateIntent when event and channelStatus are unknown', () => {
    const result = inferMapping({
      event: 'unknown_event',
      channelStatus: 'UNKNOWN',
      stateIntent: 'OPERATE',
    });
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
  });

  it('should return undefined when all fields are missing', () => {
    expect(inferMapping({})).toBeUndefined();
  });

  it('should return undefined when all fields are unknown', () => {
    expect(
      inferMapping({
        event: 'unknown',
        channelStatus: 'UNKNOWN',
        stateIntent: 'UNKNOWN',
      })
    ).toBeUndefined();
  });

  it('should handle notification with only event', () => {
    const result = inferMapping({ event: 'execution_started' });
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.EXECUTING);
    expect(result!.stepStatus).toBe('IN_PROGRESS');
  });

  it('should handle notification with only channelStatus', () => {
    const result = inferMapping({ channelStatus: 'VOID' });
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.CREATED);
  });

  it('should handle notification with only stateIntent', () => {
    const result = inferMapping({ stateIntent: 'INITIALIZE' });
    expect(result).toBeDefined();
    expect(result!.executionStatus).toBe(ExecutionStatus.QUOTED);
  });
});

// ============================================================================
// isTerminal flag correctness
// ============================================================================

describe('isTerminal flag', () => {
  const terminalEvents = ['settled', 'settlement_finalized', 'failed', 'execution_failed', 'settlement_failed', 'expired', 'canceled'];
  const nonTerminalEvents = ['quote_accepted', 'solver_quoted', 'execution_started', 'routing_started', 'settlement_submitted'];

  it.each(terminalEvents)('should mark %s as terminal', (event) => {
    const result = mapYellowEvent(event);
    expect(result).toBeDefined();
    expect(result!.isTerminal).toBe(true);
  });

  it.each(nonTerminalEvents)('should mark %s as non-terminal', (event) => {
    const result = mapYellowEvent(event);
    expect(result).toBeDefined();
    expect(result!.isTerminal).toBe(false);
  });

  it('should mark FINAL channel status as terminal', () => {
    expect(mapChannelStatus('FINAL')!.isTerminal).toBe(true);
  });

  it.each(['VOID', 'INITIAL', 'ACTIVE', 'DISPUTE'])('should mark %s channel status as non-terminal', (status) => {
    expect(mapChannelStatus(status)!.isTerminal).toBe(false);
  });

  it('should mark FINALIZE state intent as terminal', () => {
    expect(mapStateIntent('FINALIZE')!.isTerminal).toBe(true);
  });

  it.each(['INITIALIZE', 'OPERATE', 'RESIZE'])('should mark %s state intent as non-terminal', (intent) => {
    expect(mapStateIntent(intent)!.isTerminal).toBe(false);
  });
});
