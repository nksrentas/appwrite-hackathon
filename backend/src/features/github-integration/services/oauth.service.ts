import crypto from 'crypto';
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
  GitHubOAuthConfig,
  GitHubOAuthState,
  GitHubConnection,
  OAuthInitiateRequest,
  OAuthInitiateResponse,
  OAuthCallbackRequest,
  OAuthCallbackResponse,
  GitHubOAuthError,
  GitHubAPIError,
  GITHUB_OAUTH_SCOPES,
  GITHUB_OAUTH_URL
} from '../types';
import { GitHubSecurityManager } from './security.service';

export class GitHubOAuthService {
  private config: GitHubOAuthConfig;
  private securityManager: GitHubSecurityManager;

  constructor() {
    this.config = {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI!,
      scopes: [...GITHUB_OAUTH_SCOPES]
    };

    if (!this.config.clientId || !this.config.clientSecret || !this.config.redirectUri) {
      throw new Error('GitHub OAuth configuration is incomplete');
    }

    // Initialize security manager for token encryption
    this.securityManager = new GitHubSecurityManager();
  }

  /**
   * Initiate OAuth flow with PKCE for enhanced security
   */
  async initiateOAuth(request: OAuthInitiateRequest): Promise<OAuthInitiateResponse> {
    try {
      const { userId } = request;

      // Generate secure state and PKCE parameters
      const state = this.generateSecureState();
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);

      // Store OAuth state securely
      await this.storeOAuthState(userId, state, codeVerifier, codeChallenge);

      // Build authorization URL
      const authUrl = new URL(`${GITHUB_OAUTH_URL}/authorize`);
      authUrl.searchParams.set('client_id', this.config.clientId);
      authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
      authUrl.searchParams.set('scope', this.config.scopes.join(' '));
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      logger.github('OAuth flow initiated', {
        userId,
        state,
        scopes: this.config.scopes
      });

      return {
        authUrl: authUrl.toString(),
        state
      };

    } catch (error) {
      logger.githubError('Failed to initiate OAuth flow', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      throw new GitHubOAuthError('Failed to initiate OAuth flow');
    }
  }

  /**
   * Handle OAuth callback and exchange code for access token
   */
  async handleOAuthCallback(request: OAuthCallbackRequest): Promise<OAuthCallbackResponse> {
    try {
      const { code, state, userId } = request;

      // Validate and retrieve OAuth state
      const storedState = await this.validateOAuthState(userId, state);
      if (!storedState) {
        throw new GitHubOAuthError('Invalid or expired OAuth state');
      }

      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCodeForToken(code, storedState.code_verifier);
      
      // Get GitHub user information
      const userInfo = await this.getGitHubUserInfo(tokenResponse.access_token);

      // Create or update GitHub connection
      const connection = await this.createOrUpdateConnection(
        userId,
        userInfo,
        tokenResponse
      );

      // Mark OAuth state as used
      await this.markOAuthStateAsUsed(storedState.$id);

      // Get user's repositories
      const repositories = await this.getUserRepositories(tokenResponse.access_token, connection.$id);

      logger.github('OAuth callback completed successfully', {
        userId,
        githubUserId: userInfo.id,
        githubUsername: userInfo.login,
        repositoriesCount: repositories.length
      });

      return {
        connection,
        repositories
      };

    } catch (error) {
      logger.githubError('OAuth callback failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        state: request.state
      });

      if (error instanceof GitHubOAuthError || error instanceof GitHubAPIError) {
        throw error;
      }
      throw new GitHubOAuthError('OAuth callback processing failed');
    }
  }

  /**
   * Revoke GitHub connection
   */
  async revokeConnection(userId: string, connectionId: string): Promise<void> {
    try {
      // Get connection details
      const connection = await this.getConnection(connectionId);
      if (!connection || connection.user_id !== userId) {
        throw new GitHubOAuthError('Connection not found or unauthorized');
      }

      // Revoke token with GitHub
      try {
        // Decrypt the token before revoking
        const [encryptedToken, iv, authTag] = connection.encrypted_access_token.split(':');
        const encryptedTokenData = { encryptedToken, iv, authTag };
        const decryptedToken = this.securityManager.decryptToken(encryptedTokenData);
        
        await this.revokeGitHubToken(decryptedToken);
      } catch (error) {
        // Continue even if GitHub revocation fails
        logger.githubError('Failed to revoke token with GitHub', {
          error: error instanceof Error ? error.message : 'Unknown error',
          connectionId
        });
      }

      // Deactivate connection in database
      await executeAppwriteOperation(async () => {
        await databases.updateDocument(
          DATABASE_ID,
          'github_connections',
          connectionId,
          { is_active: false }
        );
      }, 'deactivateGitHubConnection');

      logger.github('GitHub connection revoked', {
        userId,
        connectionId,
        githubUsername: connection.github_username
      });

    } catch (error) {
      logger.githubError('Failed to revoke GitHub connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        connectionId
      });
      throw new GitHubOAuthError('Failed to revoke connection');
    }
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(connectionId: string): Promise<string> {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection || !connection.is_active) {
        throw new GitHubOAuthError('Connection not found or inactive');
      }

      // Decrypt the token for validation
      const [encryptedToken, iv, authTag] = connection.encrypted_access_token.split(':');
      const encryptedTokenData = { encryptedToken, iv, authTag };
      const decryptedToken = this.securityManager.decryptToken(encryptedTokenData);

      // Check if token is still valid
      const tokenValid = await this.validateToken(decryptedToken);
      if (tokenValid) {
        // Update last used timestamp
        await this.updateLastUsed(connectionId);
        return decryptedToken;
      }

      // For GitHub, we need to re-authenticate as they don't provide refresh tokens
      throw new GitHubOAuthError('Token expired, re-authentication required');

    } catch (error) {
      logger.githubError('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId
      });
      throw error;
    }
  }

  // Private helper methods

  private generateSecureState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  private async storeOAuthState(
    userId: string,
    state: string,
    codeVerifier: string,
    codeChallenge: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await executeAppwriteOperation(async () => {
      await databases.createDocument(
        DATABASE_ID,
        'github_oauth_states',
        'unique()',
        {
          user_id: userId,
          state,
          code_verifier: codeVerifier,
          code_challenge: codeChallenge,
          expires_at: expiresAt.toISOString(),
          used: false
        },
        PermissionHelper.userOwned(userId)
      );
    }, 'storeOAuthState');
  }

  private async validateOAuthState(userId: string, state: string): Promise<GitHubOAuthState | null> {
    const result = await executeAppwriteOperation(async () => {
      return await databases.listDocuments(
        DATABASE_ID,
        'github_oauth_states',
        new QueryBuilder()
          .equal('user_id', userId)
          .equal('state', state)
          .equal('used', false)
          .greaterThan('expires_at', new Date().toISOString())
          .limit(1)
          .build()
      );
    }, 'validateOAuthState');

    if (result.documents.length === 0) {
      return null;
    }

    return result.documents[0] as unknown as GitHubOAuthState;
  }

  private async markOAuthStateAsUsed(stateId: string): Promise<void> {
    await executeAppwriteOperation(async () => {
      await databases.updateDocument(
        DATABASE_ID,
        'github_oauth_states',
        stateId,
        { used: true }
      );
    }, 'markOAuthStateAsUsed');
  }

  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<any> {
    try {
      const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          code_verifier: codeVerifier
        })
      });

      if (!response.ok) {
        throw new Error(`GitHub token exchange failed: ${response.statusText}`);
      }

      const tokenData = await response.json();

      if ((tokenData as any).error) {
        throw new Error(`GitHub OAuth error: ${(tokenData as any).error_description}`);
      }

      return tokenData;

    } catch (error) {
      logger.githubError('Token exchange failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new GitHubAPIError('Failed to exchange code for token');
    }
  }

  private async getGitHubUserInfo(accessToken: string): Promise<any> {
    try {
      const octokit = new Octokit({ auth: accessToken });
      const { data: user } = await octokit.rest.users.getAuthenticated();
      return user;

    } catch (error) {
      logger.githubError('Failed to get GitHub user info', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new GitHubAPIError('Failed to get user information');
    }
  }

  private async createOrUpdateConnection(
    userId: string,
    userInfo: any,
    tokenResponse: any
  ): Promise<GitHubConnection> {
    // Check if connection already exists
    const existingConnection = await executeAppwriteOperation(async () => {
      return await databases.listDocuments(
        DATABASE_ID,
        'github_connections',
        new QueryBuilder()
          .equal('user_id', userId)
          .equal('github_user_id', userInfo.id.toString())
          .limit(1)
          .build()
      );
    }, 'findExistingConnection');

    // Encrypt the access token for secure storage
    const encryptedTokenData = this.securityManager.encryptToken(tokenResponse.access_token);
    const encryptedToken = `${encryptedTokenData.encryptedToken}:${encryptedTokenData.iv}:${encryptedTokenData.authTag}`;

    const connectionData = {
      user_id: userId,
      github_user_id: userInfo.id.toString(),
      github_username: userInfo.login,
      encrypted_access_token: encryptedToken,
      token_scopes: tokenResponse.scope || this.config.scopes.join(','),
      last_used_at: new Date().toISOString(),
      is_active: true
    };

    if (existingConnection.documents.length > 0) {
      // Update existing connection
      const connectionId = existingConnection.documents[0].$id;
      const updatedConnection = await executeAppwriteOperation(async () => {
        return await databases.updateDocument(
          DATABASE_ID,
          'github_connections',
          connectionId,
          connectionData
        );
      }, 'updateGitHubConnection');

      return updatedConnection as unknown as GitHubConnection;
    } else {
      // Create new connection
      const newConnection = await executeAppwriteOperation(async () => {
        return await databases.createDocument(
          DATABASE_ID,
          'github_connections',
          'unique()',
          connectionData,
          PermissionHelper.userOwned(userId)
        );
      }, 'createGitHubConnection');

      return newConnection as unknown as GitHubConnection;
    }
  }

  private async getUserRepositories(accessToken: string, connectionId: string): Promise<any[]> {
    try {
      const octokit = new Octokit({ auth: accessToken });
      
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner,collaborator,organization_member'
      });

      // Store repositories in database
      const storedRepos = [];
      for (const repo of repos) {
        const repoData = {
          connection_id: connectionId,
          github_repo_id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          owner_login: repo.owner.login,
          is_private: repo.private,
          default_branch: repo.default_branch,
          primary_language: repo.language || undefined,
          tracking_enabled: false,
          last_activity_at: repo.updated_at,
          last_synced_at: new Date().toISOString()
        };

        const storedRepo = await executeAppwriteOperation(async () => {
          return await databases.createDocument(
            DATABASE_ID,
            'github_repositories',
            'unique()',
            repoData,
            PermissionHelper.publicReadOnly()
          );
        }, 'storeGitHubRepository');

        storedRepos.push(storedRepo);
      }

      return storedRepos;

    } catch (error) {
      logger.githubError('Failed to fetch user repositories', {
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId
      });
      throw new GitHubAPIError('Failed to fetch repositories');
    }
  }

  private async getConnection(connectionId: string): Promise<GitHubConnection | null> {
    try {
      const connection = await executeAppwriteOperation(async () => {
        return await databases.getDocument(
          DATABASE_ID,
          'github_connections',
          connectionId
        );
      }, 'getGitHubConnection');

      return connection as unknown as GitHubConnection;

    } catch (error) {
      return null;
    }
  }

  private async revokeGitHubToken(accessToken: string): Promise<void> {
    try {
      const response = await fetch(`https://api.github.com/applications/${this.config.clientId}/token`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: accessToken
        })
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`GitHub token revocation failed: ${response.statusText}`);
      }

    } catch (error) {
      logger.githubError('Failed to revoke GitHub token', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async validateToken(accessToken: string): Promise<boolean> {
    try {
      const octokit = new Octokit({ auth: accessToken });
      await octokit.rest.users.getAuthenticated();
      return true;

    } catch (error) {
      return false;
    }
  }

  private async updateLastUsed(connectionId: string): Promise<void> {
    await executeAppwriteOperation(async () => {
      await databases.updateDocument(
        DATABASE_ID,
        'github_connections',
        connectionId,
        { last_used_at: new Date().toISOString() }
      );
    }, 'updateConnectionLastUsed');
  }
}