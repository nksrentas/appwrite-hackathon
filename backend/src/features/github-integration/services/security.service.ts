import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { Octokit } from '@octokit/rest';
import { 
  databases, 
  DATABASE_ID, 
  executeAppwriteOperation,
  QueryBuilder 
} from '@shared/config/appwrite';
import { logger } from '@shared/utils/logger';
import {
  EncryptedTokenData,
  TokenValidationResult,
  GitHubConnection,
  GitHubIntegrationError,
  GitHubAPIError
} from '../types';

export class GitHubSecurityManager {
  private readonly encryptionKey: string;
  private readonly algorithm = 'aes-256-gcm';

  constructor() {
    this.encryptionKey = process.env.GITHUB_ENCRYPTION_KEY!;
    
    if (!this.encryptionKey) {
      throw new Error('GitHub encryption key is not configured');
    }

    if (this.encryptionKey.length < 32) {
      throw new Error('GitHub encryption key must be at least 32 characters');
    }
  }

  /**
   * Encrypt GitHub access token for secure storage
   */
  encryptToken(plainToken: string): EncryptedTokenData {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAutoPadding(true);

      let encrypted = cipher.update(plainToken, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return {
        encryptedToken: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };

    } catch (error) {
      logger.githubError('Token encryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new GitHubIntegrationError('TOKEN_ENCRYPTION_FAILED', 'Failed to encrypt token');
    }
  }

  /**
   * Decrypt GitHub access token for use
   */
  decryptToken(encryptedData: EncryptedTokenData): string {
    try {
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      decipher.setAutoPadding(true);

      let decrypted = decipher.update(encryptedData.encryptedToken, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      logger.githubError('Token decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new GitHubIntegrationError('TOKEN_DECRYPTION_FAILED', 'Failed to decrypt token');
    }
  }

  /**
   * Securely store encrypted GitHub token
   */
  async securelyStoreToken(
    userId: string, 
    accessToken: string, 
    scopes: string[],
    expiresAt?: Date
  ): Promise<void> {
    try {
      const encryptedData = this.encryptToken(accessToken);
      const encryptedToken = `${encryptedData.encryptedToken}:${encryptedData.iv}:${encryptedData.authTag}`;

      // Check if connection already exists
      const existingConnection = await this.getConnectionByUserId(userId);

      const connectionData = {
        encrypted_access_token: encryptedToken,
        token_scopes: scopes.join(','),
        token_expires_at: expiresAt?.toISOString(),
        last_used_at: new Date().toISOString(),
        is_active: true
      };

      if (existingConnection) {
        // Update existing connection
        await executeAppwriteOperation(async () => {
          await databases.updateDocument(
            DATABASE_ID,
            'github_connections',
            existingConnection.$id,
            connectionData
          );
        }, 'updateStoredToken');

        logger.github('Token updated securely', {
          userId,
          connectionId: existingConnection.$id,
          scopes
        });
      } else {
        throw new GitHubIntegrationError('CONNECTION_NOT_FOUND', 'GitHub connection not found');
      }

    } catch (error) {
      logger.githubError('Failed to store token securely', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Retrieve and decrypt GitHub token
   */
  async getDecryptedToken(userId: string): Promise<string> {
    try {
      const connection = await this.getConnectionByUserId(userId);
      if (!connection || !connection.is_active) {
        throw new GitHubIntegrationError('CONNECTION_NOT_FOUND', 'Active GitHub connection not found');
      }

      // Parse encrypted token data
      const [encryptedToken, iv, authTag] = connection.encrypted_access_token.split(':');
      const encryptedData: EncryptedTokenData = {
        encryptedToken,
        iv,
        authTag
      };

      // Decrypt token
      const decryptedToken = this.decryptToken(encryptedData);

      // Update last used timestamp
      await this.updateTokenLastUsed(connection.$id);

      logger.github('Token retrieved and decrypted', {
        userId,
        connectionId: connection.$id
      });

      return decryptedToken;

    } catch (error) {
      logger.githubError('Failed to retrieve decrypted token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Validate GitHub token and get metadata
   */
  async validateToken(accessToken: string): Promise<TokenValidationResult> {
    try {
      const octokit = new Octokit({ auth: accessToken });

      // Test token by making an authenticated request
      const { data: user } = await octokit.rest.users.getAuthenticated();
      
      // Get rate limit information
      const { data: rateLimit } = await octokit.rest.rateLimit.get();

      // Extract scopes from headers if available
      const scopes = this.extractScopesFromToken(accessToken);

      return {
        valid: true,
        scopes,
        rateLimit: {
          limit: rateLimit.rate.limit,
          remaining: rateLimit.rate.remaining,
          reset: rateLimit.rate.reset
        }
      };

    } catch (error) {
      logger.githubError('Token validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        valid: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate secure webhook secret
   */
  generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex')}`;

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

    } catch (error) {
      logger.githubError('Webhook signature verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Hash webhook secret for secure storage
   */
  hashWebhookSecret(secret: string): string {
    return crypto
      .createHash('sha256')
      .update(secret)
      .digest('hex');
  }

  /**
   * Rotate token encryption key (for security maintenance)
   */
  async rotateEncryptionKey(newKey: string): Promise<void> {
    try {
      if (newKey.length < 32) {
        throw new Error('New encryption key must be at least 32 characters');
      }

      // Get all active connections
      const connections = await this.getAllActiveConnections();

      for (const connection of connections) {
        try {
          // Decrypt with old key
          const [encryptedToken, iv, authTag] = connection.encrypted_access_token.split(':');
          const encryptedData: EncryptedTokenData = {
            encryptedToken,
            iv,
            authTag
          };
          const decryptedToken = this.decryptToken(encryptedData);

          // Create new security manager with new key
          const newSecurityManager = new GitHubSecurityManager();
          // @ts-ignore - Temporarily override key for rotation
          newSecurityManager.encryptionKey = newKey;

          // Encrypt with new key
          const newEncryptedData = newSecurityManager.encryptToken(decryptedToken);
          const newEncryptedToken = `${newEncryptedData.encryptedToken}:${newEncryptedData.iv}:${newEncryptedData.authTag}`;

          // Update connection with new encrypted token
          await executeAppwriteOperation(async () => {
            await databases.updateDocument(
              DATABASE_ID,
              'github_connections',
              connection.$id,
              { encrypted_access_token: newEncryptedToken }
            );
          }, 'rotateConnectionToken');

          logger.github('Token re-encrypted with new key', {
            connectionId: connection.$id,
            userId: connection.user_id
          });

        } catch (error) {
          logger.githubError('Failed to rotate token for connection', {
            error: error instanceof Error ? error.message : 'Unknown error',
            connectionId: connection.$id
          });
          // Continue with other connections
        }
      }

      logger.github('Encryption key rotation completed', {
        connectionsProcessed: connections.length
      });

    } catch (error) {
      logger.githubError('Encryption key rotation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new GitHubIntegrationError('KEY_ROTATION_FAILED', 'Failed to rotate encryption key');
    }
  }

  /**
   * Cleanup expired OAuth states for security
   */
  async cleanupExpiredOAuthStates(): Promise<number> {
    try {
      const expiredStates = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_oauth_states',
          new QueryBuilder()
            .lessThan('expires_at', new Date().toISOString())
            .limit(100)
            .build()
        );
      }, 'getExpiredOAuthStates');

      let deletedCount = 0;
      for (const state of expiredStates.documents) {
        try {
          await executeAppwriteOperation(async () => {
            await databases.deleteDocument(
              DATABASE_ID,
              'github_oauth_states',
              state.$id
            );
          }, 'deleteExpiredOAuthState');
          deletedCount++;
        } catch (error) {
          logger.githubError('Failed to delete expired OAuth state', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stateId: state.$id
          });
        }
      }

      if (deletedCount > 0) {
        logger.github('Cleaned up expired OAuth states', {
          deletedCount
        });
      }

      return deletedCount;

    } catch (error) {
      logger.githubError('Failed to cleanup expired OAuth states', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  // Private helper methods

  private async getConnectionByUserId(userId: string): Promise<GitHubConnection | null> {
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
      }, 'getConnectionByUserId');

      if (result.documents.length === 0) {
        return null;
      }

      return result.documents[0] as unknown as GitHubConnection;

    } catch (error) {
      logger.githubError('Failed to get connection by user ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return null;
    }
  }

  private async updateTokenLastUsed(connectionId: string): Promise<void> {
    try {
      await executeAppwriteOperation(async () => {
        await databases.updateDocument(
          DATABASE_ID,
          'github_connections',
          connectionId,
          { last_used_at: new Date().toISOString() }
        );
      }, 'updateTokenLastUsed');

    } catch (error) {
      logger.githubError('Failed to update token last used timestamp', {
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId
      });
    }
  }

  private extractScopesFromToken(accessToken: string): string[] {
    // This would require additional API call to get token metadata
    // For now, return default scopes
    return ['repo:status', 'read:repo_hook', 'write:repo_hook', 'read:org'];
  }

  private async getAllActiveConnections(): Promise<GitHubConnection[]> {
    try {
      const result = await executeAppwriteOperation(async () => {
        return await databases.listDocuments(
          DATABASE_ID,
          'github_connections',
          new QueryBuilder()
            .equal('is_active', true)
            .limit(1000)
            .build()
        );
      }, 'getAllActiveConnections');

      return result.documents as unknown as GitHubConnection[];

    } catch (error) {
      logger.githubError('Failed to get all active connections', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }
}