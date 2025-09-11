// GitHub Integration Feature Entry Point
// This file exports all the main components of the GitHub integration

// Core Services
export { GitHubIntegrationService } from './services/integration.service';
export { GitHubOAuthService } from './services/oauth.service';
export { GitHubSecurityManager } from './services/security.service';
export { RepositoryManager } from './services/repository.service';
export { WebhookProcessor } from './services/webhook.service';
export { GitHubCarbonIntegrationService } from './services/carbon-integration.service';
export { GitHubMonitoringService } from './services/monitoring.service';

// Controllers
export { GitHubController } from './controllers/github.controller';

// Routes
export { 
  githubRoutes, 
  webhookRoutes, 
  githubMaintenanceRoutes,
  githubSecurityMiddleware,
  webhookSecurityMiddleware,
  githubErrorHandler
} from './routes';

// Types and Interfaces
export * from './types';

// Database Migration
export { migration_002_github_integration } from '../../../shared/database/migrations/002_github_integration';

// GitHub Integration Feature Class
import { GitHubIntegrationService } from './services/integration.service';
import { GitHubMonitoringService } from './services/monitoring.service';
import { logger } from '@shared/utils/logger';

export class GitHubIntegrationFeature {
  private integrationService: GitHubIntegrationService;
  private monitoringService: GitHubMonitoringService;
  private isInitialized: boolean = false;

  constructor() {
    this.integrationService = new GitHubIntegrationService();
    this.monitoringService = new GitHubMonitoringService();
  }

  /**
   * Initialize the GitHub integration feature
   */
  async initialize(): Promise<void> {
    try {
      logger.github('Initializing GitHub integration feature');

      // Validate environment variables
      this.validateEnvironment();

      // Start monitoring service
      this.monitoringService.startMonitoring(5); // Check every 5 minutes

      // Perform initial health check
      const healthStatus = await this.monitoringService.performHealthCheck();
      
      if (healthStatus.overall === 'unhealthy') {
        logger.githubError('GitHub integration health check failed', {
          error: 'Unhealthy status detected',
          issues: healthStatus.issues.join(', ')
        });
        throw new Error('GitHub integration failed health check');
      }

      this.isInitialized = true;

      logger.github('GitHub integration feature initialized successfully', {
        healthStatus: healthStatus.overall,
        activeConnections: healthStatus.metrics.activeConnections,
        trackedRepositories: healthStatus.metrics.trackedRepositories
      });

    } catch (error) {
      logger.githubError('Failed to initialize GitHub integration feature', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Shutdown the GitHub integration feature
   */
  async shutdown(): Promise<void> {
    try {
      logger.github('Shutting down GitHub integration feature');

      // Stop monitoring service
      this.monitoringService.stopMonitoring();

      this.isInitialized = false;

      logger.github('GitHub integration feature shut down successfully');

    } catch (error) {
      logger.githubError('Failed to shutdown GitHub integration feature', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get the main integration service
   */
  getIntegrationService(): GitHubIntegrationService {
    if (!this.isInitialized) {
      throw new Error('GitHub integration feature not initialized');
    }
    return this.integrationService;
  }

  /**
   * Get the monitoring service
   */
  getMonitoringService(): GitHubMonitoringService {
    if (!this.isInitialized) {
      throw new Error('GitHub integration feature not initialized');
    }
    return this.monitoringService;
  }

  /**
   * Check if feature is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get feature health status
   */
  async getHealthStatus() {
    if (!this.isInitialized) {
      return {
        status: 'not_initialized',
        message: 'GitHub integration feature not initialized'
      };
    }

    try {
      const healthStatus = await this.monitoringService.performHealthCheck();
      return {
        status: healthStatus.overall,
        components: healthStatus.components,
        metrics: healthStatus.metrics,
        issues: healthStatus.issues,
        lastChecked: healthStatus.lastChecked
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironment(): void {
    const requiredEnvVars = [
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'GITHUB_OAUTH_REDIRECT_URI',
      'GITHUB_ENCRYPTION_KEY',
      'WEBHOOK_BASE_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate encryption key length
    if (process.env.GITHUB_ENCRYPTION_KEY && process.env.GITHUB_ENCRYPTION_KEY.length < 32) {
      throw new Error('GITHUB_ENCRYPTION_KEY must be at least 32 characters long');
    }

    logger.github('Environment validation completed successfully');
  }
}

// Default export for easy importing
export default GitHubIntegrationFeature;