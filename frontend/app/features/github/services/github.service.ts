import { z } from 'zod';
import type {
  GitHubConnection,
  GitHubRepository,
  GitHubActivity,
  GitHubIntegrationHealth,
  GitHubOAuthState,
  GitHubPermissionScope
} from '../types/github.types';

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3002' 
  : '/api'; // Use relative path for production

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
  private readonly isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  private readonly mockMode = false; // Disabled mock mode - use real API calls

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Return mock data in development mode when mock mode is enabled
    if (this.mockMode) {
      return this.getMockData<T>(endpoint, options.method || 'GET');
    }

    const url = `${API_BASE_URL}/api/github${endpoint}`;
    
    try {
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
        
        // Handle the backend's standardized error format
        if (errorData.success === false && errorData.error) {
          throw new Error(errorData.error.message || errorData.error.code || 'Unknown error');
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Handle backend's success/error format
      if (result.success === false) {
        throw new Error(result.error?.message || result.error?.code || 'Request failed');
      }
      
      // Return the data from successful responses
      return result.data || result;
    } catch (error) {
      if (this.isDevelopment) {
        console.error('GitHub API Error:', {
          endpoint,
          method: options.method || 'GET',
          error: error instanceof Error ? error.message : error
        });
      }
      throw error;
    }
  }

  private getMockData<T>(endpoint: string, method: string): Promise<T> {
    // Mock data for development and testing
    const mockResponses: Record<string, any> = {
      'POST:/oauth/initiate': {
        authUrl: 'https://github.com/login/oauth/authorize?client_id=mock&state=mock-state',
        state: 'mock-state'
      },
      'POST:/oauth/callback': {
        id: 'mock-connection-1',
        userId: 'user-1',
        githubUserId: '12345',
        githubUsername: 'testuser',
        githubAvatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        scopes: ['repo', 'user:email'],
        isActive: true,
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        connectionHealth: 'healthy' as const,
        totalRepositories: 10,
        trackedRepositories: 3
      },
      'GET:/status': {
        id: 'mock-connection-1',
        userId: 'user-1',
        githubUserId: '12345',
        githubUsername: 'testuser',
        githubAvatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        scopes: ['repo', 'user:email'],
        isActive: true,
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        connectionHealth: 'healthy' as const,
        totalRepositories: 10,
        trackedRepositories: 3
      },
      'GET:/repositories': [
        {
          id: 1,
          name: 'awesome-project',
          fullName: 'testuser/awesome-project',
          description: 'An awesome React project' as string | null,
          private: false,
          language: 'TypeScript',
          defaultBranch: 'main',
          stargazersCount: 42,
          forksCount: 8,
          size: 1024,
          lastPushAt: new Date(),
          isOwner: true,
          permissions: { admin: true, maintain: true, push: true, triage: true, pull: true },
          owner: { login: 'testuser', type: 'User' as const, avatarUrl: 'https://avatars.githubusercontent.com/u/12345' },
          trackingEnabled: true,
          webhookStatus: 'active' as const,
          lastActivity: new Date()
        },
        {
          id: 2,
          name: 'backend-api',
          fullName: 'testuser/backend-api',
          description: 'Node.js backend API' as string | null,
          private: true,
          language: 'JavaScript',
          defaultBranch: 'main',
          stargazersCount: 15,
          forksCount: 3,
          size: 2048,
          lastPushAt: new Date(),
          isOwner: true,
          permissions: { admin: true, maintain: true, push: true, triage: true, pull: true },
          owner: { login: 'testuser', type: 'User' as const, avatarUrl: 'https://avatars.githubusercontent.com/u/12345' },
          trackingEnabled: false,
          webhookStatus: null,
          lastActivity: null
        }
      ]
    };

    const key = `${method}:${endpoint}`;
    const mockData = mockResponses[key];
    
    if (mockData) {
      // Simulate network delay
      return new Promise(resolve => {
        setTimeout(() => resolve(mockData), 500 + Math.random() * 1000);
      });
    }

    // Default mock response
    return Promise.resolve({} as T);
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

  // OAuth state validation is handled internally by the backend

  // Connection Management
  async getConnection(): Promise<GitHubConnection | null> {
    try {
      const response = await this.makeRequest<GitHubConnection>('/status');
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

  // Connection refresh is handled automatically by the backend

  // Repository Management
  async getUserRepositories(refresh?: boolean): Promise<GitHubRepository[]> {
    const searchParams = new URLSearchParams();
    if (refresh) searchParams.set('refresh', 'true');

    const response = await this.makeRequest<GitHubRepository[]>(`/repositories?${searchParams.toString()}`);

    return response.map(repo => GitHubRepositorySchema.parse(repo));
  }

  async enableRepositoryTracking(repositoryId: number, webhookEvents?: string[]): Promise<void> {
    await this.makeRequest(`/repositories/${repositoryId}/tracking`, {
      method: 'POST',
      body: JSON.stringify({ webhookEvents })
    });
  }

  async disableRepositoryTracking(repositoryId: number): Promise<void> {
    await this.makeRequest(`/repositories/${repositoryId}/tracking`, {
      method: 'DELETE'
    });
  }

  // Repository details are included in the main repositories list

  async syncRepositories(): Promise<void> {
    await this.makeRequest('/repositories/sync', {
      method: 'POST'
    });
  }

  // Activity tracking will be implemented in future backend updates

  // Integration health monitoring is included in the status endpoint

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