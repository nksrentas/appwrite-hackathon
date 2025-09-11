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
  IntegrationStatus,
  OAuthInitiateRequest,
  OAuthInitiateResponse,
  OAuthCallbackRequest,
  OAuthCallbackResponse,
  RepositoryListResponse,
  EnableTrackingRequest,
  EnableTrackingResponse,
  DisableTrackingRequest,
  GitHubWebhookPayload,
  WebhookProcessingResult,
  ServiceResponse,
  GitHubIntegrationError
} from '../types';
import { GitHubOAuthService } from './oauth.service';
import { GitHubSecurityManager } from './security.service';
import { RepositoryManager } from './repository.service';
import { WebhookProcessor } from './webhook.service';

export class GitHubIntegrationService {
  private oauthService: GitHubOAuthService;
  private securityManager: GitHubSecurityManager;
  private repositoryManager: RepositoryManager;
  private webhookProcessor: WebhookProcessor;

  constructor() {
    this.oauthService = new GitHubOAuthService();
    this.securityManager = new GitHubSecurityManager();
    this.repositoryManager = new RepositoryManager();
    this.webhookProcessor = new WebhookProcessor();
  }

  /**
   * Get integration status for a user
   */
  async getIntegrationStatus(userId: string): Promise<ServiceResponse<IntegrationStatus>> {
    try {
      const connection = await this.getActiveConnection(userId);
      
      if (!connection) {
        return {
          success: true,
          data: {
            connected: false,
            repositoriesCount: 0,
            trackedRepositoriesCount: 0,
            activeWebhooksCount: 0,
            tokenValid: false,
            permissions: []
          }
        };
      }

      // Get repository statistics
      const repositoryStats = await this.getRepositoryStatistics(connection.$id);
      
      // Validate token
      const tokenValid = await this.validateConnectionToken(connection);

      const status: IntegrationStatus = {
        connected: true,
        connectionId: connection.$id,
        githubUsername: connection.github_username,
        repositoriesCount: repositoryStats.total,
        trackedRepositoriesCount: repositoryStats.tracked,
        activeWebhooksCount: repositoryStats.webhooks,
        lastActivity: connection.last_used_at,
        tokenValid,
        permissions: connection.token_scopes.split(',')
      };

      logger.github('Integration status retrieved', {
        userId,
        connected: status.connected,
        repositoriesCount: status.repositoriesCount,
        trackedRepositoriesCount: status.trackedRepositoriesCount
      });

      return {
        success: true,
        data: status
      };

    } catch (error) {
      logger.githubError('Failed to get integration status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      return {
        success: false,
        error: {
          code: 'INTEGRATION_STATUS_ERROR',
          message: 'Failed to retrieve integration status'
        }
      };
    }
  }

  /**
   * Initiate OAuth flow
   */
  async initiateOAuth(request: OAuthInitiateRequest): Promise<ServiceResponse<OAuthInitiateResponse>> {
    try {
      const result = await this.oauthService.initiateOAuth(request);

      logger.github('OAuth flow initiated', {
        userId: request.userId,
        state: result.state
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.githubError('Failed to initiate OAuth', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });

      return {
        success: false,
        error: {
          code: 'OAUTH_INITIATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to initiate OAuth'
        }
      };
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(request: OAuthCallbackRequest): Promise<ServiceResponse<OAuthCallbackResponse>> {
    try {
      const result = await this.oauthService.handleOAuthCallback(request);

      logger.github('OAuth callback handled', {
        userId: request.userId,
        githubUsername: result.connection.github_username,
        repositoriesCount: result.repositories.length
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.githubError('Failed to handle OAuth callback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });

      return {
        success: false,
        error: {
          code: 'OAUTH_CALLBACK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to handle OAuth callback'
        }
      };
    }
  }

  /**
   * Disconnect GitHub integration
   */
  async disconnectIntegration(userId: string): Promise<ServiceResponse<void>> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        return {
          success: false,
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'No active GitHub connection found'
          }
        };
      }

      // Disable all repository tracking
      await this.disableAllRepositoryTracking(connection.$id);

      // Revoke OAuth connection
      await this.oauthService.revokeConnection(userId, connection.$id);

      logger.github('GitHub integration disconnected', {
        userId,
        connectionId: connection.$id,
        githubUsername: connection.github_username
      });

      return {
        success: true
      };

    } catch (error) {
      logger.githubError('Failed to disconnect integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      return {
        success: false,
        error: {
          code: 'DISCONNECT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to disconnect integration'
        }
      };
    }
  }

  /**
   * Get user repositories
   */
  async getUserRepositories(userId: string, refresh: boolean = false): Promise<ServiceResponse<RepositoryListResponse>> {
    try {
      const result = await this.repositoryManager.getUserRepositories(userId, refresh);

      logger.github('User repositories retrieved', {
        userId,
        repositoriesCount: result.repositories.length,
        refresh
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.githubError('Failed to get user repositories', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      return {
        success: false,
        error: {
          code: 'REPOSITORIES_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve repositories'
        }
      };
    }
  }

  /**
   * Enable repository tracking
   */
  async enableRepositoryTracking(
    userId: string, 
    request: EnableTrackingRequest
  ): Promise<ServiceResponse<EnableTrackingResponse>> {
    try {
      const result = await this.repositoryManager.enableRepositoryTracking(userId, request);

      logger.github('Repository tracking enabled', {
        userId,
        repositoryId: request.repositoryId,
        repositoryName: result.repository.full_name
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.githubError('Failed to enable repository tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        repositoryId: request.repositoryId
      });

      return {
        success: false,
        error: {
          code: 'ENABLE_TRACKING_ERROR',
          message: error instanceof Error ? error.message : 'Failed to enable repository tracking'
        }
      };
    }
  }

  /**
   * Disable repository tracking
   */
  async disableRepositoryTracking(
    userId: string, 
    request: DisableTrackingRequest
  ): Promise<ServiceResponse<void>> {
    try {
      await this.repositoryManager.disableRepositoryTracking(userId, request);

      logger.github('Repository tracking disabled', {
        userId,
        repositoryId: request.repositoryId
      });

      return {
        success: true
      };

    } catch (error) {
      logger.githubError('Failed to disable repository tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        repositoryId: request.repositoryId
      });

      return {
        success: false,
        error: {
          code: 'DISABLE_TRACKING_ERROR',
          message: error instanceof Error ? error.message : 'Failed to disable repository tracking'
        }
      };
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(
    payload: GitHubWebhookPayload,
    signature: string,
    deliveryId: string
  ): Promise<ServiceResponse<WebhookProcessingResult>> {
    try {
      const result = await this.webhookProcessor.processWebhookEvent(payload, signature, deliveryId);

      logger.github('Webhook event processed', {
        repositoryId: payload.repository.id,
        deliveryId,
        success: result.success,
        skipped: result.skipped
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.githubError('Failed to process webhook event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryId: payload.repository.id,
        deliveryId
      });

      return {
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process webhook event'
        }
      };
    }
  }

  /**
   * Sync repositories from GitHub
   */
  async syncRepositories(userId: string): Promise<ServiceResponse<void>> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        return {
          success: false,
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'No active GitHub connection found'
          }
        };
      }

      await this.repositoryManager.syncRepositoriesFromGitHub(connection);

      logger.github('Repositories synced', {
        userId,
        connectionId: connection.$id
      });

      return {
        success: true
      };

    } catch (error) {
      logger.githubError('Failed to sync repositories', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      return {
        success: false,
        error: {
          code: 'SYNC_REPOSITORIES_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync repositories'
        }
      };
    }
  }

  /**
   * Perform maintenance tasks
   */
  async performMaintenance(): Promise<ServiceResponse<void>> {
    try {
      logger.github('Starting GitHub integration maintenance');

      // Cleanup expired OAuth states
      const cleanedStates = await this.securityManager.cleanupExpiredOAuthStates();

      // Validate active connections
      const validatedConnections = await this.validateActiveConnections();

      // Clean up inactive webhooks
      const cleanedWebhooks = await this.cleanupInactiveWebhooks();

      logger.github('GitHub integration maintenance completed', {
        cleanedStates,
        validatedConnections,
        cleanedWebhooks
      });

      return {
        success: true
      };

    } catch (error) {
      logger.githubError('GitHub integration maintenance failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'MAINTENANCE_ERROR',
          message: error instanceof Error ? error.message : 'Maintenance tasks failed'
        }
      };
    }
  }

  // Private helper methods

  private async getActiveConnection(userId: string): Promise<GitHubConnection | null> {
    try {
      const result = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_connections',
          new QueryBuilder()
            .equal('user_id', userId)
            .equal('is_active', true)
            .limit(1)
            .build()
        );
      }, 'getActiveConnection');

      if (result.documents.length === 0) {
        return null;
      }

      return result.documents[0] as unknown as GitHubConnection;

    } catch (error) {
      return null;
    }
  }

  private async getRepositoryStatistics(connectionId: string): Promise<{
    total: number;
    tracked: number;
    webhooks: number;
  }> {
    try {
      // Get total repositories
      const totalResult = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_repositories',
          new QueryBuilder()
            .equal('connection_id', connectionId)
            .limit(1)
            .build()
        );
      }, 'getTotalRepositories');

      // Get tracked repositories
      const trackedResult = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_repositories',
          new QueryBuilder()
            .equal('connection_id', connectionId)
            .equal('tracking_enabled', true)
            .limit(1)
            .build()
        );
      }, 'getTrackedRepositories');

      // Get active webhooks
      const webhooksResult = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_webhooks',
          new QueryBuilder()
            .equal('is_active', true)
            .limit(1)
            .build()
        );
      }, 'getActiveWebhooks');

      return {
        total: totalResult.total,
        tracked: trackedResult.total,
        webhooks: webhooksResult.total
      };

    } catch (error) {
      return {
        total: 0,
        tracked: 0,
        webhooks: 0
      };
    }
  }

  private async validateConnectionToken(connection: GitHubConnection): Promise<boolean> {
    try {
      const decryptedToken = await this.securityManager.getDecryptedToken(connection.user_id);
      const validation = await this.securityManager.validateToken(decryptedToken);
      return validation.valid;

    } catch (error) {
      return false;
    }
  }

  private async disableAllRepositoryTracking(connectionId: string): Promise<void> {
    try {
      const repositories = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_repositories',
          new QueryBuilder()
            .equal('connection_id', connectionId)
            .equal('tracking_enabled', true)
            .limit(100)
            .build()
        );
      }, 'getTrackedRepositories');

      for (const repo of repositories.documents) {
        try {
          await executeAppwriteOperation(async () => {
            await databases.updateDocument(
              DATABASE_ID,
              'github_repositories',
              repo.$id,
              {
                tracking_enabled: false,
                webhook_id: null,
                webhook_url: null
              }
            );
          }, 'disableRepositoryTracking');

          // Deactivate associated webhooks
          await executeAppwriteOperation(async () => {
            const webhooks = await databases.listDocuments(
              DATABASE_ID,
              'github_webhooks',
              new QueryBuilder()
                .equal('repository_id', repo.$id)
                .equal('is_active', true)
                .build()
            );

            for (const webhook of webhooks.documents) {
              await databases.updateDocument(
                DATABASE_ID,
                'github_webhooks',
                webhook.$id,
                { is_active: false }
              );
            }
          }, 'deactivateWebhooks');

        } catch (error) {
          logger.githubError('Failed to disable tracking for repository', {
            error: error instanceof Error ? error.message : 'Unknown error',
            repositoryId: repo.$id
          });
        }
      }

    } catch (error) {
      logger.githubError('Failed to disable all repository tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId
      });
    }
  }

  private async validateActiveConnections(): Promise<number> {
    try {
      const connections = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_connections',
          new QueryBuilder()
            .equal('is_active', true)
            .limit(100)
            .build()
        );
      }, 'getActiveConnections');

      let validatedCount = 0;

      for (const connection of connections.documents) {
        try {
          const valid = await this.validateConnectionToken(connection as unknown as GitHubConnection);
          
          if (!valid) {
            // Deactivate invalid connection
            await executeAppwriteOperation(async () => {
              await databases.updateDocument(
                DATABASE_ID,
                'github_connections',
                connection.$id,
                { is_active: false }
              );
            }, 'deactivateInvalidConnection');

            logger.github('Deactivated invalid connection', {
              connectionId: connection.$id,
              userId: connection.user_id
            });
          }

          validatedCount++;

        } catch (error) {
          logger.githubError('Failed to validate connection', {
            error: error instanceof Error ? error.message : 'Unknown error',
            connectionId: connection.$id
          });
        }
      }

      return validatedCount;

    } catch (error) {
      logger.githubError('Failed to validate active connections', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  private async cleanupInactiveWebhooks(): Promise<number> {
    try {
      // Find webhooks that haven't been pinged in 30 days
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const inactiveWebhooks = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_webhooks',
          new QueryBuilder()
            .equal('is_active', true)
            .lessThan('last_ping_at', cutoffDate.toISOString())
            .limit(100)
            .build()
        );
      }, 'getInactiveWebhooks');

      let cleanedCount = 0;

      for (const webhook of inactiveWebhooks.documents) {
        try {
          await executeAppwriteOperation(async () => {
            await databases.updateDocument(
              DATABASE_ID,
              'github_webhooks',
              webhook.$id,
              { is_active: false }
            );
          }, 'deactivateInactiveWebhook');

          cleanedCount++;

        } catch (error) {
          logger.githubError('Failed to cleanup inactive webhook', {
            error: error instanceof Error ? error.message : 'Unknown error',
            webhookId: webhook.$id
          });
        }
      }

      return cleanedCount;

    } catch (error) {
      logger.githubError('Failed to cleanup inactive webhooks', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }
}