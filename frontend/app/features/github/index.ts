// Components
export { GitHubConnectionSetup } from './components/github-connection-setup';
export { GitHubRepositorySelection } from './components/github-repository-selection';
export { GitHubDashboard } from './components/github-dashboard';
export { GitHubConnectionStatus } from './components/github-connection-status';
export { GitHubDashboardWidget } from './components/github-dashboard-widget';

// Hooks
export { useGitHubIntegration } from './hooks/use-github-integration';

// Services
export { githubService } from './services/github.service';
export type { GitHubService } from './services/github.service';

// Stores
export { useGitHubStore } from './stores/github.store';
export type { GitHubState } from './stores/github.store';

// Types
export type {
  GitHubConnection,
  GitHubRepository,
  GitHubActivity,
  GitHubIntegrationHealth,
  GitHubWebhookEvent,
  RepositorySelectionState,
  GitHubOAuthState,
  GitHubPermissionScope,
  GitHubConnectionSetupStep
} from './types/github.types';