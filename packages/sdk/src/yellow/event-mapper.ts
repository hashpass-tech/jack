/**
 * Yellow Network Event-to-Status Mapper
 *
 * Maps Yellow Network events, channel statuses, and state intents to JACK
 * ExecutionStatus values. These are pure functions with no side effects,
 * extracted from the dashboard's route.ts mapping tables into SDK-level
 * reusable functions.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { ExecutionStatus } from '../types.js';

/**
 * Represents a mapped Yellow Network event with its corresponding JACK
 * execution status, step label, step status, and terminal flag.
 */
export interface MappedEvent {
  executionStatus: ExecutionStatus;
  stepLabel: string;
  stepStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
  isTerminal: boolean;
}

// ============================================================================
// Terminal statuses — only SETTLED, ABORTED, and EXPIRED are terminal
// ============================================================================

const TERMINAL_STATUSES: ReadonlySet<ExecutionStatus> = new Set([
  ExecutionStatus.SETTLED,
  ExecutionStatus.ABORTED,
  ExecutionStatus.EXPIRED,
]);

// ============================================================================
// Yellow Event Mapping Table
// ============================================================================

const EVENT_STATUS_MAP: Readonly<Record<string, MappedEvent>> = {
  quote_accepted: {
    executionStatus: ExecutionStatus.QUOTED,
    stepLabel: 'Solver Quote Accepted (Yellow Network)',
    stepStatus: 'COMPLETED',
    isTerminal: false,
  },
  solver_quoted: {
    executionStatus: ExecutionStatus.QUOTED,
    stepLabel: 'Solver Quote Received (Yellow Network)',
    stepStatus: 'COMPLETED',
    isTerminal: false,
  },
  execution_started: {
    executionStatus: ExecutionStatus.EXECUTING,
    stepLabel: 'Execution Started (Yellow Network)',
    stepStatus: 'IN_PROGRESS',
    isTerminal: false,
  },
  routing_started: {
    executionStatus: ExecutionStatus.EXECUTING,
    stepLabel: 'Cross-Chain Routing Started (Yellow Network)',
    stepStatus: 'IN_PROGRESS',
    isTerminal: false,
  },
  settlement_submitted: {
    executionStatus: ExecutionStatus.SETTLING,
    stepLabel: 'Settlement Submitted (Yellow Network)',
    stepStatus: 'IN_PROGRESS',
    isTerminal: false,
  },
  settled: {
    executionStatus: ExecutionStatus.SETTLED,
    stepLabel: 'Settlement Finalized (Yellow Network)',
    stepStatus: 'COMPLETED',
    isTerminal: true,
  },
  settlement_finalized: {
    executionStatus: ExecutionStatus.SETTLED,
    stepLabel: 'Settlement Finalized (Yellow Network)',
    stepStatus: 'COMPLETED',
    isTerminal: true,
  },
  failed: {
    executionStatus: ExecutionStatus.ABORTED,
    stepLabel: 'Execution Failed (Yellow Network)',
    stepStatus: 'FAILED',
    isTerminal: true,
  },
  execution_failed: {
    executionStatus: ExecutionStatus.ABORTED,
    stepLabel: 'Execution Failed (Yellow Network)',
    stepStatus: 'FAILED',
    isTerminal: true,
  },
  settlement_failed: {
    executionStatus: ExecutionStatus.ABORTED,
    stepLabel: 'Settlement Failed (Yellow Network)',
    stepStatus: 'FAILED',
    isTerminal: true,
  },
  expired: {
    executionStatus: ExecutionStatus.EXPIRED,
    stepLabel: 'Intent Expired (Yellow Network)',
    stepStatus: 'FAILED',
    isTerminal: true,
  },
  canceled: {
    executionStatus: ExecutionStatus.ABORTED,
    stepLabel: 'Intent Canceled (Yellow Network)',
    stepStatus: 'FAILED',
    isTerminal: true,
  },
};

// ============================================================================
// Channel Status Mapping Table
// ============================================================================

const CHANNEL_STATUS_MAP: Readonly<Record<string, MappedEvent>> = {
  void: {
    executionStatus: ExecutionStatus.CREATED,
    stepLabel: 'Channel Status: VOID (ERC-7824)',
    stepStatus: 'COMPLETED',
    isTerminal: false,
  },
  initial: {
    executionStatus: ExecutionStatus.QUOTED,
    stepLabel: 'Channel Status: INITIAL (ERC-7824)',
    stepStatus: 'IN_PROGRESS',
    isTerminal: false,
  },
  active: {
    executionStatus: ExecutionStatus.EXECUTING,
    stepLabel: 'Channel Status: ACTIVE (ERC-7824)',
    stepStatus: 'IN_PROGRESS',
    isTerminal: false,
  },
  dispute: {
    executionStatus: ExecutionStatus.EXECUTING,
    stepLabel: 'Channel Status: DISPUTE (ERC-7824)',
    stepStatus: 'IN_PROGRESS',
    isTerminal: false,
  },
  final: {
    executionStatus: ExecutionStatus.SETTLED,
    stepLabel: 'Channel Status: FINAL (ERC-7824)',
    stepStatus: 'COMPLETED',
    isTerminal: true,
  },
};

// ============================================================================
// State Intent Mapping Table
// ============================================================================

const STATE_INTENT_MAP: Readonly<Record<string, MappedEvent>> = {
  initialize: {
    executionStatus: ExecutionStatus.QUOTED,
    stepLabel: 'State Intent: INITIALIZE (ERC-7824)',
    stepStatus: 'IN_PROGRESS',
    isTerminal: false,
  },
  operate: {
    executionStatus: ExecutionStatus.EXECUTING,
    stepLabel: 'State Intent: OPERATE (ERC-7824)',
    stepStatus: 'IN_PROGRESS',
    isTerminal: false,
  },
  resize: {
    executionStatus: ExecutionStatus.EXECUTING,
    stepLabel: 'State Intent: RESIZE (ERC-7824)',
    stepStatus: 'COMPLETED',
    isTerminal: false,
  },
  finalize: {
    executionStatus: ExecutionStatus.SETTLED,
    stepLabel: 'State Intent: FINALIZE (ERC-7824)',
    stepStatus: 'COMPLETED',
    isTerminal: true,
  },
};

// ============================================================================
// Normalization Helper
// ============================================================================

/**
 * Normalizes an event/status/intent string to lowercase with underscores.
 * Trims whitespace and replaces spaces and hyphens with underscores.
 */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

// ============================================================================
// Public Mapping Functions
// ============================================================================

/**
 * Map a Yellow Network event name to a JACK MappedEvent.
 *
 * Accepts event names in any casing; normalizes to lowercase with underscores.
 * Returns undefined for unknown events.
 *
 * @param event - The Yellow Network event name (e.g., "quote_accepted", "settled")
 * @returns The corresponding MappedEvent, or undefined if the event is unknown
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function mapYellowEvent(event: string): MappedEvent | undefined {
  const key = normalizeKey(event);
  return EVENT_STATUS_MAP[key];
}

/**
 * Map a channel status to a JACK MappedEvent.
 *
 * Accepts channel statuses in any casing (e.g., "ACTIVE", "active", "Active").
 * Returns undefined for unknown statuses.
 *
 * @param status - The ERC-7824 channel status (e.g., "VOID", "ACTIVE", "FINAL")
 * @returns The corresponding MappedEvent, or undefined if the status is unknown
 *
 * Requirement: 9.6
 */
export function mapChannelStatus(status: string): MappedEvent | undefined {
  const key = normalizeKey(status);
  return CHANNEL_STATUS_MAP[key];
}

/**
 * Map a state intent to a JACK MappedEvent.
 *
 * Accepts state intents in any casing (e.g., "FINALIZE", "finalize", "Finalize").
 * Returns undefined for unknown intents.
 *
 * @param intent - The ERC-7824 state intent (e.g., "INITIALIZE", "OPERATE", "FINALIZE")
 * @returns The corresponding MappedEvent, or undefined if the intent is unknown
 *
 * Requirement: 9.6
 */
export function mapStateIntent(intent: string): MappedEvent | undefined {
  const key = normalizeKey(intent);
  return STATE_INTENT_MAP[key];
}

/**
 * Infer the best mapping from a notification payload.
 *
 * Checks fields in priority order: event → channelStatus → stateIntent.
 * Returns the first successful mapping, or undefined if no field matches.
 *
 * @param notification - An object with optional event, channelStatus, and stateIntent fields
 * @returns The best matching MappedEvent, or undefined if no mapping is found
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export function inferMapping(notification: {
  event?: string;
  channelStatus?: string;
  stateIntent?: string;
}): MappedEvent | undefined {
  if (notification.event) {
    const mapped = mapYellowEvent(notification.event);
    if (mapped) return mapped;
  }

  if (notification.channelStatus) {
    const mapped = mapChannelStatus(notification.channelStatus);
    if (mapped) return mapped;
  }

  if (notification.stateIntent) {
    const mapped = mapStateIntent(notification.stateIntent);
    if (mapped) return mapped;
  }

  return undefined;
}
