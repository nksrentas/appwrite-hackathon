import { Octokit } from '@octokit/rest';
import { 
  databases, 
  DATABASE_ID, 
  executeAppwriteOperation,
  QueryBuilder,
  PermissionHelper 
} from '@shared/config/appwrite';
import { logger } from '@shared/utils/logger';
import {
  GitHubRepository,
  GitHubWebhook,
  GitHubRepositoryInfo,
  RepositoryListResponse,
  EnableTrackingRequest,
  EnableTrackingResponse,
  DisableTrackingRequest,
  GitHubConnection,
  GitHubIntegrationError,
  GitHubAPIError,
  WEBHOOK_EVENTS
} from '../types';
import { GitHubSecurityManager } from './security.service';

export class RepositoryManager {
  private securityManager: GitHubSecurityManager;

  constructor() {
    this.securityManager = new GitHubSecurityManager();
  }

  /**
   * Get user's GitHub repositories with tracking status
   */
  async getUserRepositories(userId: string, refresh: boolean = false): Promise<RepositoryListResponse> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        throw new GitHubIntegrationError('CONNECTION_NOT_FOUND', 'No active GitHub connection found');
      }

      if (refresh) {
        // Fetch fresh data from GitHub API
        await this.syncRepositoriesFromGitHub(connection);
      }

      // Get repositories from database
      const result = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_repositories',
          new QueryBuilder()
            .equal('connection_id', connection.$id)
            .orderDesc('last_activity_at')
            .limit(100)
            .build()
        );
      }, 'getUserRepositories');

      const repositories = result.documents.map((repo: any) => this.mapRepositoryToInfo(repo));

      logger.github('User repositories retrieved', {
        userId,
        repositoriesCount: repositories.length,
        refresh
      });

      return {
        repositories,
        total: result.total
      };

    } catch (error) {
      logger.githubError('Failed to get user repositories', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Enable tracking for a specific repository
   */
  async enableRepositoryTracking(
    userId: string, 
    request: EnableTrackingRequest
  ): Promise<EnableTrackingResponse> {
    try {
      const { repositoryId, webhookEvents = [...WEBHOOK_EVENTS] } = request;

      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        throw new GitHubIntegrationError('CONNECTION_NOT_FOUND', 'No active GitHub connection found');
      }

      // Get repository details
      const repository = await this.getRepository(connection.$id, repositoryId);
      if (!repository) {
        throw new GitHubIntegrationError('REPOSITORY_NOT_FOUND', 'Repository not found');
      }

      if (repository.tracking_enabled) {
        throw new GitHubIntegrationError('TRACKING_ALREADY_ENABLED', 'Tracking is already enabled for this repository');
      }

      // Get decrypted access token
      const accessToken = await this.securityManager.getDecryptedToken(userId);
      const octokit = new Octokit({ auth: accessToken });

      // Check repository permissions
      await this.validateRepositoryPermissions(octokit, repository.owner_login, repository.name);

      // Generate webhook secret
      const webhookSecret = this.securityManager.generateWebhookSecret();
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhooks/github/${repository.github_repo_id}`;

      // Create webhook on GitHub
      const { data: webhook } = await octokit.rest.repos.createWebhook({
        owner: repository.owner_login,
        repo: repository.name,
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: webhookSecret,
          insecure_ssl: '0'
        },
        events: webhookEvents,
        active: true
      });

      // Store webhook in database
      const storedWebhook = await this.storeWebhook(
        repository.$id,
        webhook.id,
        webhookUrl,
        webhookEvents,
        webhookSecret
      );

      // Update repository tracking status
      const updatedRepository = await this.updateRepositoryTracking(
        repository.$id,
        true,
        webhook.id.toString(),
        webhookUrl
      );

      logger.github('Repository tracking enabled', {
        userId,
        repositoryId,
        repositoryName: repository.full_name,
        webhookId: webhook.id,
        events: webhookEvents
      });

      return {
        repository: updatedRepository,
        webhook: storedWebhook
      };

    } catch (error) {
      logger.githubError('Failed to enable repository tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        repositoryId: request.repositoryId
      });

      if (error instanceof GitHubIntegrationError) {
        throw error;
      }
      throw new GitHubAPIError('Failed to enable repository tracking');
    }
  }

  /**
   * Disable tracking for a specific repository
   */
  async disableRepositoryTracking(userId: string, request: DisableTrackingRequest): Promise<void> {
    try {
      const { repositoryId } = request;

      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        throw new GitHubIntegrationError('CONNECTION_NOT_FOUND', 'No active GitHub connection found');
      }

      // Get repository details
      const repository = await this.getRepository(connection.$id, repositoryId);
      if (!repository) {
        throw new GitHubIntegrationError('REPOSITORY_NOT_FOUND', 'Repository not found');
      }

      if (!repository.tracking_enabled) {
        throw new GitHubIntegrationError('TRACKING_NOT_ENABLED', 'Tracking is not enabled for this repository');
      }

      // Get decrypted access token
      const accessToken = await this.securityManager.getDecryptedToken(userId);
      const octokit = new Octokit({ auth: accessToken });

      // Delete webhook from GitHub if webhook ID exists
      if (repository.webhook_id) {
        try {
          await octokit.rest.repos.deleteWebhook({
            owner: repository.owner_login,
            repo: repository.name,
            hook_id: parseInt(repository.webhook_id)
          });
        } catch (error) {
          logger.githubError('Failed to delete webhook from GitHub', {
            error: error instanceof Error ? error.message : 'Unknown error',
            repositoryId,
            webhookId: repository.webhook_id
          });
          // Continue with local cleanup even if GitHub deletion fails
        }
      }

      // Deactivate webhook in database
      if (repository.webhook_id) {
        await this.deactivateWebhook(repository.$id);
      }

      // Update repository tracking status
      await this.updateRepositoryTracking(repository.$id, false);

      logger.github('Repository tracking disabled', {
        userId,
        repositoryId,
        repositoryName: repository.full_name,
        webhookId: repository.webhook_id
      });

    } catch (error) {
      logger.githubError('Failed to disable repository tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        repositoryId: request.repositoryId
      });

      if (error instanceof GitHubIntegrationError) {
        throw error;
      }
      throw new GitHubAPIError('Failed to disable repository tracking');
    }
  }

  /**
   * Sync repositories from GitHub API
   */
  async syncRepositoriesFromGitHub(connection: GitHubConnection): Promise<void> {
    try {
      const accessToken = await this.securityManager.getDecryptedToken(connection.user_id);
      const octokit = new Octokit({ auth: accessToken });

      // Fetch repositories from GitHub
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner,collaborator,organization_member'
      });

      // Get existing repositories from database
      const existingRepos = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_repositories',
          new QueryBuilder()
            .equal('connection_id', connection.$id)
            .limit(1000)
            .build()
        );
      }, 'getExistingRepositories');

      const existingRepoMap = new Map(
        existingRepos.documents.map((repo: any) => [repo.github_repo_id, repo])
      );

      // Process each repository
      for (const repo of repos) {
        const existingRepo = existingRepoMap.get(repo.id);

        const repoData = {
          connection_id: connection.$id,
          github_repo_id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          owner_login: repo.owner.login,
          is_private: repo.private,
          default_branch: repo.default_branch,
          primary_language: repo.language || undefined,
          last_activity_at: repo.updated_at,
          last_synced_at: new Date().toISOString()
        };

        if (existingRepo) {
          // Update existing repository
          await executeAppwriteOperation(async () => {
            await databases.updateDocument(
              DATABASE_ID,
              'github_repositories',
              existingRepo.$id,
              repoData
            );
          }, 'updateRepository');
        } else {
          // Create new repository
          await executeAppwriteOperation(async () => {
            await databases.createDocument(
              DATABASE_ID,
              'github_repositories',
              'unique()',
              {
                ...repoData,
                tracking_enabled: false
              },
              PermissionHelper.userOwned(connection.user_id)
            );
          }, 'createRepository');
        }
      }

      logger.github('Repositories synced from GitHub', {
        connectionId: connection.$id,
        repositoriesCount: repos.length
      });

    } catch (error) {
      logger.githubError('Failed to sync repositories from GitHub', {
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId: connection.$id
      });
      throw new GitHubAPIError('Failed to sync repositories');
    }
  }

  /**
   * Get webhook status for a repository
   */
  async getWebhookStatus(userId: string, repositoryId: number): Promise<GitHubWebhook | null> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        return null;
      }

      const repository = await this.getRepository(connection.$id, repositoryId);
      if (!repository) {
        return null;
      }

      const result = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_webhooks',
          new QueryBuilder()
            .equal('repository_id', repository.$id)
            .equal('is_active', true)
            .limit(1)
            .build()
        );
      }, 'getWebhookStatus');

      if (result.documents.length === 0) {
        return null;
      }

      return result.documents[0] as unknown as GitHubWebhook;

    } catch (error) {
      logger.githubError('Failed to get webhook status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        repositoryId
      });
      return null;
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

  private async getRepository(connectionId: string, githubRepoId: number): Promise<GitHubRepository | null> {
    try {
      const result = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_repositories',
          new QueryBuilder()
            .equal('connection_id', connectionId)
            .equal('github_repo_id', githubRepoId)
            .limit(1)
            .build()
        );
      }, 'getRepository');

      if (result.documents.length === 0) {
        return null;
      }

      return result.documents[0] as unknown as GitHubRepository;

    } catch (error) {
      return null;
    }
  }

  private async validateRepositoryPermissions(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<void> {
    try {
      const { data: repository } = await octokit.rest.repos.get({
        owner,
        repo
      });

      if (!repository.permissions?.admin && !repository.permissions?.push) {
        throw new GitHubIntegrationError(
          'INSUFFICIENT_PERMISSIONS',
          'Insufficient permissions to manage webhooks for this repository'
        );
      }

    } catch (error) {
      if (error instanceof GitHubIntegrationError) {
        throw error;
      }
      throw new GitHubAPIError('Failed to validate repository permissions');
    }
  }

  private async storeWebhook(
    repositoryId: string,
    githubWebhookId: number,
    webhookUrl: string,
    events: string[],
    secret: string
  ): Promise<GitHubWebhook> {
    const webhookData = {
      repository_id: repositoryId,
      github_webhook_id: githubWebhookId,
      webhook_url: webhookUrl,
      events: JSON.stringify(events),
      is_active: true,
      secret_hash: this.securityManager.hashWebhookSecret(secret),
      last_ping_at: new Date().toISOString()
    };

    const webhook = await executeAppwriteOperation(async () => {
      return await databases.createDocument(
        DATABASE_ID,
        'github_webhooks',
        'unique()',
        webhookData,
        PermissionHelper.publicReadOnly()
      );
    }, 'storeWebhook');

    return webhook as unknown as GitHubWebhook;
  }

  private async updateRepositoryTracking(
    repositoryId: string,
    trackingEnabled: boolean,
    webhookId?: string,
    webhookUrl?: string
  ): Promise<GitHubRepository> {
    const updateData: any = {
      tracking_enabled: trackingEnabled,
      last_synced_at: new Date().toISOString()
    };

    if (trackingEnabled) {
      updateData.webhook_id = webhookId;
      updateData.webhook_url = webhookUrl;
    } else {
      updateData.webhook_id = null;
      updateData.webhook_url = null;
    }

    const updatedRepository = await executeAppwriteOperation(async () => {
      return await databases.updateDocument(
        DATABASE_ID,
        'github_repositories',
        repositoryId,
        updateData
      );
    }, 'updateRepositoryTracking');

    return updatedRepository as unknown as GitHubRepository;
  }

  private async deactivateWebhook(repositoryId: string): Promise<void> {
    try {
      const result = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_webhooks',
          new QueryBuilder()
            .equal('repository_id', repositoryId)
            .equal('is_active', true)
            .limit(1)
            .build()
        );
      }, 'findActiveWebhook');

      if (result.documents.length > 0) {
        await executeAppwriteOperation(async () => {
          await databases.updateDocument(
            DATABASE_ID,
            'github_webhooks',
            result.documents[0].$id,
            { is_active: false }
          );
        }, 'deactivateWebhook');
      }

    } catch (error) {
      logger.githubError('Failed to deactivate webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryId
      });
    }
  }

  private mapRepositoryToInfo(repository: GitHubRepository): GitHubRepositoryInfo {
    return {
      id: repository.github_repo_id,
      name: repository.name,
      full_name: repository.full_name,
      owner: {
        login: repository.owner_login,
        id: 0 // We don't store owner ID, but GitHub API provides it
      },
      private: repository.is_private,
      default_branch: repository.default_branch,
      language: repository.primary_language,
      updated_at: repository.last_activity_at || repository.$updatedAt,
      permissions: {
        admin: true, // Assume admin if we can manage webhooks
        maintain: true,
        push: true,
        triage: true,
        pull: true
      },
      tracking_enabled: repository.tracking_enabled,
      webhook_installed: !!repository.webhook_id
    };
  }
}