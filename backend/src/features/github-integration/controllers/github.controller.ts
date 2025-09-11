import { Request, Response } from 'express';
import { logger } from '@shared/utils/logger';
import { GitHubIntegrationService } from '../services/integration.service';
import {
  GitHubWebhookError,
  GitHubIntegrationError,
  GitHubOAuthError,
  GitHubAPIError
} from '../types';

export class GitHubController {
  private integrationService: GitHubIntegrationService;

  constructor() {
    this.integrationService = new GitHubIntegrationService();
  }

  /**
   * Get GitHub integration status
   * GET /api/github/status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const result = await this.integrationService.getIntegrationStatus(userId);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.json(result);

    } catch (error) {
      logger.githubError('Failed to get integration status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get integration status'
        }
      });
    }
  }

  /**
   * Initiate GitHub OAuth flow
   * POST /api/github/oauth/initiate
   */
  async initiateOAuth(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const result = await this.integrationService.initiateOAuth({ userId });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);

    } catch (error) {
      logger.githubError('Failed to initiate OAuth', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'OAUTH_INITIATE_ERROR',
          message: 'Failed to initiate OAuth flow'
        }
      });
    }
  }

  /**
   * Handle GitHub OAuth callback
   * POST /api/github/oauth/callback
   */
  async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const { code, state } = req.body;

      if (!code || !state) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Code and state parameters are required'
          }
        });
        return;
      }

      const result = await this.integrationService.handleOAuthCallback({
        code,
        state,
        userId
      });

      if (!result.success) {
        const statusCode = result.error?.code === 'OAUTH_CALLBACK_ERROR' ? 400 : 500;
        res.status(statusCode).json(result);
        return;
      }

      res.json(result);

    } catch (error) {
      logger.githubError('Failed to handle OAuth callback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      if (error instanceof GitHubOAuthError) {
        res.status(401).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'OAUTH_CALLBACK_ERROR',
          message: 'Failed to handle OAuth callback'
        }
      });
    }
  }

  /**
   * Disconnect GitHub integration
   * DELETE /api/github/connection
   */
  async disconnectIntegration(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const result = await this.integrationService.disconnectIntegration(userId);

      if (!result.success) {
        const statusCode = result.error?.code === 'CONNECTION_NOT_FOUND' ? 404 : 500;
        res.status(statusCode).json(result);
        return;
      }

      res.json(result);

    } catch (error) {
      logger.githubError('Failed to disconnect integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'DISCONNECT_ERROR',
          message: 'Failed to disconnect integration'
        }
      });
    }
  }

  /**
   * Get user repositories
   * GET /api/github/repositories
   */
  async getRepositories(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const refresh = req.query.refresh === 'true';

      const result = await this.integrationService.getUserRepositories(userId, refresh);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.json(result);

    } catch (error) {
      logger.githubError('Failed to get repositories', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'REPOSITORIES_ERROR',
          message: 'Failed to retrieve repositories'
        }
      });
    }
  }

  /**
   * Sync repositories from GitHub
   * POST /api/github/repositories/sync
   */
  async syncRepositories(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const result = await this.integrationService.syncRepositories(userId);

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.json(result);

    } catch (error) {
      logger.githubError('Failed to sync repositories', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: 'Failed to sync repositories'
        }
      });
    }
  }

  /**
   * Enable repository tracking
   * POST /api/github/repositories/:id/tracking
   */
  async enableRepositoryTracking(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const repositoryId = parseInt(req.params.id);
      if (isNaN(repositoryId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REPOSITORY_ID',
            message: 'Invalid repository ID'
          }
        });
        return;
      }

      const { webhookEvents } = req.body;

      const result = await this.integrationService.enableRepositoryTracking(userId, {
        repositoryId,
        webhookEvents
      });

      if (!result.success) {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
        return;
      }

      res.json(result);

    } catch (error) {
      logger.githubError('Failed to enable repository tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        repositoryId: req.params.id
      });

      if (error instanceof GitHubIntegrationError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'ENABLE_TRACKING_ERROR',
          message: 'Failed to enable repository tracking'
        }
      });
    }
  }

  /**
   * Disable repository tracking
   * DELETE /api/github/repositories/:id/tracking
   */
  async disableRepositoryTracking(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const repositoryId = parseInt(req.params.id);
      if (isNaN(repositoryId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REPOSITORY_ID',
            message: 'Invalid repository ID'
          }
        });
        return;
      }

      const result = await this.integrationService.disableRepositoryTracking(userId, {
        repositoryId
      });

      if (!result.success) {
        const statusCode = this.getStatusCodeFromError(result.error?.code);
        res.status(statusCode).json(result);
        return;
      }

      res.json(result);

    } catch (error) {
      logger.githubError('Failed to disable repository tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        repositoryId: req.params.id
      });

      if (error instanceof GitHubIntegrationError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'DISABLE_TRACKING_ERROR',
          message: 'Failed to disable repository tracking'
        }
      });
    }
  }

  /**
   * Handle GitHub webhook events
   * POST /api/webhooks/github/:repositoryId
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const repositoryId = parseInt(req.params.repositoryId);
      if (isNaN(repositoryId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REPOSITORY_ID',
            message: 'Invalid repository ID'
          }
        });
        return;
      }

      const signature = req.headers['x-hub-signature-256'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;
      const eventType = req.headers['x-github-event'] as string;

      if (!signature || !deliveryId || !eventType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_HEADERS',
            message: 'Required webhook headers are missing'
          }
        });
        return;
      }

      // Add repository ID to payload for processing
      const payload = {
        ...req.body,
        repository: {
          ...req.body.repository,
          id: repositoryId
        }
      };

      const result = await this.integrationService.processWebhookEvent(
        payload,
        signature,
        deliveryId
      );

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      // GitHub expects a 200 response for successful webhook processing
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });

    } catch (error) {
      logger.githubError('Failed to handle webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryId: req.params.repositoryId,
        deliveryId: req.headers['x-github-delivery']
      });

      if (error instanceof GitHubWebhookError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Failed to process webhook'
        }
      });
    }
  }

  /**
   * Health check endpoint for webhooks
   * GET /api/webhooks/github/health
   */
  async webhookHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: 'GitHub webhook endpoint is healthy',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.githubError('Webhook health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Webhook health check failed'
        }
      });
    }
  }

  // Private helper methods

  private getStatusCodeFromError(errorCode?: string): number {
    switch (errorCode) {
      case 'CONNECTION_NOT_FOUND':
      case 'REPOSITORY_NOT_FOUND':
        return 404;
      case 'TRACKING_ALREADY_ENABLED':
      case 'TRACKING_NOT_ENABLED':
      case 'INSUFFICIENT_PERMISSIONS':
        return 400;
      case 'GITHUB_OAUTH_ERROR':
        return 401;
      case 'GITHUB_API_ERROR':
        return 502;
      default:
        return 500;
    }
  }
}