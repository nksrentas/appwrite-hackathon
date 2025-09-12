import { logger } from './logger';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  serialize?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

class MemoryCache {
  private cache = new Map<string, { data: any; expires: number; accessed: number }>();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, hitRate: 0 };
  private maxSize: number = 1000;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    const expires = Date.now() + ttl;
    
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, { data, expires, accessed: Date.now() });
    this.stats.sets++;
    this.updateHitRate();
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    item.accessed = Date.now();
    this.cache.set(key, item);
    
    this.stats.hits++;
    this.updateHitRate();
    
    return item.data;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, hitRate: 0 };
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? Date.now() <= item.expires : false;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.accessed < oldestAccess) {
        oldestAccess = item.accessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Memory cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

class RedisCache {
  private isConnected: boolean = false;
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, hitRate: 0 };

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.isConnected = false;
      logger.info('Redis cache disabled - using memory cache fallback');
    } catch (error) {
      logger.warn('Redis connection failed, using memory cache fallback', {
        error: { 
          code: 'REDIS_CONNECTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
      this.isConnected = false;
    }
  }

  async set(_key: string, _data: any, _ttl: number = 5 * 60 * 1000): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      this.stats.sets++;
    } catch (error) {
      logger.error('Redis set operation failed', { 
        error: { 
          code: 'REDIS_SET_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
    }
  }

  async get(_key: string): Promise<any | null> {
    if (!this.isConnected) {
      this.stats.misses++;
      return null;
    }
    
    try {
      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error('Redis get operation failed', {
        error: { 
          code: 'REDIS_GET_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
      this.stats.misses++;
      return null;
    }
  }

  async delete(_key: string): Promise<boolean> {
    if (!this.isConnected) return false;
    
    try {
      const deleted = false;
      
      if (deleted) {
        this.stats.deletes++;
      }
      
      return deleted;
    } catch (error) {
      logger.error('Redis delete operation failed', {
        error: { 
          code: 'REDIS_DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, hitRate: 0 };
    } catch (error) {
      logger.error('Redis clear operation failed', {
        error: { 
          code: 'REDIS_CLEAR_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
    }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    return { ...this.stats };
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

export class CacheService {
  private memoryCache: MemoryCache;
  private redisCache: RedisCache;
  private defaultTTL: number = 5 * 60 * 1000;

  constructor() {
    this.memoryCache = new MemoryCache(1000);
    this.redisCache = new RedisCache();
  }

  async set(key: string, data: any, options: CacheOptions = {}): Promise<void> {
    const { ttl = this.defaultTTL, prefix = '', serialize = true } = options;
    const cacheKey = prefix ? `${prefix}:${key}` : key;
    const cacheData = serialize ? data : data;
    
    try {
      this.memoryCache.set(cacheKey, cacheData, ttl);
      await this.redisCache.set(cacheKey, cacheData, ttl);
      
      logger.debug(`Cache set: ${cacheKey}`, {
        metadata: { ttl, dataSize: JSON.stringify(data).length }
      });
    } catch (error) {
      logger.error(`Cache set failed for key: ${cacheKey}`, {
        error: { 
          code: 'CACHE_SET_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
    }
  }

  async get(key: string, options: CacheOptions = {}): Promise<any | null> {
    const { prefix = '', serialize = true } = options;
    const cacheKey = prefix ? `${prefix}:${key}` : key;
    
    try {
      let data = this.memoryCache.get(cacheKey);
      
      if (data !== null) {
        logger.debug(`Cache hit (memory): ${cacheKey}`);
        return serialize ? data : data;
      }
      
      data = await this.redisCache.get(cacheKey);
      
      if (data !== null) {
        this.memoryCache.set(cacheKey, data, this.defaultTTL);
        
        logger.debug(`Cache hit (redis): ${cacheKey}`);
        return serialize ? data : data;
      }
      
      logger.debug(`Cache miss: ${cacheKey}`);
      return null;
      
    } catch (error) {
      logger.error(`Cache get failed for key: ${cacheKey}`, {
        error: { 
          code: 'CACHE_GET_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
      return null;
    }
  }

  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const { prefix = '' } = options;
    const cacheKey = prefix ? `${prefix}:${key}` : key;
    
    try {
      const memoryDeleted = this.memoryCache.delete(cacheKey);
      const redisDeleted = await this.redisCache.delete(cacheKey);
      
      logger.debug(`Cache delete: ${cacheKey}`, {
        metadata: { memoryDeleted, redisDeleted }
      });
      
      return memoryDeleted || redisDeleted;
    } catch (error) {
      logger.error(`Cache delete failed for key: ${cacheKey}`, {
        error: { 
          code: 'CACHE_DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      logger.debug(`Deleting cache keys matching pattern: ${pattern}`);
      
      let deletedCount = 0;
      
      // For memory cache, we need to iterate through all keys
      const memoryKeys = Array.from(this.memoryCache['cache'].keys());
      
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
      
      const regex = new RegExp(`^${regexPattern}$`);
      
      for (const key of memoryKeys) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }
      
      logger.debug(`Cache pattern delete completed`, {
        metadata: { pattern, deletedCount }
      });
      
      return deletedCount;
    } catch (error) {
      logger.error(`Cache pattern delete failed for pattern: ${pattern}`, {
        error: { 
          code: 'CACHE_PATTERN_DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      await this.redisCache.clear();
      logger.info('All caches cleared');
    } catch (error) {
      logger.error('Cache clear failed', {
        error: { 
          code: 'CACHE_CLEAR_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
    }
  }

  getStats(): { memory: CacheStats; redis: CacheStats; combined: CacheStats } {
    const memoryStats = this.memoryCache.getStats();
    const redisStats = this.redisCache.getStats();
    
    const combined: CacheStats = {
      hits: memoryStats.hits + redisStats.hits,
      misses: memoryStats.misses + redisStats.misses,
      sets: memoryStats.sets + redisStats.sets,
      deletes: memoryStats.deletes + redisStats.deletes,
      hitRate: 0
    };
    
    const totalAccess = combined.hits + combined.misses;
    combined.hitRate = totalAccess > 0 ? combined.hits / totalAccess : 0;
    
    return { memory: memoryStats, redis: redisStats, combined };
  }

  isRedisAvailable(): boolean {
    return this.redisCache.isReady();
  }

  destroy(): void {
    this.memoryCache.destroy();
    logger.info('Cache service destroyed');
  }
}

export class CacheKeys {
  static user(githubId: string): string {
    return `user:github:${githubId}`;
  }

  static userActivities(userId: string, page: number = 1): string {
    return `user:${userId}:activities:page:${page}`;
  }

  static userStats(userId: string): string {
    return `user:${userId}:stats`;
  }

  static activity(activityId: string): string {
    return `activity:${activityId}`;
  }

  static calculation(activityId: string): string {
    return `calculation:activity:${activityId}`;
  }

  static leaderboard(periodType: string, limit: number = 50): string {
    return `leaderboard:${periodType}:${limit}`;
  }

  static userLeaderboardPosition(userId: string, periodType: string): string {
    return `leaderboard:position:${userId}:${periodType}`;
  }

  static emissionFactor(country: string, region?: string): string {
    return `emission_factor:${country}:${region || 'default'}`;
  }

  static githubRepo(repoFullName: string): string {
    return `github:repo:${repoFullName}`;
  }

  static githubUser(username: string): string {
    return `github:user:${username}`;
  }

  static externalAPI(apiName: string, endpoint: string): string {
    return `api:${apiName}:${Buffer.from(endpoint).toString('base64')}`;
  }

  static challenge(challengeId: string): string {
    return `challenge:${challengeId}`;
  }

  static userChallenges(userId: string): string {
    return `user:${userId}:challenges`;
  }

  static insight(insightId: string): string {
    return `insight:${insightId}`;
  }

  static userInsights(userId: string): string {
    return `user:${userId}:insights`;
  }
}

export class CacheWarmer {

  async warmUserCache(userId: string): Promise<void> {
    try {
      logger.debug(`Warming cache for user: ${userId}`);
      
    } catch (error) {
      logger.error(`Failed to warm user cache: ${userId}`, {
        error: { 
          code: 'CACHE_WARM_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
    }
  }

  async warmLeaderboardCache(): Promise<void> {
    try {
      logger.debug('Warming leaderboard caches');
      
      const periods = ['daily', 'weekly', 'monthly', 'all_time'];
      
      for (const period of periods) {
        logger.debug(`Warming ${period} leaderboard cache`);
      }
      
    } catch (error) {
      logger.error('Failed to warm leaderboard cache', {
        error: { 
          code: 'CACHE_WARM_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
    }
  }

  async warmEmissionFactorsCache(): Promise<void> {
    try {
      logger.debug('Warming emission factors cache');
      
      const commonRegions = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP'];
      
      for (const country of commonRegions) {
        logger.debug(`Warming emission factors for ${country}`);
      }
      
    } catch (error) {
      logger.error('Failed to warm emission factors cache', {
        error: { 
          code: 'CACHE_WARM_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
    }
  }
}

export const cacheService = new CacheService();
export const cacheWarmer = new CacheWarmer();

export class CacheInvalidator {
  private cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  async invalidateUserCache(userId: string): Promise<void> {
    const keysToInvalidate = [
      CacheKeys.user(userId),
      CacheKeys.userStats(userId),
      CacheKeys.userActivities(userId, 1),
      CacheKeys.userActivities(userId, 2),
      CacheKeys.userChallenges(userId),
      CacheKeys.userInsights(userId)
    ];

    for (const key of keysToInvalidate) {
      await this.cacheService.delete(key);
    }

    logger.debug(`Invalidated user cache: ${userId}`);
  }

  async invalidateLeaderboardCache(): Promise<void> {
    const periods = ['daily', 'weekly', 'monthly', 'all_time'];
    
    for (const period of periods) {
      await this.cacheService.delete(CacheKeys.leaderboard(period));
    }

    logger.debug('Invalidated leaderboard caches');
  }

  async invalidateActivityCache(activityId: string): Promise<void> {
    const keysToInvalidate = [
      CacheKeys.activity(activityId),
      CacheKeys.calculation(activityId)
    ];

    for (const key of keysToInvalidate) {
      await this.cacheService.delete(key);
    }

    logger.debug(`Invalidated activity cache: ${activityId}`);
  }

  async invalidateChallengeCache(challengeId: string): Promise<void> {
    const keysToInvalidate = [
      CacheKeys.challenge(challengeId)
    ];

    for (const key of keysToInvalidate) {
      await this.cacheService.delete(key);
    }

    logger.debug(`Invalidated challenge cache: ${challengeId}`);
  }
}

export const cacheInvalidator = new CacheInvalidator(cacheService);

logger.info('EcoTrace cache service initialized', {
  metadata: {
    redisAvailable: cacheService.isRedisAvailable(),
    memoryCacheSize: 1000
  }
});

process.on('SIGINT', () => {
  cacheService.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cacheService.destroy();
  process.exit(0);
});