/**
 * In-Memory Caching Layer for Lambda Functions
 * Caches frequently accessed data to reduce database queries
 * Requirements: 9.1 - Performance optimization
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class LambdaCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry has expired
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttl: number = 60000): void {
    // Implement simple LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Singleton cache instance that persists across Lambda invocations
const cache = new LambdaCache(100);

/**
 * Cache TTL constants (in milliseconds)
 */
export const CacheTTL = {
  USER_PROFILE: 5 * 60 * 1000,        // 5 minutes
  CARE_CIRCLE: 5 * 60 * 1000,         // 5 minutes
  BASELINE_VITALS: 10 * 60 * 1000,    // 10 minutes
  DEVICE_INFO: 15 * 60 * 1000,        // 15 minutes
  ALERT_PREFERENCES: 5 * 60 * 1000,   // 5 minutes
  PERMISSIONS: 5 * 60 * 1000,         // 5 minutes
  SHORT: 1 * 60 * 1000,               // 1 minute
  MEDIUM: 5 * 60 * 1000,              // 5 minutes
  LONG: 15 * 60 * 1000,               // 15 minutes
};

/**
 * Generate cache key for user data
 */
export function userCacheKey(userId: string): string {
  return `user:${userId}`;
}

/**
 * Generate cache key for care circle data
 */
export function careCircleCacheKey(userId: string): string {
  return `care-circle:${userId}`;
}

/**
 * Generate cache key for baseline vitals
 */
export function baselineVitalsCacheKey(userId: string): string {
  return `baseline-vitals:${userId}`;
}

/**
 * Generate cache key for device info
 */
export function deviceCacheKey(deviceId: string): string {
  return `device:${deviceId}`;
}

/**
 * Generate cache key for alert preferences
 */
export function alertPreferencesCacheKey(userId: string): string {
  return `alert-prefs:${userId}`;
}

/**
 * Generate cache key for permissions
 */
export function permissionsCacheKey(primaryUserId: string, secondaryUserId: string): string {
  return `permissions:${primaryUserId}:${secondaryUserId}`;
}

/**
 * Invalidate user-related cache entries
 */
export function invalidateUserCache(userId: string): void {
  cache.delete(userCacheKey(userId));
  cache.delete(baselineVitalsCacheKey(userId));
  cache.delete(careCircleCacheKey(userId));
  cache.delete(alertPreferencesCacheKey(userId));
}

/**
 * Invalidate device-related cache entries
 */
export function invalidateDeviceCache(deviceId: string): void {
  cache.delete(deviceCacheKey(deviceId));
}

export default cache;
