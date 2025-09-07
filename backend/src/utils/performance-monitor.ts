/**
 * Performance Monitoring and Optimization Utilities for EcoTrace
 * Provides comprehensive performance tracking, rate limiting, and optimization tools
 */

import { logger } from '~/utils/logging-utils';

// Types
export interface PerformanceMetrics {
  timestamp: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  customMetrics?: Record<string, number>;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface ThrottleConfig {
  limit: number;
  window: number;
  burst?: number;
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private maxMetricsPerKey: number = 100;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxMetricsPerKey: number = 100) {
    this.maxMetricsPerKey = maxMetricsPerKey;
    
    // Cleanup old metrics every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  /**
   * Start performance measurement
   */
  start(key: string): () => PerformanceMetrics {
    const startTime = Date.now();
    const startCpuUsage = process.cpuUsage();

    return (customMetrics?: Record<string, number>): PerformanceMetrics => {
      const endTime = Date.now();
      const endCpuUsage = process.cpuUsage(startCpuUsage);
      const endMemory = process.memoryUsage();

      const metrics: PerformanceMetrics = {
        timestamp: startTime,
        duration: endTime - startTime,
        memoryUsage: endMemory,
        cpuUsage: endCpuUsage,
        customMetrics
      };

      this.record(key, metrics);
      return metrics;
    };
  }

  /**
   * Record performance metrics
   */
  record(key: string, metrics: PerformanceMetrics): void {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const keyMetrics = this.metrics.get(key)!;
    keyMetrics.push(metrics);

    // Keep only the most recent metrics
    if (keyMetrics.length > this.maxMetricsPerKey) {
      keyMetrics.splice(0, keyMetrics.length - this.maxMetricsPerKey);
    }

    // Log slow operations
    if (metrics.duration > 1000) { // More than 1 second
      logger.warn(`Slow operation detected: ${key}`, {
        performance: {
          duration_ms: metrics.duration,
          memory_mb: metrics.memoryUsage.heapUsed / 1024 / 1024
        }
      });
    }
  }

  /**
   * Get performance statistics for a key
   */
  getStats(key: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    avgMemoryUsage: number;
    recentMetrics: PerformanceMetrics[];
  } | null {
    const keyMetrics = this.metrics.get(key);
    if (!keyMetrics || keyMetrics.length === 0) {
      return null;
    }

    const durations = keyMetrics.map(m => m.duration);
    const memoryUsages = keyMetrics.map(m => m.memoryUsage.heapUsed);

    return {
      count: keyMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      recentMetrics: keyMetrics.slice(-10) // Last 10 measurements
    };
  }

  /**
   * Get all performance keys
   */
  getKeys(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get system-wide performance overview
   */
  getOverview(): {
    totalOperations: number;
    slowOperations: number;
    averageDuration: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    let totalOperations = 0;
    let slowOperations = 0;
    let totalDuration = 0;

    for (const [, keyMetrics] of this.metrics) {
      totalOperations += keyMetrics.length;
      totalDuration += keyMetrics.reduce((sum, m) => sum + m.duration, 0);
      slowOperations += keyMetrics.filter(m => m.duration > 1000).length;
    }

    return {
      totalOperations,
      slowOperations,
      averageDuration: totalOperations > 0 ? totalDuration / totalOperations : 0,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Clean up old metrics
   */
  private cleanup(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    let cleaned = 0;

    for (const [key, keyMetrics] of this.metrics) {
      const initialLength = keyMetrics.length;
      const filtered = keyMetrics.filter(m => m.timestamp > cutoffTime);
      
      if (filtered.length !== initialLength) {
        this.metrics.set(key, filtered);
        cleaned += initialLength - filtered.length;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Performance metrics cleanup: removed ${cleaned} old entries`);
    }
  }

  /**
   * Destroy performance monitor
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.metrics.clear();
  }
}

/**
 * Rate limiting implementation
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (id) => id,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string, wasSuccessful?: boolean): boolean {
    // Skip rate limiting based on configuration
    if (wasSuccessful && this.config.skipSuccessfulRequests) {
      return true;
    }
    if (wasSuccessful === false && this.config.skipFailedRequests) {
      return true;
    }

    const key = this.config.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create request timestamps for this key
    let timestamps = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    timestamps = timestamps.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (timestamps.length >= this.config.maxRequests) {
      logger.warn(`Rate limit exceeded for key: ${key}`, {
        metadata: {
          requestCount: timestamps.length,
          maxRequests: this.config.maxRequests,
          windowMs: this.config.windowMs
        }
      });
      return false;
    }

    // Add current request timestamp
    timestamps.push(now);
    this.requests.set(key, timestamps);

    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): number {
    const key = this.config.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(time => time > windowStart);
    
    return Math.max(0, this.config.maxRequests - validTimestamps.length);
  }

  /**
   * Get reset time for identifier
   */
  getResetTime(identifier: string): number {
    const key = this.config.keyGenerator(identifier);
    const timestamps = this.requests.get(key) || [];
    
    if (timestamps.length === 0) {
      return Date.now();
    }
    
    return timestamps[0] + this.config.windowMs;
  }

  /**
   * Clear requests for identifier
   */
  clear(identifier: string): void {
    const key = this.config.keyGenerator(identifier);
    this.requests.delete(key);
  }

  /**
   * Clear all requests
   */
  clearAll(): void {
    this.requests.clear();
  }
}

/**
 * Request throttling implementation
 */
export class RequestThrottler {
  private queues: Map<string, Array<() => void>> = new Map();
  private executing: Map<string, number> = new Map();
  private config: Required<ThrottleConfig>;

  constructor(config: ThrottleConfig) {
    this.config = {
      burst: config.limit,
      ...config
    };
  }

  /**
   * Throttle execution of a function
   */
  async throttle<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        try {
          // Track executing requests
          const current = this.executing.get(key) || 0;
          this.executing.set(key, current + 1);

          const result = await fn();
          
          // Release execution slot
          const updated = this.executing.get(key)! - 1;
          this.executing.set(key, updated);

          // Process next in queue
          setTimeout(() => this.processQueue(key), this.config.window);

          resolve(result);
        } catch (error) {
          // Release execution slot on error
          const current = this.executing.get(key)! - 1;
          this.executing.set(key, current);

          // Process next in queue
          setTimeout(() => this.processQueue(key), this.config.window);

          reject(error);
        }
      };

      // Check if we can execute immediately
      const current = this.executing.get(key) || 0;
      if (current < this.config.limit) {
        execute();
      } else {
        // Add to queue
        if (!this.queues.has(key)) {
          this.queues.set(key, []);
        }
        this.queues.get(key)!.push(execute);
      }
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(key: string): void {
    const queue = this.queues.get(key);
    if (!queue || queue.length === 0) return;

    const current = this.executing.get(key) || 0;
    if (current < this.config.limit) {
      const next = queue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Get queue length for key
   */
  getQueueLength(key: string): number {
    return this.queues.get(key)?.length || 0;
  }

  /**
   * Get executing count for key
   */
  getExecutingCount(key: string): number {
    return this.executing.get(key) || 0;
  }

  /**
   * Clear queue for key
   */
  clearQueue(key: string): void {
    this.queues.delete(key);
    this.executing.delete(key);
  }
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private failures: Map<string, { count: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }> = new Map();
  private failureThreshold: number;
  private resetTimeout: number;
  private monitorWindow: number;

  constructor(
    failureThreshold: number = 5,
    resetTimeout: number = 60000, // 1 minute
    monitorWindow: number = 300000 // 5 minutes
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.monitorWindow = monitorWindow;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(key);

    // Circuit is open - reject immediately
    if (state === 'open') {
      if (fallback) {
        logger.info(`Circuit breaker open for ${key}, using fallback`);
        return await fallback();
      }
      throw new Error(`Circuit breaker is open for ${key}`);
    }

    try {
      const result = await fn();
      
      // Success - reset failure count
      this.recordSuccess(key);
      return result;
    } catch (error) {
      // Failure - increment count and potentially open circuit
      this.recordFailure(key);
      
      const newState = this.getState(key);
      if (newState === 'open' && fallback) {
        logger.warn(`Circuit breaker opened for ${key} after failure, using fallback`);
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Get current state of circuit breaker
   */
  private getState(key: string): 'closed' | 'open' | 'half-open' {
    const state = this.failures.get(key);
    if (!state) return 'closed';

    const now = Date.now();
    
    // Check if we should reset from open to half-open
    if (state.state === 'open' && now - state.lastFailure > this.resetTimeout) {
      state.state = 'half-open';
      this.failures.set(key, state);
      return 'half-open';
    }

    // Check if failures are outside monitoring window
    if (now - state.lastFailure > this.monitorWindow) {
      state.count = 0;
      state.state = 'closed';
      this.failures.set(key, state);
      return 'closed';
    }

    return state.state;
  }

  /**
   * Record successful execution
   */
  private recordSuccess(key: string): void {
    const state = this.failures.get(key);
    if (state) {
      state.count = 0;
      state.state = 'closed';
      this.failures.set(key, state);
    }
  }

  /**
   * Record failed execution
   */
  private recordFailure(key: string): void {
    const state = this.failures.get(key) || { count: 0, lastFailure: 0, state: 'closed' as const };
    
    state.count++;
    state.lastFailure = Date.now();
    
    if (state.count >= this.failureThreshold) {
      state.state = 'open';
      logger.error(`Circuit breaker opened for ${key}`, {
        metadata: {
          failureCount: state.count,
          threshold: this.failureThreshold
        }
      });
    }
    
    this.failures.set(key, state);
  }

  /**
   * Get circuit breaker stats
   */
  getStats(key: string): { count: number; state: string; lastFailure: number } | null {
    const state = this.failures.get(key);
    if (!state) return null;

    return {
      count: state.count,
      state: state.state,
      lastFailure: state.lastFailure
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(key: string): void {
    this.failures.delete(key);
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.failures.clear();
  }
}

// Global instances
export const performanceMonitor = new PerformanceMonitor();
export const defaultRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100
});
export const apiThrottler = new RequestThrottler({
  limit: 10,
  window: 1000 // 1 second
});
export const circuitBreaker = new CircuitBreaker();

/**
 * Performance optimization decorators
 */
export function withRateLimit(
  rateLimiter: RateLimiter,
  keyExtractor: (...args: any[]) => string
) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = ((...args: any[]) => {
      const key = keyExtractor(...args);
      
      if (!rateLimiter.isAllowed(key)) {
        throw new Error(`Rate limit exceeded for ${key}`);
      }
      
      return method.apply(target, args);
    }) as T;
    
    return descriptor;
  };
}

export function withThrottle(
  throttler: RequestThrottler,
  keyExtractor: (...args: any[]) => string
) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = (async (...args: any[]) => {
      const key = keyExtractor(...args);
      
      return throttler.throttle(key, async () => {
        return method.apply(target, args);
      });
    }) as T;
    
    return descriptor;
  };
}

export function withCircuitBreaker(
  circuitBreakerInstance: CircuitBreaker,
  keyExtractor: (...args: any[]) => string,
  fallback?: (...args: any[]) => Promise<any>
) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;
    
    descriptor.value = (async (...args: any[]) => {
      const key = keyExtractor(...args);
      
      return circuitBreakerInstance.execute(
        key,
        async () => method.apply(target, args),
        fallback ? async () => fallback(...args) : undefined
      );
    }) as T;
    
    return descriptor;
  };
}

// Cleanup on process exit
process.on('SIGINT', () => {
  performanceMonitor.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  performanceMonitor.destroy();
  process.exit(0);
});