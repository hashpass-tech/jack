/**
 * ClearNode WebSocket Connection Manager
 *
 * Manages the WebSocket connection to Yellow Network's ClearNode relay server
 * with reconnection logic, request-response correlation, and event emission.
 *
 * Key features:
 * - Exponential backoff reconnection: delay = initialDelay * 2^(attempt-1)
 * - Request-response correlation using method name matching
 * - EventEmitter pattern for connected/disconnected events
 * - Cleanup of all pending handlers on disconnect
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { EventEmitter } from 'events';

/**
 * Configuration options for the ClearNodeConnection.
 */
export interface ConnectionOptions {
  /** Maximum number of reconnection attempts before giving up. Default: 5 */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in milliseconds. Default: 1000 */
  reconnectDelay?: number;
  /** Timeout for sendAndWait responses in milliseconds. Default: 30000 */
  messageTimeout?: number;
}

/**
 * Minimal WebSocket interface used internally.
 *
 * Compatible with both the Node.js global WebSocket (Node 22+) and the `ws` package.
 * This abstraction avoids a hard dependency on `@types/ws` while remaining type-safe.
 */
interface IWebSocket {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
}

/** WebSocket readyState constants */
const WS_OPEN = 1;
const WS_CONNECTING = 0;

/**
 * Factory type for creating WebSocket instances.
 * Defaults to the global WebSocket constructor.
 * Can be overridden for testing.
 */
type WebSocketFactory = (url: string) => IWebSocket;

/**
 * Represents a pending request waiting for a response via method name correlation.
 */
interface PendingRequest {
  method: string;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Calculate the exponential backoff delay for a given reconnection attempt.
 *
 * Formula: delay = initialDelay * 2^(attempt - 1)
 *
 * This is exported as a pure function so it can be independently tested
 * (including via property-based tests).
 *
 * @param initialDelay - The base delay in milliseconds
 * @param attempt - The attempt number (1-based)
 * @returns The delay in milliseconds before the given attempt
 */
export function calculateBackoffDelay(initialDelay: number, attempt: number): number {
  if (attempt < 1) {
    return initialDelay;
  }
  return initialDelay * Math.pow(2, attempt - 1);
}

/**
 * Manages a WebSocket connection to Yellow Network's ClearNode.
 *
 * Provides:
 * - connect/disconnect lifecycle management
 * - send (fire-and-forget) and sendAndWait (request-response correlation)
 * - Automatic reconnection with exponential backoff
 * - Event emission for 'connected' and 'disconnected' events
 * - Cleanup of pending handlers on disconnect
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export class ClearNodeConnection {
  private readonly url: string;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;
  private readonly messageTimeout: number;
  private readonly wsFactory: WebSocketFactory;

  private ws: IWebSocket | null = null;
  private emitter: EventEmitter = new EventEmitter();
  private pendingRequests: PendingRequest[] = [];
  private messageHandlers: Array<(data: unknown) => void> = [];
  private _isConnected: boolean = false;
  private _isDisposed: boolean = false;
  private reconnectAttempt: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param url - The ClearNode WebSocket URL
   * @param options - Connection configuration options
   * @param wsFactory - Optional WebSocket factory for testing. Defaults to global WebSocket.
   */
  constructor(url: string, options?: ConnectionOptions, wsFactory?: WebSocketFactory) {
    this.url = url;
    this.maxReconnectAttempts = options?.maxReconnectAttempts ?? 5;
    this.reconnectDelay = options?.reconnectDelay ?? 1000;
    this.messageTimeout = options?.messageTimeout ?? 30000;
    this.wsFactory = wsFactory ?? ((wsUrl: string) => new WebSocket(wsUrl) as unknown as IWebSocket);
  }

  /**
   * Establish a WebSocket connection to ClearNode.
   *
   * Resolves when the connection is open and ready.
   * Rejects if the connection fails to establish.
   *
   * Requirement 10.1: Emit a connected event on successful connection.
   */
  async connect(): Promise<void> {
    if (this._isDisposed) {
      throw new Error('ClearNodeConnection has been disposed');
    }

    if (this._isConnected && this.ws) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      try {
        this.ws = this.wsFactory(this.url);
      } catch (err) {
        reject(new Error(`Failed to create WebSocket: ${err instanceof Error ? err.message : String(err)}`));
        return;
      }

      this.ws.onopen = () => {
        if (settled) return;
        settled = true;
        this._isConnected = true;
        this.reconnectAttempt = 0;
        this.emitter.emit('connected');
        resolve();
      };

      this.ws.onerror = (event: unknown) => {
        if (settled) return;
        settled = true;
        const errorMessage =
          event && typeof event === 'object' && 'message' in event
            ? String((event as { message: unknown }).message)
            : 'WebSocket connection failed';
        reject(new Error(errorMessage));
      };

      this.ws.onclose = () => {
        if (!settled) {
          settled = true;
          reject(new Error('WebSocket closed before connection was established'));
          return;
        }
        this.handleDisconnect();
      };

      this.ws.onmessage = (event: { data: unknown }) => {
        this.handleMessage(event.data);
      };
    });
  }

  /**
   * Close the WebSocket connection and clean up all resources.
   *
   * Requirement 10.4: Clean up all pending message handlers on disconnect.
   */
  async disconnect(): Promise<void> {
    this._isDisposed = true;
    this.cancelReconnect();
    this.cleanupPendingRequests(new Error('Connection closed by client'));
    this.messageHandlers = [];

    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      this._isConnected = false;

      // Remove handlers to prevent reconnection attempts
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;

      // Only close if not already closed/closing
      if (ws.readyState === WS_OPEN || ws.readyState === WS_CONNECTING) {
        ws.close();
      }

      this.emitter.emit('disconnected');
    }

    this._isConnected = false;
  }

  /**
   * Send a message and wait for a correlated response.
   *
   * The response is matched by method name: when a message is received
   * that contains a matching method field, the promise resolves with that response.
   *
   * Requirement 10.5: Request-response correlation using method name matching.
   *
   * @param message - The message string to send
   * @param method - The method name to correlate the response with
   * @param timeout - Optional timeout in ms (defaults to messageTimeout)
   * @returns The parsed response data
   * @throws Error if the connection is not open, the request times out, or the connection drops
   */
  async sendAndWait<T>(message: string, method: string, timeout?: number): Promise<T> {
    if (!this._isConnected || !this.ws || this.ws.readyState !== WS_OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const effectiveTimeout = timeout ?? this.messageTimeout;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removePendingRequest(pending);
        reject(new Error(`Request timed out waiting for response to method: ${method}`));
      }, effectiveTimeout);

      const pending: PendingRequest = {
        method,
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      };

      this.pendingRequests.push(pending);
      this.ws!.send(message);
    });
  }

  /**
   * Send a message without waiting for a response (fire-and-forget).
   *
   * @param message - The message string to send
   * @throws Error if the connection is not open
   */
  send(message: string): void {
    if (!this._isConnected || !this.ws || this.ws.readyState !== WS_OPEN) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(message);
  }

  /**
   * Register a handler for incoming messages.
   *
   * Handlers receive the parsed message data for all incoming messages
   * (including those that match pending requests).
   *
   * @param handler - Callback invoked with the parsed message data
   */
  onMessage(handler: (data: unknown) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Whether the WebSocket connection is currently open and ready.
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Register an event listener for connection lifecycle events.
   *
   * Supported events: 'connected', 'disconnected'
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  /**
   * Remove an event listener.
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Handle an incoming WebSocket message.
   *
   * Parses the message as JSON and checks for method-based correlation
   * with pending requests. Also dispatches to all registered message handlers.
   */
  private handleMessage(rawData: unknown): void {
    let data: unknown;
    try {
      const text = typeof rawData === 'string' ? rawData : String(rawData);
      data = JSON.parse(text);
    } catch {
      // If the message is not valid JSON, pass the raw data
      data = rawData;
    }

    // Dispatch to all registered message handlers
    for (const handler of this.messageHandlers) {
      try {
        handler(data);
      } catch {
        // Swallow handler errors to prevent one handler from breaking others
      }
    }

    // Check for method-based correlation with pending requests
    if (data && typeof data === 'object') {
      const messageObj = data as Record<string, unknown>;
      const responseMethod = this.extractMethod(messageObj);

      if (responseMethod) {
        const matchIndex = this.pendingRequests.findIndex(
          (req) => req.method === responseMethod
        );

        if (matchIndex !== -1) {
          const pending = this.pendingRequests[matchIndex];
          this.pendingRequests.splice(matchIndex, 1);
          clearTimeout(pending.timer);
          pending.resolve(data);
        }
      }
    }
  }

  /**
   * Extract the method name from a parsed message object.
   *
   * Supports common message formats:
   * - { method: "..." }
   * - { type: "..." }
   * - Nested: { response: { method: "..." } }
   */
  private extractMethod(obj: Record<string, unknown>): string | undefined {
    // Direct method field
    if (typeof obj.method === 'string') {
      return obj.method;
    }

    // Type field as fallback
    if (typeof obj.type === 'string') {
      return obj.type;
    }

    // Nested response object
    if (obj.response && typeof obj.response === 'object') {
      const response = obj.response as Record<string, unknown>;
      if (typeof response.method === 'string') {
        return response.method;
      }
    }

    return undefined;
  }

  /**
   * Handle an unexpected WebSocket disconnection.
   *
   * Cleans up state and initiates reconnection with exponential backoff.
   *
   * Requirement 10.2: Exponential backoff reconnection.
   * Requirement 10.3: Emit disconnected and mark unavailable when retries exhausted.
   */
  private handleDisconnect(): void {
    const wasConnected = this._isConnected;
    this._isConnected = false;
    this.ws = null;

    // If disposed, don't attempt reconnection
    if (this._isDisposed) {
      return;
    }

    // Attempt reconnection
    if (wasConnected) {
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff.
   *
   * Requirement 10.2: delay = initialDelay * 2^(attempt-1)
   * Requirement 10.3: Mark provider unavailable when all retries exhausted.
   */
  private attemptReconnect(): void {
    this.reconnectAttempt++;

    if (this.reconnectAttempt > this.maxReconnectAttempts) {
      // All retries exhausted
      this.cleanupPendingRequests(new Error('All reconnection attempts exhausted'));
      this.emitter.emit('disconnected');
      return;
    }

    const delay = calculateBackoffDelay(this.reconnectDelay, this.reconnectAttempt);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      if (this._isDisposed) {
        return;
      }

      try {
        await this.connect();
      } catch {
        // Connection failed, try again
        this.attemptReconnect();
      }
    }, delay);
  }

  /**
   * Cancel any pending reconnection timer.
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Reject all pending requests with the given error and clean up timers.
   *
   * Requirement 10.4: Clean up all pending message handlers on disconnect.
   */
  private cleanupPendingRequests(error: Error): void {
    const pending = [...this.pendingRequests];
    this.pendingRequests = [];

    for (const req of pending) {
      clearTimeout(req.timer);
      req.reject(error);
    }
  }

  /**
   * Remove a specific pending request from the list.
   */
  private removePendingRequest(request: PendingRequest): void {
    const index = this.pendingRequests.indexOf(request);
    if (index !== -1) {
      this.pendingRequests.splice(index, 1);
    }
  }
}
