import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, Outlet } from '@remix-run/react';
import { useEffect, useState } from 'react';
import {
  Leaf,
  Bell,
  RefreshCw,
  Settings,
} from 'lucide-react';

import { useAuthStore } from '@features/auth/stores/auth.store';
import { useDashboardStore } from '@features/dashboard/stores/dashboard.store';
import { ConnectionStatus } from '@features/dashboard/components/connection-status';
import { Button } from '@shared/components/ui/button';
import { notificationUtils, useNotifications } from '@shared/components/notification-system';
import { performanceMonitor } from '@shared/utils/performance';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

export default function DashboardLayout() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const {
    metrics,
    isLoading,
    isConnected,
    error,
    refreshData,
    subscribeToRealTimeUpdates,
    clearError,
  } = useDashboardStore();

  const { addNotification } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-carbon-900">Authentication Required</h1>
          <p className="text-carbon-600">Please sign in to access your dashboard.</p>
          <Link to="/">
            <Button>Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    if (!user) return;

    setRefreshing(true);
    performanceMonitor.startMark('dashboard-refresh');
    
    try {
      await refreshData(user.$id);
      addNotification?.(notificationUtils.success(
        'Dashboard Updated',
        'Latest data has been loaded'
      ));
    } catch (error) {
      console.error('Refresh failed:', error);
      addNotification?.(notificationUtils.error(
        'Refresh Failed',
        'Could not load latest data. Please try again.'
      ));
    } finally {
      setRefreshing(false);
      performanceMonitor.endMark('dashboard-refresh');
    }
  };

  const handleReconnect = () => {
    if (user) {
      clearError();
      subscribeToRealTimeUpdates(user.$id);
      addNotification?.(notificationUtils.info(
        'Reconnecting...',
        'Attempting to restore real-time updates'
      ));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-carbon-50 via-primary-50/20 to-background">
      <header className="border-b border-carbon-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-3">
                <div className="bg-primary-500 p-2 rounded-lg carbon-glow">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <span className="text-display-md text-carbon-900 font-bold">EcoTrace</span>
              </Link>

              <nav className="hidden md:flex space-x-6">
                <Link
                  to="/dashboard"
                  className="text-body-md text-primary-600 font-medium border-b-2 border-primary-500 pb-1"
                >
                  Dashboard
                </Link>
                <Link
                  to="/analytics"
                  className="text-body-md text-carbon-600 hover:text-carbon-900 transition-colors"
                >
                  Analytics
                </Link>
                <Link
                  to="/leaderboard"
                  className="text-body-md text-carbon-600 hover:text-carbon-900 transition-colors"
                >
                  Leaderboard
                </Link>
                <Link
                  to="/challenges"
                  className="text-body-md text-carbon-600 hover:text-carbon-900 transition-colors"
                >
                  Challenges
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <ConnectionStatus
                isConnected={isConnected}
                isLoading={isLoading}
                lastUpdated={metrics?.lastUpdated}
                errorMessage={error || undefined}
                onReconnect={handleReconnect}
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="touch-target"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>

              <Button variant="ghost" size="icon" className="touch-target">
                <Bell className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" className="touch-target">
                <Settings className="h-4 w-4" />
              </Button>

              {user && (
                <div className="flex items-center space-x-3 pl-4 border-l border-carbon-200">
                  <div className="text-right">
                    <div className="text-body-sm font-medium text-carbon-900">
                      {user.name || 'Developer'}
                    </div>
                    <div className="text-caption text-carbon-500">
                      @{(user as any).githubUsername || 'username'}
                    </div>
                  </div>
                  {(user as any).avatar && (
                    <img
                      src={(user as any).avatar}
                      alt="Profile"
                      className="h-8 w-8 rounded-full ring-2 ring-primary-500/20"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}