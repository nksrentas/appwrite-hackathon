import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { githubService } from '../services/github.service';
import type {
  GitHubConnection,
  GitHubRepository,
  GitHubActivity,
  GitHubIntegrationHealth,
  RepositorySelectionState
} from '../types/github.types';

export interface GitHubState {
  // Connection State
  connection: GitHubConnection | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // OAuth State
  oauthState: string | null;
  oauthRedirectUri: string | null;

  // Repository State
  repositories: GitHubRepository[];
  repositoriesLoading: boolean;
  repositoriesError: string | null;
  selectedRepositoryIds: Set<number>;
  repositorySelection: RepositorySelectionState;

  // Activity State
  activities: GitHubActivity[];
  activitiesLoading: boolean;
  activitiesError: string | null;

  // Health Monitoring
  integrationHealth: GitHubIntegrationHealth | null;
  healthLoading: boolean;

  // Actions - Connection Management
  initiateConnection: () => Promise<{ authUrl: string; state: string }>;
  handleOAuthCallback: (code: string, state: string) => Promise<void>;
  checkConnection: () => Promise<void>;
  disconnectGitHub: () => Promise<void>;
  refreshConnection: () => Promise<void>;

  // Actions - Repository Management
  loadRepositories: (params?: {
    page?: number;
    visibility?: 'all' | 'public' | 'private';
    refresh?: boolean;
  }) => Promise<void>;
  enableRepositoryTracking: (repositoryIds: number[]) => Promise<void>;
  disableRepositoryTracking: (repositoryIds: number[]) => Promise<void>;
  updateRepositorySelection: (updates: Partial<RepositorySelectionState>) => void;
  toggleRepositorySelection: (repositoryId: number) => void;
  selectAllRepositories: () => void;
  clearRepositorySelection: () => void;

  // Actions - Activity Management
  loadActivities: (params?: {
    repositoryId?: number;
    type?: string;
    refresh?: boolean;
  }) => Promise<void>;
  
  // Actions - Health Monitoring
  checkIntegrationHealth: () => Promise<void>;
  testWebhooks: () => Promise<void>;

  // Utility Actions
  clearError: (errorType: 'connection' | 'repositories' | 'activities') => void;
  resetState: () => void;
}

const initialRepositorySelection: RepositorySelectionState = {
  searchQuery: '',
  selectedRepositories: new Set(),
  filters: {
    visibility: 'all',
    ownership: 'all',
    language: null
  },
  sortBy: 'updated',
  sortDirection: 'desc'
};

export const useGitHubStore = create<GitHubState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        connection: null,
        isConnected: false,
        isConnecting: false,
        connectionError: null,

        oauthState: null,
        oauthRedirectUri: null,

        repositories: [],
        repositoriesLoading: false,
        repositoriesError: null,
        selectedRepositoryIds: new Set(),
        repositorySelection: initialRepositorySelection,

        activities: [],
        activitiesLoading: false,
        activitiesError: null,

        integrationHealth: null,
        healthLoading: false,

        // Connection Management Actions
        initiateConnection: async () => {
          try {
            set({ isConnecting: true, connectionError: null });
            
            const result = await githubService.initiateOAuthFlow();
            
            set({
              oauthState: result.state,
              isConnecting: false
            });

            return result;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to initiate GitHub connection';
            set({
              connectionError: errorMessage,
              isConnecting: false
            });
            throw error;
          }
        },

        handleOAuthCallback: async (code: string, state: string) => {
          try {
            set({ isConnecting: true, connectionError: null });

            const connection = await githubService.handleOAuthCallback(code, state);
            
            set({
              connection,
              isConnected: true,
              isConnecting: false,
              oauthState: null
            });

            // Load initial data after successful connection
            await Promise.all([
              get().loadRepositories({ refresh: true }),
              get().checkIntegrationHealth()
            ]);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to complete GitHub connection';
            set({
              connectionError: errorMessage,
              isConnecting: false,
              oauthState: null
            });
            throw error;
          }
        },

        checkConnection: async () => {
          try {
            const connection = await githubService.getConnection();
            
            set({
              connection,
              isConnected: !!connection,
              connectionError: null
            });

            if (connection) {
              // Load data if connected
              await Promise.all([
                get().loadRepositories(),
                get().checkIntegrationHealth()
              ]);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to check connection status';
            set({
              connection: null,
              isConnected: false,
              connectionError: errorMessage
            });
          }
        },

        disconnectGitHub: async () => {
          try {
            set({ isConnecting: true, connectionError: null });
            
            await githubService.disconnectGitHub();
            
            set({
              connection: null,
              isConnected: false,
              isConnecting: false,
              repositories: [],
              selectedRepositoryIds: new Set(),
              activities: [],
              integrationHealth: null,
              repositorySelection: initialRepositorySelection
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect GitHub';
            set({
              connectionError: errorMessage,
              isConnecting: false
            });
            throw error;
          }
        },

        refreshConnection: async () => {
          // Connection refresh is handled automatically by checkConnection
          await get().checkConnection();
        },

        // Repository Management Actions
        loadRepositories: async (params = {}) => {
          try {
            if (params.refresh || get().repositories.length === 0) {
              set({ repositoriesLoading: true, repositoriesError: null });
            }

            const repositories = await githubService.getUserRepositories(params.refresh);

            set({
              repositories,
              repositoriesLoading: false
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load repositories';
            set({
              repositoriesError: errorMessage,
              repositoriesLoading: false
            });
            throw error;
          }
        },

        enableRepositoryTracking: async (repositoryIds: number[]) => {
          try {
            // Enable tracking for each repository individually
            for (const repositoryId of repositoryIds) {
              await githubService.enableRepositoryTracking(repositoryId);
            }
            
            // Update local state
            const updatedRepositories = get().repositories.map(repo => 
              repositoryIds.includes(repo.id) 
                ? { ...repo, trackingEnabled: true, webhookStatus: 'active' as const }
                : repo
            );

            set({ repositories: updatedRepositories });

            // Refresh connection data
            await get().checkConnection();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to enable repository tracking';
            set({ repositoriesError: errorMessage });
            throw error;
          }
        },

        disableRepositoryTracking: async (repositoryIds: number[]) => {
          try {
            // Disable tracking for each repository individually
            for (const repositoryId of repositoryIds) {
              await githubService.disableRepositoryTracking(repositoryId);
            }
            
            // Update local state
            const updatedRepositories = get().repositories.map(repo => 
              repositoryIds.includes(repo.id) 
                ? { ...repo, trackingEnabled: false, webhookStatus: null }
                : repo
            );

            set({ repositories: updatedRepositories });

            // Refresh connection data
            await get().checkConnection();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to disable repository tracking';
            set({ repositoriesError: errorMessage });
            throw error;
          }
        },

        updateRepositorySelection: (updates) => {
          const currentSelection = get().repositorySelection;
          set({
            repositorySelection: { ...currentSelection, ...updates }
          });
        },

        toggleRepositorySelection: (repositoryId) => {
          const currentSelection = get().selectedRepositoryIds;
          const newSelection = new Set(currentSelection);
          
          if (newSelection.has(repositoryId)) {
            newSelection.delete(repositoryId);
          } else {
            newSelection.add(repositoryId);
          }
          
          set({ selectedRepositoryIds: newSelection });
        },

        selectAllRepositories: () => {
          const repositories = get().repositories;
          const allIds = new Set(repositories.map(repo => repo.id));
          set({ selectedRepositoryIds: allIds });
        },

        clearRepositorySelection: () => {
          set({ selectedRepositoryIds: new Set() });
        },

        // Activity Management Actions
        loadActivities: async (params = {}) => {
          // Activity tracking will be implemented in future backend updates
          // For now, just set empty activities to prevent errors
          set({
            activities: [],
            activitiesLoading: false,
            activitiesError: null
          });
        },

        // Health Monitoring Actions
        checkIntegrationHealth: async () => {
          // Health monitoring is included in the status endpoint
          // This will be populated when we call checkConnection
          set({ healthLoading: false });
        },

        testWebhooks: async () => {
          // Webhook testing will be implemented in future backend updates
          // For now, just refresh the repositories to check webhook status
          await get().loadRepositories({ refresh: true });
        },

        // Utility Actions
        clearError: (errorType) => {
          switch (errorType) {
            case 'connection':
              set({ connectionError: null });
              break;
            case 'repositories':
              set({ repositoriesError: null });
              break;
            case 'activities':
              set({ activitiesError: null });
              break;
          }
        },

        resetState: () => {
          set({
            connection: null,
            isConnected: false,
            isConnecting: false,
            connectionError: null,
            oauthState: null,
            oauthRedirectUri: null,
            repositories: [],
            repositoriesLoading: false,
            repositoriesError: null,
            selectedRepositoryIds: new Set(),
            repositorySelection: initialRepositorySelection,
            activities: [],
            activitiesLoading: false,
            activitiesError: null,
            integrationHealth: null,
            healthLoading: false
          });
        }
      }),
      {
        name: 'ecotrace-github',
        partialize: (state) => ({
          connection: state.connection,
          isConnected: state.isConnected,
          repositories: state.repositories.filter(repo => repo.trackingEnabled),
          repositorySelection: {
            ...state.repositorySelection,
            selectedRepositories: new Set() // Don't persist selections
          }
        }),
      }
    ),
    {
      name: 'github-store',
    }
  )
);