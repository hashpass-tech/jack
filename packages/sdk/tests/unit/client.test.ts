import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JackClient } from '../../src/client.js';
import { NetworkError, APIError, ValidationError, TimeoutError, RetryError } from '../../src/errors.js';

describe('JackClient', () => {
  let client: JackClient;
  const mockBaseUrl = 'https://api.jack.example';

  beforeEach(() => {
    client = new JackClient({ baseUrl: mockBaseUrl });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration Validation', () => {
    it('should create client with valid config', () => {
      expect(() => new JackClient({ baseUrl: mockBaseUrl })).not.toThrow();
    });

    it('should throw ValidationError for empty baseUrl', () => {
      expect(() => new JackClient({ baseUrl: '' })).toThrow(ValidationError);
      expect(() => new JackClient({ baseUrl: '   ' })).toThrow(ValidationError);
    });

    it('should throw ValidationError for negative timeout', () => {
      expect(() => new JackClient({ baseUrl: mockBaseUrl, timeout: -1 })).toThrow(ValidationError);
      expect(() => new JackClient({ baseUrl: mockBaseUrl, timeout: 0 })).toThrow(ValidationError);
    });

    it('should throw ValidationError for negative maxRetries', () => {
      expect(() => new JackClient({ baseUrl: mockBaseUrl, maxRetries: -1 })).toThrow(ValidationError);
    });

    it('should throw ValidationError for negative retryDelay', () => {
      expect(() => new JackClient({ baseUrl: mockBaseUrl, retryDelay: -1 })).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid retryBackoff', () => {
      expect(() => new JackClient({ baseUrl: mockBaseUrl, retryBackoff: 0 })).toThrow(ValidationError);
      expect(() => new JackClient({ baseUrl: mockBaseUrl, retryBackoff: 0.5 })).toThrow(ValidationError);
    });

    it('should throw ValidationError for negative cacheTTL', () => {
      expect(() => new JackClient({ baseUrl: mockBaseUrl, cacheTTL: -1 })).toThrow(ValidationError);
    });

    it('should accept valid custom configuration', () => {
      expect(() => new JackClient({
        baseUrl: mockBaseUrl,
        timeout: 5000,
        maxRetries: 5,
        retryDelay: 500,
        retryBackoff: 1.5,
        cacheTTL: 30000,
        enableCache: false,
        headers: { 'X-API-Key': 'test' }
      })).not.toThrow();
    });
  });

  describe('Successful Requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: '123', status: 'success' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.get('/test');
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/test`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should make successful POST request', async () => {
      const mockData = { id: '123', created: true };
      const postBody = { name: 'test' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.post('/test', postBody);
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/test`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postBody),
        })
      );
    });

    it('should include custom headers', async () => {
      const clientWithHeaders = new JackClient({
        baseUrl: mockBaseUrl,
        headers: { 'Authorization': 'Bearer token123' }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await clientWithHeaders.get('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
          }),
        })
      );
    });

    it('should override headers per request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await client.get('/test', {
        headers: { 'X-Custom': 'value' }
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        })
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should throw TimeoutError when request times out', async () => {
      const clientWithShortTimeout = new JackClient({
        baseUrl: mockBaseUrl,
        timeout: 100,
        maxRetries: 0
      });

      global.fetch = vi.fn().mockImplementation((_, options) => {
        return new Promise((_, reject) => {
          // Simulate abort signal
          if (options?.signal) {
            const abortHandler = () => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            };
            options.signal.addEventListener('abort', abortHandler);
          }
        });
      });

      await expect(clientWithShortTimeout.get('/test')).rejects.toThrow(TimeoutError);
    });

    it('should use custom timeout per request', async () => {
      global.fetch = vi.fn().mockImplementation((_, options) => {
        return new Promise((_, reject) => {
          if (options?.signal) {
            const abortHandler = () => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            };
            options.signal.addEventListener('abort', abortHandler);
          }
        });
      });

      const clientWithLongTimeout = new JackClient({
        baseUrl: mockBaseUrl,
        maxRetries: 0
      });

      await expect(
        clientWithLongTimeout.get('/test', { timeout: 100 })
      ).rejects.toThrow(TimeoutError);
    });
  });

  describe('Error Handling', () => {
    it('should throw APIError for 4xx responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ message: 'Resource not found' }),
      });

      await expect(client.get('/test')).rejects.toThrow(APIError);
      
      try {
        await client.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).statusCode).toBe(404);
      }
    });

    it('should throw RetryError for 5xx responses after retries exhausted', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({ error: 'Server error' }),
      });

      await expect(client.get('/test')).rejects.toThrow(RetryError);
      
      try {
        await client.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryError);
        expect((error as RetryError).attempts).toBe(4); // 1 initial + 3 retries
      }
    });

    it('should throw NetworkError for network failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const clientNoRetry = new JackClient({
        baseUrl: mockBaseUrl,
        maxRetries: 0
      });

      await expect(clientNoRetry.get('/test')).rejects.toThrow(NetworkError);
    });

    it('should parse error message from JSON response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ message: 'Invalid parameters' }),
      });

      try {
        await client.get('/test');
      } catch (error) {
        expect((error as APIError).message).toContain('Invalid parameters');
      }
    });

    it('should handle non-JSON error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Plain text error',
      });

      try {
        await client.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryError);
        // The underlying error should be APIError
        expect((error as RetryError).lastError).toBeInstanceOf(APIError);
      }
    });
  });

  describe('Cache Behavior', () => {
    it('should cache GET responses', async () => {
      const mockData = { id: '123', cached: true };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      // First request
      const result1 = await client.get('/test');
      expect(result1).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second request should use cache
      const result2 = await client.get('/test');
      expect(result2).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should not cache POST responses', async () => {
      const mockData = { id: '123', created: true };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      await client.post('/test', {});
      await client.post('/test', {});
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should skip cache when skipCache option is true', async () => {
      const mockData = { id: '123', fresh: true };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      await client.get('/test');
      await client.get('/test', { skipCache: true });
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', async () => {
      const mockData = { id: '123' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      await client.get('/test');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      client.clearCache();

      await client.get('/test');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache by pattern', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await client.get('/users/123');
      await client.get('/posts/456');
      
      client.clearCache('/users');

      await client.get('/users/123'); // Should fetch again
      await client.get('/posts/456'); // Should use cache
      
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should respect cache disabled config', async () => {
      const clientNoCache = new JackClient({
        baseUrl: mockBaseUrl,
        enableCache: false
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await clientNoCache.get('/test');
      await clientNoCache.get('/test');
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
