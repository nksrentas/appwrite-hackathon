import { useEffect, useCallback } from 'react';
import { useGitHubStore } from '../stores/github.store';
import { useToast } from '~/shared/hooks/use-toast';

export function useGitHubIntegration() {
  const { toast } = useToast();
  
  const {
    connection,
    isConnected,
    isConnecting,
    connectionError,
    repositories,
    activities,
    integrationHealth,
    checkConnection,
    loadRepositories,
    loadActivities,
    checkIntegrationHealth,
    clearError
  } = useGitHubStore();

  // Initialize integration on hook mount
  const initialize = useCallback(async () => {
    try {
      await checkConnection();
    } catch (error) {
      console.error('Failed to initialize GitHub integration:', error);
    }
  }, [checkConnection]);

  // Load integration data
  const loadData = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      await Promise.all([
        loadRepositories(),
        loadActivities({ refresh: true })
      ]);
    } catch (error) {
      console.error('Failed to load GitHub integration data:', error);
      toast({
        title: 'Data Loading Failed',
        description: 'Failed to load GitHub integration data. Please refresh the page.',
        variant: 'destructive',
      });
    }
  }, [isConnected, loadRepositories, loadActivities, toast]);

  // Refresh all data
  const refresh = useCallback(async () => {
    try {
      await Promise.all([
        loadRepositories({ refresh: true }),
        loadActivities({ refresh: true })
      ]);
      
      toast({
        title: 'Data Refreshed',
        description: 'GitHub integration data has been updated.',
      });
    } catch (error) {
      console.error('Failed to refresh GitHub integration data:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh GitHub data. Please try again.',
        variant: 'destructive',
      });
    }
  }, [loadRepositories, loadActivities, toast]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-load data when connected
  useEffect(() => {
    if (isConnected) {
      loadData();
    }
  }, [isConnected, loadData]);

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      toast({
        title: 'GitHub Connection Issue',
        description: connectionError,
        variant: 'destructive',
      });
    }
  }, [connectionError, toast]);

  const trackedRepositories = repositories.filter(repo => repo.trackingEnabled);
  const recentActivities = activities.slice(0, 10);

  return {
    // State
    connection,
    isConnected,
    isConnecting,
    connectionError,
    repositories,
    trackedRepositories,
    activities,
    recentActivities,
    integrationHealth,
    
    // Actions
    initialize,
    loadData,
    refresh,
    clearError: (errorType: 'connection' | 'repositories' | 'activities') => clearError(errorType),
    
    // Computed values
    stats: {
      totalRepositories: repositories.length,
      trackedRepositories: trackedRepositories.length,
      recentActivities: recentActivities.length,
      healthyWebhooks: integrationHealth?.webhooksHealthy || 0,
      totalWebhooks: integrationHealth?.webhooksTotal || 0,
      apiRateLimit: integrationHealth?.apiRateLimit,
      connectionHealth: integrationHealth?.connectionStatus || 'unknown'
    }
  };
}