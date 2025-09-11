import { z } from 'zod';
import type {
  GitHubConnection,
  GitHubRepository,
  GitHubActivity,
  GitHubIntegrationHealth,
  GitHubOAuthState,
  GitHubPermissionScope
} from '../types/github.types';

const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3002' 
  : process.env.API_BASE_URL;

// Validation schemas
const GitHubConnectionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  githubUserId: z.string(),
  githubUsername: z.string(),
  githubAvatarUrl: z.string().url(),
  scopes: z.array(z.string()),
  isActive: z.boolean(),
  connectedAt: z.coerce.date(),
  lastSyncAt: z.coerce.date().nullable(),
  connectionHealth: z.enum(['healthy', 'warning', 'error']),
  totalRepositories: z.number().min(0),
  trackedRepositories: z.number().min(0)
}).partial().required({ id: true, userId: true, githubUsername: true });

const GitHubRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  private: z.boolean(),
  language: z.string().nullable(),
  defaultBranch: z.string(),
  stargazersCount: z.number().min(0),
  forksCount: z.number().min(0),
  size: z.number().min(0),
  lastPushAt: z.coerce.date(),
  isOwner: z.boolean(),
  permissions: z.object({
    admin: z.boolean(),
    maintain: z.boolean(),
    push: z.boolean(),
    triage: z.boolean(),
    pull: z.boolean()
  }),
  owner: z.object({
    login: z.string(),
    type: z.enum(['User', 'Organization']),
    avatarUrl: z.string().url()
  }),
  trackingEnabled: z.boolean(),
  webhookStatus: z.enum(['active', 'inactive', 'error']).nullable(),
  lastActivity: z.coerce.date().nullable()
}).partial().required({ id: true, name: true, fullName: true });

class GitHubService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api/v1/integrations/github${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session management
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Unknown error occurred' 
      }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // OAuth Flow Methods
  async initiateOAuthFlow(): Promise<{ authUrl: string; state: string }> {
    const response = await this.makeRequest<{
      authUrl: string;
      state: string;
    }>('/oauth/initiate', {
      method: 'POST'
    });

    return response;
  }

  async handleOAuthCallback(
    code: string, 
    state: string
  ): Promise<GitHubConnection> {
    const response = await this.makeRequest<GitHubConnection>('/oauth/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state })
    });

    return GitHubConnectionSchema.parse(response);
  }

  async validateOAuthState(state: string): Promise<GitHubOAuthState | null> {
    try {
      const response = await this.makeRequest<GitHubOAuthState>(`/oauth/validate/${state}`);
      return response;
    } catch (error) {
      console.error('Failed to validate OAuth state:', error);
      return null;
    }
  }

  // Connection Management
  async getConnection(): Promise<GitHubConnection | null> {
    try {
      const response = await this.makeRequest<GitHubConnection>('/connection');
      return GitHubConnectionSchema.parse(response);
    } catch (error) {
      console.error('Failed to get GitHub connection:', error);
      return null;
    }
  }

  async disconnectGitHub(): Promise<void> {
    await this.makeRequest('/connection', {
      method: 'DELETE'
    });
  }

  async refreshConnection(): Promise<GitHubConnection> {
    const response = await this.makeRequest<GitHubConnection>('/connection/refresh', {
      method: 'POST'
    });

    return GitHubConnectionSchema.parse(response);
  }

  // Repository Management
  async getUserRepositories(params?: {
    page?: number;
    perPage?: number;
    visibility?: 'all' | 'public' | 'private';
    affiliation?: 'owner' | 'collaborator' | 'organization_member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
  }): Promise<{
    repositories: GitHubRepository[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
      hasNext: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('per_page', params.perPage.toString());
    if (params?.visibility) searchParams.set('visibility', params.visibility);
    if (params?.affiliation) searchParams.set('affiliation', params.affiliation);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.direction) searchParams.set('direction', params.direction);

    const response = await this.makeRequest<{
      repositories: unknown[];
      pagination: {
        page: number;
        perPage: number;
        total: number;
        hasNext: boolean;
      };
    }>(`/repositories?${searchParams.toString()}`);

    return {
      repositories: response.repositories.map(repo => GitHubRepositorySchema.parse(repo)),
      pagination: response.pagination
    };
  }

  async enableRepositoryTracking(repositoryIds: number[]): Promise<void> {
    await this.makeRequest('/repositories/tracking', {
      method: 'POST',
      body: JSON.stringify({ repositoryIds })
    });
  }

  async disableRepositoryTracking(repositoryIds: number[]): Promise<void> {
    await this.makeRequest('/repositories/tracking', {
      method: 'DELETE',
      body: JSON.stringify({ repositoryIds })
    });
  }

  async getRepositoryDetails(repositoryId: number): Promise<GitHubRepository> {
    const response = await this.makeRequest<GitHubRepository>(`/repositories/${repositoryId}`);
    return GitHubRepositorySchema.parse(response);
  }

  async syncRepository(repositoryId: number): Promise<void> {
    await this.makeRequest(`/repositories/${repositoryId}/sync`, {
      method: 'POST'
    });
  }

  // Activity Tracking
  async getActivities(params?: {
    repositoryId?: number;
    type?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<GitHubActivity[]> {
    const searchParams = new URLSearchParams();
    if (params?.repositoryId) searchParams.set('repository_id', params.repositoryId.toString());
    if (params?.type) searchParams.set('type', params.type);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.startDate) searchParams.set('start_date', params.startDate.toISOString());
    if (params?.endDate) searchParams.set('end_date', params.endDate.toISOString());

    const response = await this.makeRequest<GitHubActivity[]>(`/activities?${searchParams.toString()}`);
    return response;
  }

  async getRepositoryActivity(
    repositoryId: number,
    params?: {
      limit?: number;
      offset?: number;
      type?: string;
    }
  ): Promise<GitHubActivity[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.type) searchParams.set('type', params.type);

    const response = await this.makeRequest<GitHubActivity[]>(
      `/repositories/${repositoryId}/activities?${searchParams.toString()}`
    );
    return response;
  }

  // Integration Health & Monitoring
  async getIntegrationHealth(): Promise<GitHubIntegrationHealth> {
    const response = await this.makeRequest<GitHubIntegrationHealth>('/health');
    return response;
  }

  async getPermissionScopes(): Promise<GitHubPermissionScope[]> {
    const response = await this.makeRequest<GitHubPermissionScope[]>('/permissions');
    return response;
  }

  async testWebhooks(): Promise<{
    repositoryId: number;
    status: 'success' | 'error';
    message: string;
  }[]> {
    const response = await this.makeRequest<{
      repositoryId: number;
      status: 'success' | 'error';
      message: string;
    }[]>('/webhooks/test', {
      method: 'POST'
    });
    return response;
  }

  // Utility Methods
  generateOAuthState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  isValidWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // This would typically be handled on the backend, but included for completeness
    // Frontend should never have access to webhook secrets
    console.warn('Webhook signature validation should be handled on the backend');
    return false;
  }

  formatRepositorySize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(1);
    return `${size} ${sizes[i]}`;
  }

  getRepositoryLanguageColor(language: string | null): string {
    const languageColors: Record<string, string> = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Python': '#3572A5',
      'Java': '#b07219',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'C++': '#f34b7d',
      'C': '#555555',
      'C#': '#239120',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Swift': '#fa7343',
      'Kotlin': '#F18E33',
      'HTML': '#e34c26',
      'CSS': '#1572B6',
      'Shell': '#89e051',
      'Dockerfile': '#384d54'
    };
    
    return language ? languageColors[language] || '#8b949e' : '#8b949e';
  }
}

export const githubService = new GitHubService();
export type { GitHubService };