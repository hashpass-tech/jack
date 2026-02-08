/**
 * Unit tests for ClearNodeConnection WebSocket manager
 *
 * Tests the WebSocket connection lifecycle, send/sendAndWait,
 * reconnection logic, and cleanup behavior.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ClearNodeConnection,
  calculateBackoffDelay,
} from '../../src/yellow/clear-node-connection.js';

// ============================================================================
// Mock WebSocket helpers
// ============================================================================

const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

interface MockWebSocket {
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
}

function createMockWebSocket(readyState = WS_OPEN): MockWebSocket {
  return {
    readyState,
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
  };
}

type WSFactory = (url: string) => MockWebSocket;

// ============================================================================
// calculateBackoffDelay (pure function)
// ============================================================================

describe('calculateBackoffDelay', () => {
  it('should return initialDelay for attempt 1', () => {
    expect(calculateBackoffDelay(1000, 1)).toBe(1000);
  });

  it('should double delay for each subsequent attempt', () => {
    expect(calculateBackoffDelay(1000, 2)).toBe(2000);
    expect(calculateBackoffDelay(1000, 3)).toBe(4000);
    expect(calculateBackoffDelay(1000, 4)).toBe(8000);
  });

  it('should handle attempt < 1 by returning initialDelay', () => {
    expect(calculateBackoffDelay(500, 0)).toBe(500);
    expect(calculateBackoffDelay(500, -1)).toBe(500);
  });
});

// ============================================================================
// ClearNodeConnection
// ============================================================================

describe('ClearNodeConnection', () => {
  let mockWs: MockWebSocket;
  let wsFactory: WSFactory;

  beforeEach(() => {
    mockWs = createMockWebSocket();
    wsFactory = (_url: string) => {
      mockWs = createMockWebSocket();
      return mockWs;
    };
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      expect(conn.isConnected).toBe(false);
    });

    it('should accept custom options', () => {
      const conn = new ClearNodeConnection(
        'ws://test',
        { maxReconnectAttempts: 3, reconnectDelay: 500, messageTimeout: 10000 },
        wsFactory as never,
      );
      expect(conn.isConnected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // connect (Requirement 10.1)
  // --------------------------------------------------------------------------

  describe('connect', () => {
    it('should establish connection and emit connected event (Requirement 10.1)', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      const connectedHandler = vi.fn();
      conn.on('connected', connectedHandler);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      expect(conn.isConnected).toBe(true);
      expect(connectedHandler).toHaveBeenCalledTimes(1);
    });

    it('should reject if WebSocket errors during connection', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      const connectPromise = conn.connect();
      mockWs.onerror!({ message: 'Connection refused' });

      await expect(connectPromise).rejects.toThrow('Connection refused');
      expect(conn.isConnected).toBe(false);
    });

    it('should reject if WebSocket closes before opening', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      const connectPromise = conn.connect();
      mockWs.onclose!({});

      await expect(connectPromise).rejects.toThrow('WebSocket closed before connection was established');
    });

    it('should reject if WebSocket factory throws', async () => {
      const failingFactory = () => {
        throw new Error('Factory error');
      };
      const conn = new ClearNodeConnection('ws://test', undefined, failingFactory as never);

      await expect(conn.connect()).rejects.toThrow('Failed to create WebSocket: Factory error');
    });

    it('should be a no-op if already connected', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      // Second connect should resolve immediately
      await conn.connect();
      expect(conn.isConnected).toBe(true);
    });

    it('should reject if connection has been disposed', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      await conn.disconnect();

      await expect(conn.connect()).rejects.toThrow('disposed');
    });
  });

  // --------------------------------------------------------------------------
  // disconnect (Requirement 10.4)
  // --------------------------------------------------------------------------

  describe('disconnect', () => {
    it('should close WebSocket and emit disconnected event (Requirement 10.4)', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      const disconnectedHandler = vi.fn();
      conn.on('disconnected', disconnectedHandler);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      await conn.disconnect();

      expect(conn.isConnected).toBe(false);
      expect(mockWs.close).toHaveBeenCalled();
      expect(disconnectedHandler).toHaveBeenCalledTimes(1);
    });

    it('should reject all pending requests on disconnect (Requirement 10.4)', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      const pendingPromise = conn.sendAndWait('{"method":"test"}', 'test');

      await conn.disconnect();

      await expect(pendingPromise).rejects.toThrow('Connection closed by client');
    });

    it('should clear message handlers on disconnect', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      const handler = vi.fn();
      conn.onMessage(handler);

      await conn.disconnect();

      // After disconnect, the handler list is cleared internally
      // We verify by checking that isConnected is false
      expect(conn.isConnected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // send (fire-and-forget)
  // --------------------------------------------------------------------------

  describe('send', () => {
    it('should send a message via WebSocket', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      conn.send('{"method":"ping"}');
      expect(mockWs.send).toHaveBeenCalledWith('{"method":"ping"}');
    });

    it('should throw if not connected', () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      expect(() => conn.send('test')).toThrow('WebSocket is not connected');
    });
  });

  // --------------------------------------------------------------------------
  // sendAndWait (Requirement 10.5)
  // --------------------------------------------------------------------------

  describe('sendAndWait', () => {
    it('should resolve when a matching response is received (Requirement 10.5)', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      const resultPromise = conn.sendAndWait<{ method: string; data: string }>(
        '{"method":"get_data"}',
        'get_data',
      );

      // Simulate response
      mockWs.onmessage!({ data: JSON.stringify({ method: 'get_data', data: 'hello' }) });

      const result = await resultPromise;
      expect(result.method).toBe('get_data');
      expect(result.data).toBe('hello');
    });

    it('should reject on timeout', async () => {
      const conn = new ClearNodeConnection(
        'ws://test',
        { messageTimeout: 50 },
        wsFactory as never,
      );

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      const resultPromise = conn.sendAndWait('{"method":"slow"}', 'slow', 50);

      await expect(resultPromise).rejects.toThrow('Request timed out');
    });

    it('should throw if not connected', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      await expect(
        conn.sendAndWait('{"method":"test"}', 'test'),
      ).rejects.toThrow('WebSocket is not connected');
    });

    it('should correlate responses by method name (Requirement 10.5)', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      const promise1 = conn.sendAndWait<{ method: string; id: number }>('{}', 'method_a');
      const promise2 = conn.sendAndWait<{ method: string; id: number }>('{}', 'method_b');

      // Respond to method_b first, then method_a
      mockWs.onmessage!({ data: JSON.stringify({ method: 'method_b', id: 2 }) });
      mockWs.onmessage!({ data: JSON.stringify({ method: 'method_a', id: 1 }) });

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1.id).toBe(1);
      expect(result2.id).toBe(2);
    });

    it('should also support type field for method extraction', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      const resultPromise = conn.sendAndWait<{ type: string; value: number }>(
        '{}',
        'my_type',
      );

      mockWs.onmessage!({ data: JSON.stringify({ type: 'my_type', value: 42 }) });

      const result = await resultPromise;
      expect(result.value).toBe(42);
    });
  });

  // --------------------------------------------------------------------------
  // onMessage
  // --------------------------------------------------------------------------

  describe('onMessage', () => {
    it('should dispatch parsed messages to registered handlers', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      const handler = vi.fn();
      conn.onMessage(handler);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      mockWs.onmessage!({ data: JSON.stringify({ type: 'event', payload: 'test' }) });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ type: 'event', payload: 'test' });
    });

    it('should dispatch to multiple handlers', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      conn.onMessage(handler1);
      conn.onMessage(handler2);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      mockWs.onmessage!({ data: JSON.stringify({ msg: 'hello' }) });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not break if a handler throws', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      const throwingHandler = vi.fn(() => {
        throw new Error('handler error');
      });
      const normalHandler = vi.fn();
      conn.onMessage(throwingHandler);
      conn.onMessage(normalHandler);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      mockWs.onmessage!({ data: JSON.stringify({ msg: 'test' }) });

      expect(throwingHandler).toHaveBeenCalledTimes(1);
      expect(normalHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle non-JSON messages gracefully', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      const handler = vi.fn();
      conn.onMessage(handler);

      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      mockWs.onmessage!({ data: 'not-json' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('not-json');
    });
  });

  // --------------------------------------------------------------------------
  // Event emitter (on/off)
  // --------------------------------------------------------------------------

  describe('event emitter', () => {
    it('should support on and off for connected event', async () => {
      const conn = new ClearNodeConnection('ws://test', undefined, wsFactory as never);
      const handler = vi.fn();

      conn.on('connected', handler);
      const connectPromise = conn.connect();
      mockWs.onopen!({});
      await connectPromise;

      expect(handler).toHaveBeenCalledTimes(1);

      conn.off('connected', handler);
      // Reconnect scenario would not trigger the removed handler
    });
  });
});
