import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, Outlet } from '@remix-run/react';
import { useEffect, useState } from 'react';
import {
  Leaf,
  Bell,
  RefreshCw,
  Settings,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';

import { useAuthStore } from '@features/auth/stores/auth.store';
import { useCarbonInsightsStore } from '@features/carbon-insights/stores/carbon-insights.store';
import { ConnectionStatus } from '@features/dashboard/components/connection-status';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@shared/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@shared/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shared/components/ui/tooltip';
import { Separator } from '@shared/components/ui/separator';
import { notificationUtils, useNotifications } from '@shared/components/notification-system';
import { performanceMonitor } from '@shared/utils/performance';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

export default function CarbonInsightsLayout() {
  const { user, isAuthenticated, checkAuth, signOut } = useAuthStore();
  const {
    insights,
    isLoading,
    isConnected,
    error,
    refreshData,
    subscribeToRealTimeUpdates,
    clearError,
  } = useCarbonInsightsStore();

  const { addNotification } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && user) {
      subscribeToRealTimeUpdates(user.$id);
    }
  }, [isAuthenticated, user, subscribeToRealTimeUpdates]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-carbon-900">Authentication Required</h1>
          <p className="text-carbon-600">Please sign in to access carbon insights.</p>
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
    performanceMonitor.startMark('carbon-insights-refresh');
    
    try {
      await refreshData(user.$id);
      addNotification?.(notificationUtils.success(
        'Insights Updated',
        'Latest carbon insights have been loaded'
      ));
    } catch (error) {
      console.error('Refresh failed:', error);
      addNotification?.(notificationUtils.error(
        'Refresh Failed',
        'Could not load latest carbon insights. Please try again.'
      ));
    } finally {
      setRefreshing(false);
      performanceMonitor.endMark('carbon-insights-refresh');
    }
  };

  const handleReconnect = () => {
    if (user) {
      clearError();
      subscribeToRealTimeUpdates(user.$id);
      addNotification?.(notificationUtils.info(
        'Reconnecting...',
        'Attempting to restore real-time carbon insights updates'
      ));
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur-supports-[backdrop-filter]:bg-background/95 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <Link to="/" className="flex items-center space-x-3">
                  <div className="bg-primary p-2 rounded-lg">
                    <Leaf className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-display-md text-foreground font-bold">EcoTrace</span>
                </Link>

                <Separator orientation="vertical" className="h-6" />

                <nav className="hidden md:flex items-center space-x-1">
                  <Button
                    asChild
                    variant="ghost"
                    className="text-body-md font-medium"
                  >
                    <Link to="/dashboard">
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-body-md font-medium"
                  >
                    <Link to="/carbon-insights" className="flex items-center space-x-2">
                      Carbon Insights
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-body-md font-medium"
                  >
                    <Link to="/analytics">
                      Analytics
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-body-md font-medium"
                  >
                    <Link to="/leaderboard">
                      Leaderboard
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-body-md font-medium"
                  >
                    <Link to="/challenges">
                      Challenges
                    </Link>
                  </Button>
                </nav>
              </div>

              <div className="flex items-center space-x-2">
                <ConnectionStatus
                  isConnected={isConnected}
                  isLoading={isLoading}
                  lastUpdated={insights?.lastUpdated}
                  errorMessage={error || undefined}
                  onReconnect={handleReconnect}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefresh}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh carbon insights</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Notifications</p>
                  </TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6" />

                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={(user as any).avatar} alt={user.name || 'User'} />
                          <AvatarFallback>
                            {user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.name || 'Developer'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            @{(user as any).githubUsername || 'username'}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => signOut()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </header>

        <Outlet />
      </div>
    </TooltipProvider>
  );
}