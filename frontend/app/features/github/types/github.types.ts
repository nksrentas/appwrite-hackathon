export interface GitHubConnection {
  id: string;
  userId: string;
  githubUserId: string;
  githubUsername: string;
  githubAvatarUrl: string;
  scopes: string[];
  isActive: boolean;
  connectedAt: Date;
  lastSyncAt: Date | null;
  connectionHealth: 'healthy' | 'warning' | 'error';
  totalRepositories: number;
  trackedRepositories: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  language: string | null;
  defaultBranch: string;
  stargazersCount: number;
  forksCount: number;
  size: number;
  lastPushAt: Date;
  isOwner: boolean;
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  owner: {
    login: string;
    type: 'User' | 'Organization';
    avatarUrl: string;
  };
  trackingEnabled: boolean;
  webhookStatus: 'active' | 'inactive' | 'error' | null;
  lastActivity: Date | null;
}

export interface GitHubActivity {
  id: string;
  repositoryId: number;
  repositoryName: string;
  type: 'push' | 'pull_request' | 'workflow_run' | 'deployment' | 'release';
  action: string;
  actor: {
    login: string;
    avatarUrl: string;
  };
  timestamp: Date;
  metadata: Record<string, unknown>;
  carbonImpact: {
    co2Grams: number;
    calculatedAt: Date;
  } | null;
}

export interface GitHubWebhookEvent {
  repositoryId: number;
  eventType: string;
  action: string;
  payload: Record<string, unknown>;
  signature: string;
  deliveryId: string;
  timestamp: Date;
}

export interface GitHubIntegrationHealth {
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastSyncAt: Date | null;
  webhooksHealthy: number;
  webhooksTotal: number;
  recentErrors: Array<{
    error: string;
    timestamp: Date;
    repositoryId?: number;
  }>;
  apiRateLimit: {
    remaining: number;
    total: number;
    resetAt: Date;
  };
}

export interface RepositorySelectionState {
  searchQuery: string;
  selectedRepositories: Set<number>;
  filters: {
    visibility: 'all' | 'public' | 'private';
    ownership: 'all' | 'owner' | 'collaborator' | 'organization';
    language: string | null;
  };
  sortBy: 'name' | 'updated' | 'stars' | 'size';
  sortDirection: 'asc' | 'desc';
}

export interface GitHubOAuthState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  timestamp: Date;
}

export interface GitHubPermissionScope {
  name: string;
  description: string;
  required: boolean;
  granted: boolean;
}

export interface GitHubConnectionSetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  errorMessage?: string;
}