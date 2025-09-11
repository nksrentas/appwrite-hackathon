import { 
  databases, 
  DATABASE_ID, 
  IndexType, 
  executeAppwriteOperation 
} from '@shared/config/appwrite';
import { logger } from '@shared/utils/logger';

export interface Migration {
  id: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export const migration_002_github_integration: Migration = {
  id: '002',
  name: 'github_integration',

  async up(): Promise<void> {
    logger.system('Running GitHub integration migration', { migrationId: '002' });

    try {
      // Create GitHub connections collection
      await executeAppwriteOperation(async () => {
        await databases.createCollection(
          DATABASE_ID,
          'github_connections',
          'GitHub Connections',
          'githubConnections'
        );

        // Add GitHub connection attributes
        await databases.createStringAttribute(DATABASE_ID, 'github_connections', 'user_id', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_connections', 'github_user_id', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_connections', 'github_username', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_connections', 'encrypted_access_token', 1000, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_connections', 'token_scopes', 500, true);
        await databases.createDatetimeAttribute(DATABASE_ID, 'github_connections', 'token_expires_at', false);
        await databases.createDatetimeAttribute(DATABASE_ID, 'github_connections', 'last_used_at', true);
        await databases.createBooleanAttribute(DATABASE_ID, 'github_connections', 'is_active', true, true);

        // Create indexes for GitHub connections
        await databases.createIndex(
          DATABASE_ID,
          'github_connections',
          'user_id_idx',
          IndexType.Key,
          ['user_id']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_connections',
          'github_user_id_idx',
          IndexType.Unique,
          ['github_user_id']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_connections',
          'github_username_idx',
          IndexType.Key,
          ['github_username']
        );

        logger.system('Created GitHub connections collection', { collection: 'github_connections' });
      }, 'createGitHubConnectionsCollection');

      // Create GitHub repositories collection
      await executeAppwriteOperation(async () => {
        await databases.createCollection(
          DATABASE_ID,
          'github_repositories',
          'GitHub Repositories',
          'githubRepositories'
        );

        // Add GitHub repository attributes
        await databases.createStringAttribute(DATABASE_ID, 'github_repositories', 'connection_id', 255, true);
        await databases.createIntegerAttribute(DATABASE_ID, 'github_repositories', 'github_repo_id', true);
        await databases.createStringAttribute(DATABASE_ID, 'github_repositories', 'name', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_repositories', 'full_name', 500, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_repositories', 'owner_login', 255, true);
        await databases.createBooleanAttribute(DATABASE_ID, 'github_repositories', 'is_private', true);
        await databases.createStringAttribute(DATABASE_ID, 'github_repositories', 'default_branch', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_repositories', 'primary_language', 100, false);
        await databases.createBooleanAttribute(DATABASE_ID, 'github_repositories', 'tracking_enabled', true, false);
        await databases.createStringAttribute(DATABASE_ID, 'github_repositories', 'webhook_id', 255, false);
        await databases.createStringAttribute(DATABASE_ID, 'github_repositories', 'webhook_url', 1000, false);
        await databases.createDatetimeAttribute(DATABASE_ID, 'github_repositories', 'last_activity_at', false);
        await databases.createDatetimeAttribute(DATABASE_ID, 'github_repositories', 'last_synced_at', false);

        // Create indexes for GitHub repositories
        await databases.createIndex(
          DATABASE_ID,
          'github_repositories',
          'connection_id_idx',
          IndexType.Key,
          ['connection_id']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_repositories',
          'github_repo_id_idx',
          IndexType.Unique,
          ['github_repo_id']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_repositories',
          'full_name_idx',
          IndexType.Key,
          ['full_name']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_repositories',
          'tracking_enabled_idx',
          IndexType.Key,
          ['tracking_enabled']
        );

        logger.system('Created GitHub repositories collection', { collection: 'github_repositories' });
      }, 'createGitHubRepositoriesCollection');

      // Create GitHub webhooks collection
      await executeAppwriteOperation(async () => {
        await databases.createCollection(
          DATABASE_ID,
          'github_webhooks',
          'GitHub Webhooks',
          'githubWebhooks'
        );

        // Add GitHub webhook attributes
        await databases.createStringAttribute(DATABASE_ID, 'github_webhooks', 'repository_id', 255, true);
        await databases.createIntegerAttribute(DATABASE_ID, 'github_webhooks', 'github_webhook_id', true);
        await databases.createStringAttribute(DATABASE_ID, 'github_webhooks', 'webhook_url', 1000, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_webhooks', 'events', 1000, true); // JSON array
        await databases.createBooleanAttribute(DATABASE_ID, 'github_webhooks', 'is_active', true, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_webhooks', 'secret_hash', 255, true);
        await databases.createDatetimeAttribute(DATABASE_ID, 'github_webhooks', 'last_ping_at', false);
        await databases.createStringAttribute(DATABASE_ID, 'github_webhooks', 'last_delivery_status', 50, false);

        // Create indexes for GitHub webhooks
        await databases.createIndex(
          DATABASE_ID,
          'github_webhooks',
          'repository_id_idx',
          IndexType.Key,
          ['repository_id']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_webhooks',
          'github_webhook_id_idx',
          IndexType.Unique,
          ['github_webhook_id']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_webhooks',
          'is_active_idx',
          IndexType.Key,
          ['is_active']
        );

        logger.system('Created GitHub webhooks collection', { collection: 'github_webhooks' });
      }, 'createGitHubWebhooksCollection');

      // Create GitHub OAuth states collection for security
      await executeAppwriteOperation(async () => {
        await databases.createCollection(
          DATABASE_ID,
          'github_oauth_states',
          'GitHub OAuth States',
          'githubOAuthStates'
        );

        // Add OAuth state attributes
        await databases.createStringAttribute(DATABASE_ID, 'github_oauth_states', 'user_id', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_oauth_states', 'state', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_oauth_states', 'code_verifier', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_oauth_states', 'code_challenge', 255, true);
        await databases.createDatetimeAttribute(DATABASE_ID, 'github_oauth_states', 'expires_at', true);
        await databases.createBooleanAttribute(DATABASE_ID, 'github_oauth_states', 'used', true, false);

        // Create indexes for OAuth states
        await databases.createIndex(
          DATABASE_ID,
          'github_oauth_states',
          'state_idx',
          IndexType.Unique,
          ['state']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_oauth_states',
          'user_id_idx',
          IndexType.Key,
          ['user_id']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_oauth_states',
          'expires_at_idx',
          IndexType.Key,
          ['expires_at']
        );

        logger.system('Created GitHub OAuth states collection', { collection: 'github_oauth_states' });
      }, 'createGitHubOAuthStatesCollection');

      // Create GitHub activity events collection for audit trail
      await executeAppwriteOperation(async () => {
        await databases.createCollection(
          DATABASE_ID,
          'github_activity_events',
          'GitHub Activity Events',
          'githubActivityEvents'
        );

        // Add activity event attributes
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'repository_id', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'user_id', 255, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'event_type', 100, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'github_event_id', 255, false);
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'commit_sha', 255, false);
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'branch_name', 255, false);
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'raw_payload', 10000, false); // JSON
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'processing_status', 50, true);
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'activity_id', 255, false); // Link to activities table
        await databases.createStringAttribute(DATABASE_ID, 'github_activity_events', 'error_message', 1000, false);
        await databases.createDatetimeAttribute(DATABASE_ID, 'github_activity_events', 'event_timestamp', true);
        await databases.createDatetimeAttribute(DATABASE_ID, 'github_activity_events', 'processed_at', false);

        // Create indexes for activity events
        await databases.createIndex(
          DATABASE_ID,
          'github_activity_events',
          'repository_id_idx',
          IndexType.Key,
          ['repository_id']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_activity_events',
          'user_id_idx',
          IndexType.Key,
          ['user_id']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_activity_events',
          'event_type_idx',
          IndexType.Key,
          ['event_type']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_activity_events',
          'processing_status_idx',
          IndexType.Key,
          ['processing_status']
        );
        await databases.createIndex(
          DATABASE_ID,
          'github_activity_events',
          'event_timestamp_idx',
          IndexType.Key,
          ['event_timestamp']
        );

        logger.system('Created GitHub activity events collection', { collection: 'github_activity_events' });
      }, 'createGitHubActivityEventsCollection');

      logger.system('GitHub integration migration completed successfully', { migrationId: '002' });

    } catch (error) {
      logger.systemError('GitHub integration migration failed', {
        code: 'MIGRATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  },

  async down(): Promise<void> {
    logger.system('Rolling back GitHub integration migration', { migrationId: '002' });

    try {
      // Delete collections in reverse order
      await executeAppwriteOperation(async () => {
        await databases.deleteCollection(DATABASE_ID, 'github_activity_events');
        logger.system('Deleted GitHub activity events collection');
      }, 'deleteGitHubActivityEventsCollection');

      await executeAppwriteOperation(async () => {
        await databases.deleteCollection(DATABASE_ID, 'github_oauth_states');
        logger.system('Deleted GitHub OAuth states collection');
      }, 'deleteGitHubOAuthStatesCollection');

      await executeAppwriteOperation(async () => {
        await databases.deleteCollection(DATABASE_ID, 'github_webhooks');
        logger.system('Deleted GitHub webhooks collection');
      }, 'deleteGitHubWebhooksCollection');

      await executeAppwriteOperation(async () => {
        await databases.deleteCollection(DATABASE_ID, 'github_repositories');
        logger.system('Deleted GitHub repositories collection');
      }, 'deleteGitHubRepositoriesCollection');

      await executeAppwriteOperation(async () => {
        await databases.deleteCollection(DATABASE_ID, 'github_connections');
        logger.system('Deleted GitHub connections collection');
      }, 'deleteGitHubConnectionsCollection');

      logger.system('GitHub integration migration rollback completed', { migrationId: '002' });

    } catch (error) {
      logger.systemError('GitHub integration migration rollback failed', {
        code: 'MIGRATION_ROLLBACK_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
};