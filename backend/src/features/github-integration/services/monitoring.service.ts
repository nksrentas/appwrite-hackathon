import { 
  databases, 
  DATABASE_ID, 
  executeAppwriteOperation,
  QueryBuilder 
} from '@shared/config/appwrite';
import { logger } from '@shared/utils/logger';
import {
  GitHubConnection,
  GitHubRepository,
  GitHubWebhook,
  GitHubActivityEvent,
  GitHubIntegrationError
} from '../types';
import { GitHubSecurityManager } from './security.service';

export interface GitHubHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    githubApi: 'healthy' | 'degraded' | 'unhealthy';
    webhooks: 'healthy' | 'degraded' | 'unhealthy';
    authentication: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: {
    activeConnections: number;
    trackedRepositories: number;
    activeWebhooks: number;
    recentActivities: number;
    errorRate: number;
    avgResponseTime: number;
  };
  issues: string[];
  lastChecked: string;
}

export interface GitHubMetrics {
  connections: {
    total: number;
    active: number;
    inactive: number;
    validTokens: number;
    invalidTokens: number;
  };
  repositories: {
    total: number;
    tracked: number;
    untracked: number;
    withWebhooks: number;
    withoutWebhooks: number;
  };
  webhooks: {
    total: number;
    active: number;
    inactive: number;
    recentDeliveries: number;
    failedDeliveries: number;
  };
  activities: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    processingErrors: number;
    avgProcessingTime: number;
  };
  performance: {
    avgOAuthTime: number;
    avgWebhookProcessingTime: number;
    avgRepositorySyncTime: number;
    errorRate: number;
  };
}

export class GitHubMonitoringService {
  private securityManager: GitHubSecurityManager;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCache: { metrics: GitHubMetrics; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.securityManager = new GitHubSecurityManager();
  }

  /**
   * Start monitoring service with periodic health checks
   */
  startMonitoring(intervalMinutes: number = 5): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
        // await this.collectMetrics(); // TODO: Implement this method
        await this.performMaintenance();
      } catch (error) {
        logger.githubError('Monitoring cycle failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, intervalMinutes * 60 * 1000);

    logger.github('GitHub monitoring started', {
      intervalMinutes
    });
  }

  /**
   * Stop monitoring service
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.github('GitHub monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<GitHubHealthStatus> {
    const startTime = Date.now();
    const issues: string[] = [];

    logger.github('Starting health check');

    try {
      // Check database connectivity
      const databaseHealth = await this.checkDatabaseHealth();
      
      // Check GitHub API connectivity
      const githubApiHealth = await this.checkGitHubApiHealth();
      
      // Check webhook functionality
      const webhookHealth = await this.checkWebhookHealth();
      
      // Check authentication system
      const authHealth = await this.checkAuthenticationHealth();
      
      // Collect metrics
      const metrics = await this.getMetrics();

      // Determine overall health
      const components = {
        database: databaseHealth.status,
        githubApi: githubApiHealth.status,
        webhooks: webhookHealth.status,
        authentication: authHealth.status
      };

      // Aggregate issues
      issues.push(...databaseHealth.issues);
      issues.push(...githubApiHealth.issues);
      issues.push(...webhookHealth.issues);
      issues.push(...authHealth.issues);

      const overallHealth = this.determineOverallHealth(components, issues);

      const healthStatus: GitHubHealthStatus = {
        overall: overallHealth,
        components,
        metrics: {
          activeConnections: metrics.connections.active,
          trackedRepositories: metrics.repositories.tracked,
          activeWebhooks: metrics.webhooks.active,
          recentActivities: metrics.activities.today,
          errorRate: metrics.performance.errorRate,
          avgResponseTime: Date.now() - startTime
        },
        issues,
        lastChecked: new Date().toISOString()
      };

      logger.github('Health check completed', {
        overall: overallHealth,
        activeConnections: metrics.connections.active,
        trackedRepositories: metrics.repositories.tracked,
        issuesCount: issues.length,
        duration: Date.now() - startTime
      });

      return healthStatus;

    } catch (error) {
      logger.githubError('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });

      return {
        overall: 'unhealthy',
        components: {
          database: 'unhealthy',
          githubApi: 'unhealthy',
          webhooks: 'unhealthy',
          authentication: 'unhealthy'
        },
        metrics: {
          activeConnections: 0,
          trackedRepositories: 0,
          activeWebhooks: 0,
          recentActivities: 0,
          errorRate: 100,
          avgResponseTime: Date.now() - startTime
        },
        issues: ['Health check system failure'],
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Get comprehensive GitHub integration metrics
   */
  async getMetrics(): Promise<GitHubMetrics> {
    // Check cache first
    if (this.metricsCache && (Date.now() - this.metricsCache.timestamp) < this.CACHE_TTL) {
      return this.metricsCache.metrics;
    }

    const startTime = Date.now();

    try {
      // Get connection metrics
      const connections = await this.getConnectionMetrics();
      
      // Get repository metrics
      const repositories = await this.getRepositoryMetrics();
      
      // Get webhook metrics
      const webhooks = await this.getWebhookMetrics();
      
      // Get activity metrics
      const activities = await this.getActivityMetrics();
      
      // Get performance metrics
      const performance = await this.getPerformanceMetrics();

      const metrics: GitHubMetrics = {
        connections,
        repositories,
        webhooks,
        activities,
        performance
      };

      // Cache metrics
      this.metricsCache = {
        metrics,
        timestamp: Date.now()
      };

      logger.github('Metrics collected', {
        activeConnections: connections.active,
        trackedRepositories: repositories.tracked,
        recentActivities: activities.today,
        duration: Date.now() - startTime
      });

      return metrics;

    } catch (error) {
      logger.githubError('Failed to collect metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Perform maintenance tasks
   */
  async performMaintenance(): Promise<void> {
    try {
      logger.github('Starting maintenance tasks');

      // Cleanup expired OAuth states
      const cleanedStates = await this.securityManager.cleanupExpiredOAuthStates();

      // Cleanup old activity events
      const cleanedEvents = await this.cleanupOldActivityEvents();

      // Validate webhook endpoints
      const validatedWebhooks = await this.validateWebhookEndpoints();

      // Update connection status
      const updatedConnections = await this.updateConnectionStatus();

      logger.github('Maintenance tasks completed', {
        cleanedStates,
        cleanedEvents,
        validatedWebhooks,
        updatedConnections
      });

    } catch (error) {
      logger.githubError('Maintenance tasks failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Private helper methods

  private async checkDatabaseHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Test database connectivity by counting connections
      await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_connections',
          new QueryBuilder().limit(1).build()
        );
      }, 'healthCheckDatabase');

      return { status: 'healthy', issues };

    } catch (error) {
      issues.push('Database connectivity issue');
      return { status: 'unhealthy', issues };
    }
  }

  private async checkGitHubApiHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Test GitHub API with a simple request
      const response = await fetch('https://api.github.com/rate_limit');
      
      if (!response.ok) {
        issues.push('GitHub API responding with errors');
        return { status: 'degraded', issues };
      }

      const data = await response.json();
      const rateLimitRemaining = (data as any).rate?.remaining || 0;

      if (rateLimitRemaining < 100) {
        issues.push('GitHub API rate limit is low');
        return { status: 'degraded', issues };
      }

      return { status: 'healthy', issues };

    } catch (error) {
      issues.push('GitHub API unreachable');
      return { status: 'unhealthy', issues };
    }
  }

  private async checkWebhookHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check recent webhook deliveries
      const recentEvents = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_activity_events',
          new QueryBuilder()
            .greaterThan('event_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .equal('processing_status', 'failed')
            .limit(10)
            .build()
        );
      }, 'checkWebhookHealth');

      const failedEvents = recentEvents.documents.length;
      
      if (failedEvents > 5) {
        issues.push('High webhook failure rate');
        return { status: 'degraded', issues };
      }

      if (failedEvents > 0) {
        issues.push('Some webhook processing failures');
      }

      return { status: 'healthy', issues };

    } catch (error) {
      issues.push('Unable to check webhook status');
      return { status: 'unhealthy', issues };
    }
  }

  private async checkAuthenticationHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check active connections
      const activeConnections = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_connections',
          new QueryBuilder()
            .equal('is_active', true)
            .limit(10)
            .build()
        );
      }, 'checkAuthHealth');

      // Validate a sample of tokens
      let invalidTokens = 0;
      for (const connection of activeConnections.documents.slice(0, 3)) {
        try {
          const valid = await this.securityManager.validateToken(connection.encrypted_access_token);
          if (!valid.valid) {
            invalidTokens++;
          }
        } catch (error) {
          invalidTokens++;
        }
      }

      if (invalidTokens > 1) {
        issues.push('Multiple invalid authentication tokens detected');
        return { status: 'degraded', issues };
      }

      if (invalidTokens > 0) {
        issues.push('Some authentication tokens may be invalid');
      }

      return { status: 'healthy', issues };

    } catch (error) {
      issues.push('Unable to check authentication status');
      return { status: 'unhealthy', issues };
    }
  }

  private determineOverallHealth(
    components: Record<string, string>, 
    issues: string[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(components);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded') || issues.length > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private async getConnectionMetrics(): Promise<GitHubMetrics['connections']> {
    const totalResult = await executeAppwriteOperation(async () => {
      return await databases.listDocuments(
        DATABASE_ID,
        'github_connections',
        new QueryBuilder().limit(1).build()
      );
    }, 'getConnectionMetrics');

    const activeResult = await executeAppwriteOperation(async () => {
      return await databases.listDocuments(
        DATABASE_ID,
        'github_connections',
        new QueryBuilder().equal('is_active', true).limit(1).build()
      );
    }, 'getActiveConnections');

    return {
      total: totalResult.total,
      active: activeResult.total,
      inactive: totalResult.total - activeResult.total,
      validTokens: 0, // Would need to validate tokens
      invalidTokens: 0
    };
  }

  private async getRepositoryMetrics(): Promise<GitHubMetrics['repositories']> {
    const totalResult = await executeAppwriteOperation(async () => {
      return await databases.listDocuments(
        DATABASE_ID,
        'github_repositories',
        new QueryBuilder().limit(1).build()
      );
    }, 'getRepositoryMetrics');

    const trackedResult = await executeAppwriteOperation(async () => {
      return await databases.listDocuments(
        DATABASE_ID,
        'github_repositories',
        new QueryBuilder().equal('tracking_enabled', true).limit(1).build()
      );
    }, 'getTrackedRepositories');

    return {
      total: totalResult.total,
      tracked: trackedResult.total,
      untracked: totalResult.total - trackedResult.total,
      withWebhooks: 0, // Would need to join with webhooks
      withoutWebhooks: 0
    };
  }

  private async getWebhookMetrics(): Promise<GitHubMetrics['webhooks']> {
    const totalResult = await executeAppwriteOperation(async () => {
      return await databases.listDocuments(
        DATABASE_ID,
        'github_webhooks',
        new QueryBuilder().limit(1).build()
      );
    }, 'getWebhookMetrics');

    const activeResult = await executeAppwriteOperation(async () => {
      return await databases.listDocuments(
        DATABASE_ID,
        'github_webhooks',
        new QueryBuilder().equal('is_active', true).limit(1).build()
      );
    }, 'getActiveWebhooks');

    return {
      total: totalResult.total,
      active: activeResult.total,
      inactive: totalResult.total - activeResult.total,
      recentDeliveries: 0, // Would need to check activity events
      failedDeliveries: 0
    };
  }

  private async getActivityMetrics(): Promise<GitHubMetrics['activities']> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayResult = await executeAppwriteOperation(async () => {
      return await databases.listDocuments(
        DATABASE_ID,
        'github_activity_events',
        new QueryBuilder()
          .greaterEqual('event_timestamp', today.toISOString())
          .limit(1)
          .build()
      );
    }, 'getTodayActivities');

    return {
      today: todayResult.total,
      thisWeek: 0, // Would need separate queries
      thisMonth: 0,
      processingErrors: 0,
      avgProcessingTime: 0
    };
  }

  private async getPerformanceMetrics(): Promise<GitHubMetrics['performance']> {
    return {
      avgOAuthTime: 0,
      avgWebhookProcessingTime: 0,
      avgRepositorySyncTime: 0,
      errorRate: 0
    };
  }

  private async cleanupOldActivityEvents(): Promise<number> {
    try {
      // Clean up events older than 30 days
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const oldEvents = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_activity_events',
          new QueryBuilder()
            .lessThan('event_timestamp', cutoffDate.toISOString())
            .limit(100)
            .build()
        );
      }, 'getOldEvents');

      let deletedCount = 0;
      for (const event of oldEvents.documents) {
        try {
          await executeAppwriteOperation(async () => {
            await databases.deleteDocument(
              DATABASE_ID,
              'github_activity_events',
              event.$id
            );
          }, 'deleteOldEvent');
          deletedCount++;
        } catch (error) {
          // Continue with other events
        }
      }

      return deletedCount;

    } catch (error) {
      return 0;
    }
  }

  private async validateWebhookEndpoints(): Promise<number> {
    // Placeholder for webhook endpoint validation
    return 0;
  }

  private async updateConnectionStatus(): Promise<number> {
    // Placeholder for connection status updates
    return 0;
  }
}