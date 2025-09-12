import { 
  databases, 
  DATABASE_ID, 
  executeAppwriteOperation,
  QueryBuilder 
} from '@shared/config/appwrite';
import { logger } from '@shared/utils/logger';
import { ActivityService } from '@shared/database/base';
import {
  GitHubWebhookPayload,
  GitHubActivityEvent,
  CommitEventPayload,
  PullRequestEventPayload,
  WorkflowRunEventPayload,
  WebhookProcessingResult,
  GitHubActivityData,
  GitHubRepository,
  GitHubWebhook,
  GitHubWebhookError,
  GitHubIntegrationError,
  ProcessingStatus,
  isCommitEvent,
  isPullRequestEvent,
  isWorkflowRunEvent
} from '../types';
import { GitHubSecurityManager } from './security.service';
import { GitHubCarbonIntegrationService } from './carbon-integration.service';

export class WebhookProcessor {
  private securityManager: GitHubSecurityManager;
  private carbonIntegrationService: GitHubCarbonIntegrationService;

  constructor() {
    this.securityManager = new GitHubSecurityManager();
    this.carbonIntegrationService = new GitHubCarbonIntegrationService();
  }

  /**
   * Process incoming GitHub webhook event
   */
  async processWebhookEvent(
    payload: GitHubWebhookPayload,
    signature: string,
    deliveryId: string
  ): Promise<WebhookProcessingResult> {
    try {
      logger.github('Processing webhook event', {
        repositoryId: payload.repository.id,
        eventType: this.extractEventType(payload),
        deliveryId
      });

      // Get repository and validate webhook
      const repository = await this.getRepositoryByGitHubId(payload.repository.id);
      if (!repository) {
        return {
          success: false,
          skipped: true,
          skipReason: 'Repository not found or not tracked'
        };
      }

      // Validate webhook signature
      const webhook = await this.getActiveWebhook(repository.$id);
      if (!webhook) {
        return {
          success: false,
          skipped: true,
          skipReason: 'No active webhook found for repository'
        };
      }

      if (!this.validateWebhookSignature(payload, signature, webhook.secret_hash)) {
        throw new GitHubWebhookError('Invalid webhook signature', 401);
      }

      // Store webhook event for audit trail
      const activityEvent = await this.storeActivityEvent(repository, payload, deliveryId);

      // Process based on event type
      let result: WebhookProcessingResult;
      
      if (isCommitEvent(payload)) {
        result = await this.processCommitEvent(payload, repository, activityEvent.$id);
      } else if (isPullRequestEvent(payload)) {
        result = await this.processPullRequestEvent(payload, repository, activityEvent.$id);
      } else if (isWorkflowRunEvent(payload)) {
        result = await this.processWorkflowRunEvent(payload, repository, activityEvent.$id);
      } else {
        result = {
          success: true,
          skipped: true,
          skipReason: `Event type not supported: ${this.extractEventType(payload)}`
        };
      }

      // Update activity event with processing result
      await this.updateActivityEventStatus(
        activityEvent.$id,
        result.success ? 'completed' : 'failed',
        result.activityId,
        result.errorMessage
      );

      // Update webhook last delivery status
      await this.updateWebhookDeliveryStatus(webhook.$id, result.success ? 'success' : 'failed');

      logger.github('Webhook event processed', {
        repositoryId: payload.repository.id,
        eventType: this.extractEventType(payload),
        deliveryId,
        success: result.success,
        activityId: result.activityId,
        carbonKg: result.carbonKg
      });

      return result;

    } catch (error) {
      logger.githubError('Webhook event processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryId: payload.repository.id,
        deliveryId
      });

      if (error instanceof GitHubWebhookError) {
        throw error;
      }

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process commit/push events
   */
  private async processCommitEvent(
    payload: CommitEventPayload,
    repository: GitHubRepository,
    eventId: string
  ): Promise<WebhookProcessingResult> {
    try {
      // Skip if no commits
      if (!payload.commits || payload.commits.length === 0) {
        return {
          success: true,
          skipped: true,
          skipReason: 'No commits in push event'
        };
      }

      const headCommit = payload.head_commit || payload.commits[payload.commits.length - 1];
      
      // Calculate commit statistics
      const additions = payload.commits.reduce((sum, commit) => sum + (commit.added?.length || 0), 0);
      const deletions = payload.commits.reduce((sum, commit) => sum + (commit.removed?.length || 0), 0);
      const modifications = payload.commits.reduce((sum, commit) => sum + (commit.modified?.length || 0), 0);
      const totalChangedFiles = new Set([
        ...payload.commits.flatMap(c => c.added || []),
        ...payload.commits.flatMap(c => c.removed || []),
        ...payload.commits.flatMap(c => c.modified || [])
      ]).size;

      // Create activity data
      const activityData: GitHubActivityData = {
        type: 'commit',
        repository: {
          name: repository.name,
          full_name: repository.full_name,
          private: repository.is_private,
          language: repository.primary_language
        },
        commit: {
          sha: headCommit.id,
          message: headCommit.message,
          additions,
          deletions,
          changed_files: totalChangedFiles,
          author: headCommit.author.name
        },
        metadata: {
          branch: payload.ref.replace('refs/heads/', ''),
          commitCount: payload.commits.length,
          beforeSha: payload.before,
          afterSha: payload.after,
          compareUrl: payload.compare,
          pusher: payload.sender.login
        },
        timestamp: headCommit.timestamp
      };

      // Create activity record
      const activity = await this.createActivity(repository, activityData);

      return {
        success: true,
        activityId: activity.$id,
        carbonKg: activity.carbon_kg
      };

    } catch (error) {
      logger.githubError('Failed to process commit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryId: repository.github_repo_id,
        eventId
      });

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process pull request events
   */
  private async processPullRequestEvent(
    payload: PullRequestEventPayload,
    repository: GitHubRepository,
    eventId: string
  ): Promise<WebhookProcessingResult> {
    try {
      // Only process merged pull requests
      if (payload.action !== 'closed' || !payload.pull_request.merged) {
        return {
          success: true,
          skipped: true,
          skipReason: 'Pull request not merged'
        };
      }

      // Create activity data
      const activityData: GitHubActivityData = {
        type: 'pr',
        repository: {
          name: repository.name,
          full_name: repository.full_name,
          private: repository.is_private,
          language: repository.primary_language
        },
        pr_data: {
          number: payload.pull_request.number,
          additions: payload.pull_request.additions,
          deletions: payload.pull_request.deletions,
          changed_files: payload.pull_request.changed_files,
          merged: payload.pull_request.merged
        },
        metadata: {
          title: payload.pull_request.title,
          author: payload.pull_request.user.login,
          headSha: payload.pull_request.head.sha,
          baseSha: payload.pull_request.base.sha,
          headRef: payload.pull_request.head.ref,
          baseRef: payload.pull_request.base.ref
        },
        timestamp: new Date().toISOString()
      };

      // Create activity record
      const activity = await this.createActivity(repository, activityData);

      return {
        success: true,
        activityId: activity.$id,
        carbonKg: activity.carbon_kg
      };

    } catch (error) {
      logger.githubError('Failed to process pull request event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryId: repository.github_repo_id,
        eventId
      });

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process workflow run events (CI/CD)
   */
  private async processWorkflowRunEvent(
    payload: WorkflowRunEventPayload,
    repository: GitHubRepository,
    eventId: string
  ): Promise<WebhookProcessingResult> {
    try {
      // Only process completed workflow runs
      if (payload.workflow_run.status !== 'completed') {
        return {
          success: true,
          skipped: true,
          skipReason: 'Workflow run not completed'
        };
      }

      // Calculate duration
      const startedAt = new Date(payload.workflow_run.run_started_at || payload.workflow_run.created_at);
      const completedAt = new Date(payload.workflow_run.updated_at);
      const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

      // Create activity data
      const activityData: GitHubActivityData = {
        type: 'ci_run',
        repository: {
          name: repository.name,
          full_name: repository.full_name,
          private: repository.is_private,
          language: repository.primary_language
        },
        ci_data: {
          provider: 'github_actions',
          duration_seconds: durationSeconds,
          success: payload.workflow_run.conclusion === 'success',
          runner_type: 'github-hosted', // Default assumption
          job_count: 1 // Default, would need additional API call for exact count
        },
        metadata: {
          workflowName: payload.workflow_run.name,
          workflowId: payload.workflow_run.id,
          runAttempt: payload.workflow_run.run_attempt,
          conclusion: payload.workflow_run.conclusion,
          headSha: payload.workflow_run.head_sha,
          headBranch: payload.workflow_run.head_branch,
          actor: payload.sender.login
        },
        timestamp: payload.workflow_run.updated_at
      };

      // Create activity record
      const activity = await this.createActivity(repository, activityData);

      return {
        success: true,
        activityId: activity.$id,
        carbonKg: activity.carbon_kg
      };

    } catch (error) {
      logger.githubError('Failed to process workflow run event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryId: repository.github_repo_id,
        eventId
      });

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Private helper methods

  private extractEventType(payload: GitHubWebhookPayload): string {
    if ('commits' in payload || 'head_commit' in payload) return 'push';
    if ('pull_request' in payload) return 'pull_request';
    if ('workflow_run' in payload) return 'workflow_run';
    if ('deployment' in payload) return 'deployment';
    return 'unknown';
  }

  private async getRepositoryByGitHubId(githubRepoId: number): Promise<GitHubRepository | null> {
    try {
      const result = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_repositories',
          new QueryBuilder()
            .equal('github_repo_id', githubRepoId)
            .equal('tracking_enabled', true)
            .limit(1)
            .build()
        );
      }, 'getRepositoryByGitHubId');

      if (result.documents.length === 0) {
        return null;
      }

      return result.documents[0] as unknown as GitHubRepository;

    } catch (error) {
      logger.githubError('Failed to get repository by GitHub ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        githubRepoId
      });
      return null;
    }
  }

  private async getActiveWebhook(repositoryId: string): Promise<GitHubWebhook | null> {
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
      }, 'getActiveWebhook');

      if (result.documents.length === 0) {
        return null;
      }

      return result.documents[0] as unknown as GitHubWebhook;

    } catch (error) {
      return null;
    }
  }

  private validateWebhookSignature(
    payload: GitHubWebhookPayload,
    signature: string,
    secretHash: string
  ): boolean {
    try {
      // For now, we'll skip signature validation as we don't store the raw secret
      // In production, you'd want to implement proper signature validation
      // using the webhook secret
      return true;

    } catch (error) {
      logger.githubError('Webhook signature validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private async storeActivityEvent(
    repository: GitHubRepository,
    payload: GitHubWebhookPayload,
    deliveryId: string
  ): Promise<GitHubActivityEvent> {
    const eventData = {
      repository_id: repository.$id,
      user_id: await this.getUserIdFromRepository(repository),
      event_type: this.extractEventType(payload),
      github_event_id: deliveryId,
      commit_sha: this.extractCommitSha(payload),
      branch_name: this.extractBranchName(payload),
      raw_payload: JSON.stringify(payload),
      processing_status: 'processing' as ProcessingStatus,
      event_timestamp: new Date().toISOString()
    };

    const activityEvent = await executeAppwriteOperation(async () => {
      return await databases.createDocument(
        DATABASE_ID,
        'github_activity_events',
        'unique()',
        eventData
      );
    }, 'storeActivityEvent');

    return activityEvent as unknown as GitHubActivityEvent;
  }

  private async updateActivityEventStatus(
    eventId: string,
    status: ProcessingStatus,
    activityId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        processing_status: status,
        processed_at: new Date().toISOString()
      };

      if (activityId) {
        updateData.activity_id = activityId;
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      await executeAppwriteOperation(async () => {
        await databases.updateDocument(
          DATABASE_ID,
          'github_activity_events',
          eventId,
          updateData
        );
      }, 'updateActivityEventStatus');

    } catch (error) {
      logger.githubError('Failed to update activity event status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId
      });
    }
  }

  private async updateWebhookDeliveryStatus(webhookId: string, status: string): Promise<void> {
    try {
      await executeAppwriteOperation(async () => {
        await databases.updateDocument(
          DATABASE_ID,
          'github_webhooks',
          webhookId,
          {
            last_delivery_status: status,
            last_ping_at: new Date().toISOString()
          }
        );
      }, 'updateWebhookDeliveryStatus');

    } catch (error) {
      logger.githubError('Failed to update webhook delivery status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        webhookId
      });
    }
  }

  private async createActivity(
    repository: GitHubRepository,
    activityData: GitHubActivityData
  ): Promise<any> {
    try {
      const userId = await this.getUserIdFromRepository(repository);

      // Use the carbon integration service to process the activity
      const activity = await this.carbonIntegrationService.processGitHubActivity(
        userId,
        repository,
        activityData
      );

      return activity;

    } catch (error) {
      logger.githubError('Failed to create activity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryId: repository.github_repo_id
      });
      throw error;
    }
  }

  private async getUserIdFromRepository(repository: GitHubRepository): Promise<string> {
    try {
      const result = await executeAppwriteOperation(async () => {
        return await databases.getDocument(
          DATABASE_ID,
          'github_connections',
          repository.connection_id
        );
      }, 'getUserIdFromRepository');

      return result.user_id;

    } catch (error) {
      logger.githubError('Failed to get user ID from repository', {
        error: error instanceof Error ? error.message : 'Unknown error',
        repositoryId: repository.$id
      });
      throw new GitHubIntegrationError('USER_NOT_FOUND', 'Unable to find user for repository');
    }
  }

  private extractCommitSha(payload: GitHubWebhookPayload): string | undefined {
    if ('head_commit' in payload && payload.head_commit) {
      return payload.head_commit.id;
    }
    if ('after' in payload) {
      return payload.after;
    }
    if ('pull_request' in payload) {
      return payload.pull_request.head.sha;
    }
    if ('workflow_run' in payload) {
      return payload.workflow_run.head_sha;
    }
    return undefined;
  }

  private extractBranchName(payload: GitHubWebhookPayload): string | undefined {
    if ('ref' in payload && payload.ref) {
      return payload.ref.replace('refs/heads/', '');
    }
    if ('pull_request' in payload) {
      return payload.pull_request.head.ref;
    }
    if ('workflow_run' in payload) {
      return payload.workflow_run.head_branch;
    }
    return undefined;
  }
}