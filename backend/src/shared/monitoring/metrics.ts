import client from 'prom-client';
import { logger } from '@shared/utils/logger';

const register = new client.Registry();

register.setDefaultLabels({
  app: 'ecotrace-backend',
  version: process.env.npm_package_version || '2.0.0',
  environment: process.env.NODE_ENV || 'development'
});

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10]
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestSize = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});

export const httpResponseSize = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});

export const carbonCalculationsTotal = new client.Counter({
  name: 'carbon_calculations_total',
  help: 'Total number of carbon calculations performed',
  labelNames: ['activity_type', 'confidence_level', 'status']
});

export const carbonCalculationDuration = new client.Histogram({
  name: 'carbon_calculation_duration_seconds',
  help: 'Duration of carbon calculations in seconds',
  labelNames: ['activity_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

export const carbonEmissionsCalculated = new client.Histogram({
  name: 'carbon_emissions_calculated_kg',
  help: 'Carbon emissions calculated in kg CO2 equivalent',
  labelNames: ['activity_type', 'confidence_level'],
  buckets: [0.0001, 0.001, 0.01, 0.1, 1, 10, 100]
});

export const carbonCalculationErrors = new client.Counter({
  name: 'carbon_calculation_errors_total',
  help: 'Total number of carbon calculation errors',
  labelNames: ['activity_type', 'error_type']
});

export const carbonDataSourceStatus = new client.Gauge({
  name: 'carbon_data_source_status',
  help: 'Status of carbon calculation data sources (1 = healthy, 0 = unhealthy)',
  labelNames: ['source_name', 'source_type']
});

export const websocketConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

export const websocketMessagesTotal = new client.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages sent',
  labelNames: ['message_type', 'status']
});

export const websocketMessageDuration = new client.Histogram({
  name: 'websocket_message_duration_seconds',
  help: 'Duration to process and send WebSocket messages',
  labelNames: ['message_type'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1]
});

export const databaseOperationsTotal = new client.Counter({
  name: 'database_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'collection', 'status']
});

export const databaseOperationDuration = new client.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
});

export const databaseConnectionStatus = new client.Gauge({
  name: 'database_connection_status',
  help: 'Status of database connection (1 = connected, 0 = disconnected)',
  labelNames: ['database_name']
});

export const externalApiRequestsTotal = new client.Counter({
  name: 'external_api_requests_total',
  help: 'Total number of external API requests',
  labelNames: ['api_name', 'endpoint', 'status_code']
});

export const externalApiRequestDuration = new client.Histogram({
  name: 'external_api_request_duration_seconds',
  help: 'Duration of external API requests in seconds',
  labelNames: ['api_name', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

export const externalApiErrors = new client.Counter({
  name: 'external_api_errors_total',
  help: 'Total number of external API errors',
  labelNames: ['api_name', 'error_type']
});

export const rateLimitHits = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of requests that hit rate limits',
  labelNames: ['endpoint', 'limit_type']
});

export const rateLimitRemaining = new client.Gauge({
  name: 'rate_limit_remaining',
  help: 'Number of requests remaining in current rate limit window',
  labelNames: ['endpoint', 'client_id']
});

export const usersActive = new client.Gauge({
  name: 'users_active_total',
  help: 'Total number of active users'
});

export const activitiesProcessed = new client.Counter({
  name: 'activities_processed_total',
  help: 'Total number of user activities processed',
  labelNames: ['activity_type', 'processing_status']
});

export const leaderboardUpdates = new client.Counter({
  name: 'leaderboard_updates_total',
  help: 'Total number of leaderboard updates performed'
});

export const healthCheckStatus = new client.Gauge({
  name: 'health_check_status',
  help: 'Status of various system health checks (1 = healthy, 0 = unhealthy)',
  labelNames: ['check_name', 'component']
});

export const memoryUsage = new client.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});

export const cpuUsage = new client.Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestSize);
register.registerMetric(httpResponseSize);
register.registerMetric(carbonCalculationsTotal);
register.registerMetric(carbonCalculationDuration);
register.registerMetric(carbonEmissionsCalculated);
register.registerMetric(carbonCalculationErrors);
register.registerMetric(carbonDataSourceStatus);
register.registerMetric(websocketConnections);
register.registerMetric(websocketMessagesTotal);
register.registerMetric(websocketMessageDuration);
register.registerMetric(databaseOperationsTotal);
register.registerMetric(databaseOperationDuration);
register.registerMetric(databaseConnectionStatus);
register.registerMetric(externalApiRequestsTotal);
register.registerMetric(externalApiRequestDuration);
register.registerMetric(externalApiErrors);
register.registerMetric(rateLimitHits);
register.registerMetric(rateLimitRemaining);
register.registerMetric(usersActive);
register.registerMetric(activitiesProcessed);
register.registerMetric(leaderboardUpdates);
register.registerMetric(healthCheckStatus);
register.registerMetric(memoryUsage);
register.registerMetric(cpuUsage);

export class MetricsCollector {
  private static instance: MetricsCollector;
  private systemMetricsInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public startCollection(): void {
    logger.info('Starting metrics collection', {
      metadata: { metricsEnabled: true, interval: '30s' }
    });

    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    this.collectSystemMetrics();
  }

  public stopCollection(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
      this.systemMetricsInterval = null;
    }
    logger.info('Stopped metrics collection');
  }

  private collectSystemMetrics(): void {
    try {
      const memoryUsageData = process.memoryUsage();
      memoryUsage.set({ type: 'rss' }, memoryUsageData.rss);
      memoryUsage.set({ type: 'heap_used' }, memoryUsageData.heapUsed);
      memoryUsage.set({ type: 'heap_total' }, memoryUsageData.heapTotal);
      memoryUsage.set({ type: 'external' }, memoryUsageData.external);

      const cpuUsagePercent = process.cpuUsage().user / 1000000;
      cpuUsage.set(cpuUsagePercent);

      healthCheckStatus.set({ check_name: 'system', component: 'memory' }, memoryUsageData.heapUsed < 1024 * 1024 * 1024 ? 1 : 0);
      healthCheckStatus.set({ check_name: 'system', component: 'uptime' }, process.uptime() > 0 ? 1 : 0);

    } catch (error: any) {
      logger.error('Failed to collect system metrics', {
        error: {
          code: 'METRICS_COLLECTION_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
    }
  }

  public recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    const labels = { method, route, status_code: statusCode.toString() };
    
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration / 1000);
    
    if (requestSize !== undefined) {
      httpRequestSize.observe({ method, route }, requestSize);
    }
    
    if (responseSize !== undefined) {
      httpResponseSize.observe({ method, route }, responseSize);
    }
  }

  public recordCarbonCalculation(
    activityType: string,
    confidenceLevel: string,
    duration: number,
    emissionKg: number,
    status: 'success' | 'error' = 'success'
  ): void {
    carbonCalculationsTotal.inc({ activity_type: activityType, confidence_level: confidenceLevel, status });
    carbonCalculationDuration.observe({ activity_type: activityType }, duration / 1000);
    
    if (status === 'success') {
      carbonEmissionsCalculated.observe({ activity_type: activityType, confidence_level: confidenceLevel }, emissionKg);
    }
  }

  public recordCarbonCalculationError(activityType: string, errorType: string): void {
    carbonCalculationErrors.inc({ activity_type: activityType, error_type: errorType });
  }

  public updateDataSourceStatus(sourceName: string, sourceType: string, isHealthy: boolean): void {
    carbonDataSourceStatus.set({ source_name: sourceName, source_type: sourceType }, isHealthy ? 1 : 0);
  }

  public recordWebSocketConnection(change: 'connect' | 'disconnect'): void {
    if (change === 'connect') {
      websocketConnections.inc();
    } else {
      websocketConnections.dec();
    }
  }

  public recordWebSocketMessage(messageType: string, duration: number, status: 'sent' | 'failed' = 'sent'): void {
    websocketMessagesTotal.inc({ message_type: messageType, status });
    websocketMessageDuration.observe({ message_type: messageType }, duration / 1000);
  }

  public recordDatabaseOperation(
    operation: string,
    collection: string,
    duration: number,
    status: 'success' | 'error' = 'success'
  ): void {
    databaseOperationsTotal.inc({ operation, collection, status });
    databaseOperationDuration.observe({ operation, collection }, duration / 1000);
  }

  public updateDatabaseConnectionStatus(databaseName: string, isConnected: boolean): void {
    databaseConnectionStatus.set({ database_name: databaseName }, isConnected ? 1 : 0);
  }

  public recordExternalApiRequest(
    apiName: string,
    endpoint: string,
    statusCode: number,
    duration: number
  ): void {
    externalApiRequestsTotal.inc({ api_name: apiName, endpoint, status_code: statusCode.toString() });
    externalApiRequestDuration.observe({ api_name: apiName, endpoint }, duration / 1000);
  }

  public recordExternalApiError(apiName: string, errorType: string): void {
    externalApiErrors.inc({ api_name: apiName, error_type: errorType });
  }

  public recordRateLimitHit(endpoint: string, limitType: string): void {
    rateLimitHits.inc({ endpoint, limit_type: limitType });
  }

  public updateRateLimitRemaining(endpoint: string, clientId: string, remaining: number): void {
    rateLimitRemaining.set({ endpoint, client_id: clientId }, remaining);
  }

  public updateActiveUsers(count: number): void {
    usersActive.set(count);
  }

  public recordActivityProcessed(activityType: string, status: 'success' | 'error' = 'success'): void {
    activitiesProcessed.inc({ activity_type: activityType, processing_status: status });
  }

  public recordLeaderboardUpdate(): void {
    leaderboardUpdates.inc();
  }

  public getMetrics(): Promise<string> {
    return register.metrics();
  }

  public getRegistry(): client.Registry {
    return register;
  }
}

export const metricsCollector = MetricsCollector.getInstance();