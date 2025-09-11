import rateLimit from 'express-rate-limit';
import { createClient, RedisClientType } from 'redis';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@shared/utils/logger';
import { metricsCollector } from '@shared/monitoring/metrics';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string | object;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitRule {
  path: string | RegExp;
  method?: string | string[];
  config: RateLimitConfig;
  description: string;
}

class RedisRateLimiter {
  private static instance: RedisRateLimiter;
  private redisClient: RedisClientType | null = null;
  private isRedisConnected = false;
  private rateLimiters: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): RedisRateLimiter {
    if (!RedisRateLimiter.instance) {
      RedisRateLimiter.instance = new RedisRateLimiter();
    }
    return RedisRateLimiter.instance;
  }

  public async initialize(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000
        }
      });

      this.redisClient.on('error', (error) => {
        logger.error('Redis rate limiter connection error', {
          error: {
            code: 'REDIS_CONNECTION_ERROR',
            message: error.message,
            stack: error.stack
          }
        });
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis rate limiter connected');
        this.isRedisConnected = true;
      });

      this.redisClient.on('disconnect', () => {
        logger.warn('Redis rate limiter disconnected');
        this.isRedisConnected = false;
      });

      await this.redisClient.connect();
      
      this.createRateLimiters();

      logger.info('Rate limiter initialized successfully', {
        metadata: { 
          redisConnected: this.isRedisConnected,
          totalLimiters: this.rateLimiters.size,
          rateLimitingEnabled: true 
        }
      });

    } catch (error: any) {
      logger.error('Failed to initialize rate limiter', {
        error: {
          code: 'RATE_LIMITER_INIT_ERROR',
          message: error.message,
          stack: error.stack
        }
      });

      this.createRateLimiters();
      logger.warn('Rate limiter initialized with in-memory fallback');
    }
  }

  private createRateLimiters(): void {
    const rateLimitRules: RateLimitRule[] = [
      {
        path: '/api/calculation/carbon',
        method: 'POST',
        config: {
          windowMs: 60 * 1000,           max: 30,
          message: {
            error: 'Too many carbon calculation requests',
            message: 'Maximum 30 calculations per minute allowed. Please try again later.',
            retryAfter: 60
          }
        },
        description: 'Carbon calculation rate limit'
      },

      {
        path: /^\/api\/dashboard\/.*/,
        config: {
          windowMs: 60 * 1000,           max: 100,
          message: {
            error: 'Too many dashboard requests',
            message: 'Maximum 100 dashboard requests per minute allowed. Please try again later.',
            retryAfter: 60
          }
        },
        description: 'Dashboard endpoints rate limit'
      },

      {
        path: /^\/api\/.*/,
        config: {
          windowMs: 60 * 1000,           max: 200,
          message: {
            error: 'Too many API requests',
            message: 'Maximum 200 API requests per minute allowed. Please try again later.',
            retryAfter: 60
          }
        },
        description: 'General API rate limit'
      },

      {
        path: /^\/health|\/api\/monitoring\/health$/,
        config: {
          windowMs: 60 * 1000,           max: 300,
          message: {
            error: 'Too many health check requests',
            message: 'Maximum 300 health check requests per minute allowed.',
            retryAfter: 60
          }
        },
        description: 'Health check rate limit'
      },

      {
        path: /^\/api-docs/,
        config: {
          windowMs: 60 * 1000,           max: 50,
          message: {
            error: 'Too many documentation requests',
            message: 'Maximum 50 documentation requests per minute allowed.',
            retryAfter: 60
          }
        },
        description: 'API documentation rate limit'
      },

      {
        path: '/metrics',
        config: {
          windowMs: 60 * 1000,           max: 10,
          message: {
            error: 'Too many metrics requests',
            message: 'Maximum 10 metrics requests per minute allowed.',
            retryAfter: 60
          }
        },
        description: 'Metrics endpoint rate limit'
      }
    ];

    rateLimitRules.forEach((rule) => {
      const limiterKey = `${rule.path}_${rule.method || 'ALL'}`;
      
      const rateLimiter = rateLimit({
        windowMs: rule.config.windowMs,
        max: rule.config.max,
        message: rule.config.message,
        standardHeaders: true,
        legacyHeaders: false,
        
        store: this.isRedisConnected ? this.createRedisStore() : undefined,
        
        keyGenerator: (req: Request): string => {
          const ip = req.ip || req.connection.remoteAddress || 'unknown';
          const userAgent = req.get('user-agent') || 'unknown';
          const userId = req.headers['x-user-id'] as string || 'anonymous';
          return `ratelimit:${ip}:${userId}:${Buffer.from(userAgent).toString('base64').slice(0, 20)}`;
        },
        
        skip: (req: Request): boolean => {
          if (process.env.NODE_ENV === 'development' && 
              (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost')) {
            return true;
          }
          
          const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
          if (whitelist.includes(req.ip || '')) {
            return true;
          }
          
          return false;
        },
        
        handler: (req: Request, res: Response) => {
          const rateLimitInfo = {
            limit: rule.config.max,
            windowMs: rule.config.windowMs,
            endpoint: req.path,
            method: req.method,
            ip: req.ip
          };

          logger.warn('Rate limit exceeded', {
            ...rateLimitInfo,
            userAgent: req.get('user-agent'),
            metadata: { rateLimitHit: true }
          });

          metricsCollector.recordRateLimitHit(req.path, 'endpoint_limit');

          res.status(429).json({
            error: 'Rate limit exceeded',
            message: typeof rule.config.message === 'string' 
              ? rule.config.message 
              : (rule.config.message as any)?.message || 'Too many requests',
            limit: rule.config.max,
            windowMs: rule.config.windowMs,
            retryAfter: Math.ceil(rule.config.windowMs / 1000),
            timestamp: new Date().toISOString()
          });
        }
      });

      this.rateLimiters.set(limiterKey, {
        limiter: rateLimiter,
        rule,
        description: rule.description
      });
    });

    logger.info('Rate limiters created', {
      metadata: { 
        totalRules: rateLimitRules.length,
        redisEnabled: this.isRedisConnected,
        rateLimitersCreated: true 
      }
    });
  }

  private createRedisStore(): any {
    if (!this.redisClient) return undefined;

    return {
      incr: async (key: string): Promise<{ totalHits: number; timeToExpire?: number }> => {
        try {
          const multi = this.redisClient!.multi();
          multi.incr(key);
          multi.expire(key, 60);           multi.ttl(key);
          
          const results = await multi.exec();
          const totalHits = results?.[0] as number || 1;
          const timeToExpire = results?.[2] as number || 60;
          
          return { totalHits, timeToExpire: timeToExpire > 0 ? timeToExpire : undefined };
        } catch (error: any) {
          logger.error('Redis store incr error', {
            error: { 
              code: 'REDIS_INCR_ERROR',
              message: error.message 
            },
            metadata: { key }
          });
          return { totalHits: 1 };
        }
      },

      decrement: async (key: string): Promise<void> => {
        try {
          await this.redisClient!.decr(key);
        } catch (error: any) {
          logger.error('Redis store decrement error', {
            error: { 
              code: 'REDIS_DECR_ERROR',
              message: error.message 
            },
            metadata: { key }
          });
        }
      },

      resetKey: async (key: string): Promise<void> => {
        try {
          await this.redisClient!.del(key);
        } catch (error: any) {
          logger.error('Redis store reset error', {
            error: { 
              code: 'REDIS_RESET_ERROR',
              message: error.message 
            },
            metadata: { key }
          });
        }
      }
    };
  }

  public getMiddleware(path: string, method?: string): any {
    let matchedLimiter = null;
    let bestMatch = -1;

    for (const [key, limiterData] of this.rateLimiters) {
      const rule = limiterData.rule;
      
      if (rule.method && method) {
        const methods = Array.isArray(rule.method) ? rule.method : [rule.method];
        if (!methods.includes(method.toUpperCase())) continue;
      }

      let matchScore = 0;
      if (typeof rule.path === 'string') {
        if (path === rule.path) matchScore = 1000;         else if (path.startsWith(rule.path)) matchScore = rule.path.length;       } else if (rule.path instanceof RegExp) {
        if (rule.path.test(path)) matchScore = 500;       }

      if (matchScore > bestMatch) {
        bestMatch = matchScore;
        matchedLimiter = limiterData;
      }
    }

    if (matchedLimiter) {
      logger.debug('Rate limiter matched', {
        path,
        method,
        metadata: {
          rule: matchedLimiter.description,
          limit: matchedLimiter.rule.config.max,
          windowMs: matchedLimiter.rule.config.windowMs
        }
      });
      return matchedLimiter.limiter;
    }

    return this.getDefaultLimiter();
  }

  private getDefaultLimiter(): any {
    return rateLimit({
      windowMs: 60 * 1000,       max: 500,
      message: {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        logger.warn('Default rate limit exceeded', {
          path: req.path,
          method: req.method,
          ip: req.ip,
          metadata: { defaultRateLimit: true }
        });

        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: 60,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  public async shutdown(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        logger.info('Redis rate limiter client disconnected');
      } catch (error: any) {
        logger.error('Error disconnecting Redis rate limiter', {
          error: { message: error.message }
        });
      }
    }
  }

  public getStatus(): { connected: boolean; limiters: number; redis: boolean } {
    return {
      connected: this.isRedisConnected,
      limiters: this.rateLimiters.size,
      redis: this.redisClient !== null
    };
  }
}

export const createRateLimitMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rateLimiter = RedisRateLimiter.getInstance();
    const middleware = rateLimiter.getMiddleware(req.path, req.method);
    
    middleware(req, res, next);
  };
};

export const carbonCalculationLimiter = rateLimit({
  windowMs: 60 * 1000,   max: 30,   message: {
    error: 'Too many carbon calculation requests',
    message: 'Maximum 30 calculations per minute allowed. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Carbon calculation rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { carbonCalculationRateLimit: true }
    });

    metricsCollector.recordRateLimitHit(req.path, 'carbon_calculation_limit');

    res.status(429).json({
      error: 'Too many carbon calculation requests',
      message: 'Maximum 30 calculations per minute allowed. Please try again later.',
      retryAfter: 60,
      timestamp: new Date().toISOString()
    });
  }
});

export const rateLimiter = RedisRateLimiter.getInstance();