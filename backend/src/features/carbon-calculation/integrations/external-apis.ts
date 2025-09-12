import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as cron from 'node-cron';
import CircuitBreaker from 'opossum';
import { 
  ElectricityMapsData, 
  DataSource
} from '@features/carbon-calculation/types';
import { logger } from '@shared/utils/logger';
import { CacheService } from '@shared/utils/cache';

// Extend Axios config to include metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: { startTime: number; service: string };
}

interface ExternalAPIError {
  service: string;
  endpoint: string;
  statusCode?: number;
  message: string;
  timestamp: string;
  retryAfter?: number;
}

interface APIHealthMetrics {
  service: string;
  isAvailable: boolean;
  responseTime: number;
  successRate: number;
  errorCount: number;
  lastSuccess: string;
  lastError?: ExternalAPIError;
}

interface CircuitBreakerState {
  service: string;
  state: 'closed' | 'open' | 'half-open';
  isOpen: boolean;
  failureCount: number;
  successCount: number;
  nextAttemptTime?: string;
}

class ExternalAPIIntegrations {
  private electricityMapsClient: AxiosInstance;
  private cache: CacheService;
  
  private electricityMapsBreaker!: CircuitBreaker;
  
  private healthMetrics: Map<string, APIHealthMetrics> = new Map();
  private rateLimits: Map<string, { requests: number; resetTime: number; limit: number }> = new Map();
  
  private isDevelopmentMode: boolean;
  private useMockData: boolean;

  constructor() {
    this.cache = new CacheService();
    
    // Check if we're in development mode with mock API keys
    this.isDevelopmentMode = process.env.NODE_ENV === 'development';
    this.useMockData = this.isDevelopmentMode && Boolean(
      process.env.ELECTRICITY_MAPS_API_KEY?.includes('mock') || 
      process.env.ELECTRICITY_MAPS_API_KEY?.includes('development') ||
      process.env.EPA_EGRID_API_KEY?.includes('mock')
    );
    
    this.electricityMapsClient = axios.create({
      baseURL: 'https://api.electricitymap.org/v3',
      timeout: 10000,
      headers: {
        'auth-token': process.env.ELECTRICITY_MAPS_API_KEY || '',
        'User-Agent': 'EcoTrace-CarbonCalculator/1.0',
        'Accept': 'application/json'
      }
    });


    this.initializeCircuitBreakers();
    this.setupRequestInterceptors();
    this.initializeHealthMonitoring();
    this.initializeRateLimitTracking();
  }

  private initializeCircuitBreakers(): void {
    const breakerOptions = {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000,
      rollingCountTimeout: 60000,
      rollingCountBuckets: 10
    };

    this.electricityMapsBreaker = new CircuitBreaker(
      this.fetchElectricityMapsRaw.bind(this),
      {
        ...breakerOptions,
        name: 'ElectricityMapsAPI'
      }
    );


    this.setupCircuitBreakerEvents();
  }

  private setupCircuitBreakerEvents(): void {
    [this.electricityMapsBreaker].forEach(breaker => {
      breaker.on('open', () => {
        logger.warn(`Circuit breaker opened for ${breaker.name}`, {
          metadata: {
            service: breaker.name,
            state: 'open'
          }
        });
      });

      breaker.on('halfOpen', () => {
        logger.info(`Circuit breaker half-open for ${breaker.name}`, {
          metadata: {
            service: breaker.name,
            state: 'half-open'
          }
        });
      });

      breaker.on('close', () => {
        logger.info(`Circuit breaker closed for ${breaker.name}`, {
          metadata: {
            service: breaker.name,
            state: 'closed'
          }
        });
      });

      breaker.on('failure', (error: any) => {
        logger.error(`Circuit breaker failure for ${breaker.name}`, {
          error: {
            message: error.message,
            code: error.code || 'UNKNOWN'
          },
          metadata: {
            service: breaker.name
          }
        });
      });
    });
  }

  private setupRequestInterceptors(): void {
    [this.electricityMapsClient].forEach((client, index) => {
      const serviceName = ['ElectricityMaps'][index];
      
      client.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
          (config as ExtendedAxiosRequestConfig).metadata = { startTime: Date.now(), service: serviceName };
          this.updateRateLimit(serviceName);
          return config;
        },
        (error) => Promise.reject(error)
      );

      client.interceptors.response.use(
        (response) => {
          const responseTime = Date.now() - ((response.config as ExtendedAxiosRequestConfig).metadata?.startTime || 0);
          this.updateHealthMetrics(serviceName, true, responseTime);
          this.handleRateLimitHeaders(serviceName, response.headers);
          return response;
        },
        (error) => {
          const responseTime = Date.now() - ((error.config as ExtendedAxiosRequestConfig)?.metadata?.startTime || 0);
          this.updateHealthMetrics(serviceName, false, responseTime, error);
          this.handleRateLimitHeaders(serviceName, error.response?.headers);
          return Promise.reject(error);
        }
      );
    });
  }

  private initializeHealthMonitoring(): void {
    ['ElectricityMaps'].forEach(service => {
      this.healthMetrics.set(service, {
        service,
        isAvailable: true,
        responseTime: 0,
        successRate: 1.0,
        errorCount: 0,
        lastSuccess: new Date().toISOString()
      });
    });

    cron.schedule('*/5 * * * *', async () => {
      await this.performHealthChecks();
    });

    cron.schedule('0 * * * *', () => {
      this.resetHourlyMetrics();
    });
  }

  private initializeRateLimitTracking(): void {
    ['ElectricityMaps'].forEach(service => {
      this.rateLimits.set(service, {
        requests: 0,
        resetTime: Date.now() + 3600000,
        limit: 1000
      });
    });
  }

  private updateRateLimit(service: string): void {
    const rateLimit = this.rateLimits.get(service);
    if (rateLimit) {
      if (Date.now() > rateLimit.resetTime) {
        rateLimit.requests = 0;
        rateLimit.resetTime = Date.now() + 3600000;
      }
      rateLimit.requests++;
    }
  }

  private handleRateLimitHeaders(service: string, headers?: any): void {
    if (!headers) return;

    const rateLimit = this.rateLimits.get(service);
    if (rateLimit) {
      if (headers['x-ratelimit-remaining']) {
        rateLimit.limit = parseInt(headers['x-ratelimit-limit']) || rateLimit.limit;
        const remaining = parseInt(headers['x-ratelimit-remaining']);
        rateLimit.requests = rateLimit.limit - remaining;
      }

      if (headers['x-ratelimit-reset']) {
        rateLimit.resetTime = parseInt(headers['x-ratelimit-reset']) * 1000;
      }
    }
  }

  private updateHealthMetrics(
    service: string,
    success: boolean,
    responseTime: number,
    error?: any
  ): void {
    const metrics = this.healthMetrics.get(service);
    if (!metrics) return;

    metrics.responseTime = responseTime;

    if (success) {
      metrics.lastSuccess = new Date().toISOString();
    } else {
      metrics.errorCount++;
      metrics.lastError = {
        service,
        endpoint: error?.config?.url || 'unknown',
        statusCode: error?.response?.status,
        message: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        retryAfter: error?.response?.headers?.['retry-after'] ? 
          parseInt(error.response.headers['retry-after']) : undefined
      };
    }

    const totalRequests = metrics.errorCount + 1;
    metrics.successRate = success ? 1.0 : (totalRequests - metrics.errorCount) / totalRequests;
    metrics.isAvailable = metrics.successRate > 0.7 && !this.isCircuitBreakerOpen(service);
  }

  private async performHealthChecks(): Promise<void> {
    const healthChecks = [
      this.checkElectricityMapsHealth()
    ];

    await Promise.allSettled(healthChecks);
  }

  private async checkElectricityMapsHealth(): Promise<void> {
    try {
      await this.electricityMapsClient.get('/health', { timeout: 5000 });
      this.updateHealthMetrics('ElectricityMaps', true, 0);
    } catch (error: any) {
      this.updateHealthMetrics('ElectricityMaps', false, 0, error);
    }
  }


  private resetHourlyMetrics(): void {
    this.healthMetrics.forEach(metrics => {
      metrics.errorCount = 0;
      metrics.successRate = 1.0;
    });
  }

  private isCircuitBreakerOpen(service: string): boolean {
    switch (service) {
      case 'ElectricityMaps':
        return this.electricityMapsBreaker.opened;
      default:
        return false;
    }
  }

  public async getElectricityMapsData(zone: string): Promise<ElectricityMapsData | null> {
    const cacheKey = `electricity_maps_${zone}`;
    const cached = await this.cache.get(cacheKey) as ElectricityMapsData | null;
    
    if (cached && this.isCacheValid(cached.timestamp, 300000)) {
      return cached;
    }

    try {
      const data = await this.electricityMapsBreaker.fire(zone) as ElectricityMapsData | null;
      
      if (data) {
        await this.cache.set(cacheKey, data, { ttl: 300000 });
      }
      
      return data;
    } catch (error: any) {
      logger.warn('Electricity Maps API failed, using cached data if available', {
        metadata: {
          zone,
          error: error.message,
          cacheAvailable: !!cached
        }
      });
      
      return cached || null;
    }
  }

  private async fetchElectricityMapsRaw(zone: string): Promise<ElectricityMapsData | null> {
    // Return mock data in development mode
    if (this.useMockData) {
      logger.info('Using mock Electricity Maps data for development', { metadata: { zone } });
      return this.generateMockElectricityMapsData(zone);
    }

    const response = await this.electricityMapsClient.get(`/carbon-intensity/latest?zone=${zone}`);
    
    if (!response.data || !response.data.carbonIntensity) {
      return null;
    }

    return {
      zone,
      carbonIntensity: response.data.carbonIntensity,
      timestamp: response.data.datetime || new Date().toISOString(),
      source: response.data.source || 'real_time',
      fossilFreePercentage: response.data.fossilFreePercentage || null,
      renewablePercentage: response.data.renewablePercentage || null
    };
  }

  private generateMockElectricityMapsData(zone: string): ElectricityMapsData {
    // Generate realistic mock data based on zone
    const zoneData = {
      'US-CA': { base: 250, renewable: 45 },
      'DE': { base: 350, renewable: 55 },
      'FR': { base: 180, renewable: 75 },
      'AU': { base: 600, renewable: 25 },
      'NO': { base: 50, renewable: 95 },
      'default': { base: 400, renewable: 35 }
    };

    const data = zoneData[zone as keyof typeof zoneData] || zoneData.default;
    const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
    const carbonIntensity = Math.round(data.base * (1 + variation));
    const renewablePercentage = Math.round(data.renewable * (1 + variation * 0.5));

    return {
      zone,
      carbonIntensity,
      timestamp: new Date().toISOString(),
      source: 'historical',
      fossilFreePercentage: renewablePercentage,
      renewablePercentage
    };
  }







  private isCacheValid(timestamp: string, maxAgeMs: number): boolean {
    return Date.now() - new Date(timestamp).getTime() < maxAgeMs;
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: APIHealthMetrics[];
    circuitBreakers: CircuitBreakerState[];
    rateLimits: Array<{
      service: string;
      requests: number;
      limit: number;
      resetTime: string;
      percentageUsed: number;
    }>;
    lastUpdated: string;
  }> {
    const services = Array.from(this.healthMetrics.values());
    
    const circuitBreakers: CircuitBreakerState[] = [
      {
        service: 'ElectricityMaps',
        state: (this.electricityMapsBreaker as any).state || 'unknown',
        isOpen: this.electricityMapsBreaker.opened,
        failureCount: (this.electricityMapsBreaker as any).stats?.failures || 0,
        successCount: (this.electricityMapsBreaker as any).stats?.successes || 0,
        nextAttemptTime: this.electricityMapsBreaker.opened ? 
          new Date(Date.now() + 60000).toISOString() : undefined
      }
    ];

    const rateLimitsInfo = Array.from(this.rateLimits.entries()).map(([service, rateLimit]) => ({
      service,
      requests: rateLimit.requests,
      limit: rateLimit.limit,
      resetTime: new Date(rateLimit.resetTime).toISOString(),
      percentageUsed: Math.round((rateLimit.requests / rateLimit.limit) * 100)
    }));

    const healthyServices = services.filter(s => s.isAvailable).length;
    const totalServices = services.length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices >= totalServices * 0.5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services,
      circuitBreakers,
      rateLimits: rateLimitsInfo,
      lastUpdated: new Date().toISOString()
    };
  }

  public getDataSources(): DataSource[] {
    return [
      {
        name: 'Electricity Maps',
        type: 'Electricity_Maps',
        lastUpdated: this.healthMetrics.get('ElectricityMaps')?.lastSuccess || new Date().toISOString(),
        freshness: 'real_time',
        reliability: this.healthMetrics.get('ElectricityMaps')?.successRate || 0,
        coverage: {
          geographic: ['Global', 'Real-time grid data'],
          temporal: 'Live updates every 5-15 minutes',
          activities: ['electricity']
        }
      }
    ];
  }

  public getCircuitBreakerStates(): Record<string, CircuitBreakerState> {
    return {
      electricityMaps: {
        service: 'ElectricityMaps',
        state: (this.electricityMapsBreaker as any).state || 'unknown',
        isOpen: this.electricityMapsBreaker.opened,
        failureCount: (this.electricityMapsBreaker as any).stats?.failures || 0,
        successCount: (this.electricityMapsBreaker as any).stats?.successes || 0,
        nextAttemptTime: this.electricityMapsBreaker.opened ? 
          new Date(Date.now() + 60000).toISOString() : undefined
      }
    };
  }

  public async forceRefresh(service?: string): Promise<void> {
    const services = service ? [service] : ['ElectricityMaps'];
    
    for (const svc of services) {
      const cachePattern = svc.toLowerCase().replace(/[^a-z]/g, '_');
      await this.cache.delete(`*${cachePattern}*`);
      
      logger.info(`Force refreshed cache for ${svc}`, { metadata: { service: svc } });
    }
  }

  public getRateLimitStatus(service?: string): Array<{
    service: string;
    requests: number;
    limit: number;
    resetTime: string;
    percentageUsed: number;
    isNearLimit: boolean;
  }> {
    const entries: Array<[string, { requests: number; resetTime: number; limit: number } | undefined]> = service ? 
      [[service, this.rateLimits.get(service)]] : 
      Array.from(this.rateLimits.entries());

    return entries
      .filter((entry): entry is [string, { requests: number; resetTime: number; limit: number }] => 
        entry[1] !== undefined)
      .map(([serviceName, rateLimit]) => {
        const percentageUsed = Math.round((rateLimit.requests / rateLimit.limit) * 100);
        return {
          service: serviceName,
          requests: rateLimit.requests,
          limit: rateLimit.limit,
          resetTime: new Date(rateLimit.resetTime).toISOString(),
          percentageUsed,
          isNearLimit: percentageUsed >= 80
        };
      });
  }
}

export const externalAPIService = new ExternalAPIIntegrations();
export { ExternalAPIIntegrations };