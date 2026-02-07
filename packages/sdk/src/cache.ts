/**
 * Simple in-memory cache with TTL support
 */
export class Cache {
  private store: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number;

  constructor(defaultTTL: number = 60000) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Clear cache entries matching pattern
   */
  clear(pattern?: string): void {
    if (!pattern) {
      this.store.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.store.size;
  }
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}
