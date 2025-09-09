import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  TrendingUp,
  Users,
  Settings,
  BarChart3,
  Leaf,
  Bell,
  RefreshCw,
  Github,
  Target,
} from 'lucide-react';

import { useAuthStore } from '~/stores/auth.store';
import { useDashboardStore } from '~/stores/dashboard.store';
import { CarbonMetricCard } from '~/components/dashboard/carbon-metric-card';
import { ActivityFeed } from '~/components/dashboard/activity-feed';
import { ConnectionStatus } from '~/components/dashboard/connection-status';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';

export const meta: MetaFunction = () => {
  return [
    { title: 'Dashboard - EcoTrace' },
    { name: 'description', content: 'Monitor your real-time carbon footprint dashboard' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // In a real app, we'd check authentication server-side
  // For now, we'll handle it client-side with the auth store

  return json({
    // Mock data for development
    mockMode: process.env.NODE_ENV === 'development',
  });
}

export default function Dashboard() {
  const { mockMode } = useLoaderData<typeof loader>();
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const {
    metrics,
    recentActivities,
    isLoading,
    isConnected,
    error,
    lastActivity,
    loadDashboard,
    subscribeToRealTimeUpdates,
    unsubscribeFromRealTimeUpdates,
    refreshData,
    clearError,
  } = useDashboardStore();

  const [refreshing, setRefreshing] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load dashboard data when user is authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      loadDashboard(user.$id);
      subscribeToRealTimeUpdates(user.$id);
    }

    return () => {
      unsubscribeFromRealTimeUpdates();
    };
  }, [
    user,
    isAuthenticated,
    loadDashboard,
    subscribeToRealTimeUpdates,
    unsubscribeFromRealTimeUpdates,
  ]);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      await refreshData(user.$id);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle reconnection
  const handleReconnect = () => {
    if (user) {
      clearError();
      subscribeToRealTimeUpdates(user.$id);
    }
  };

  // Redirect if not authenticated
  if (!isAuthenticated && !isLoading) {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-carbon-50 via-primary-50/20 to-background">
      {/* Dashboard Header */}
      <header className="border-b border-carbon-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and navigation */}
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
              </nav>
            </div>

            {/* User actions */}
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

      {/* Main Dashboard Content */}
      <motion.main
        className="max-w-7xl mx-auto px-4 lg:px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Section */}
        <motion.div className="mb-8" variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-display-lg text-carbon-900 font-bold">
                Good{' '}
                {new Date().getHours() < 12
                  ? 'morning'
                  : new Date().getHours() < 18
                    ? 'afternoon'
                    : 'evening'}
                , {user?.name?.split(' ')[0] || 'Developer'}!
              </h1>
              <p className="text-body-md text-carbon-600 mt-2">
                Here's your carbon footprint overview for today.
              </p>
            </div>

            {/* Quick actions */}
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="hidden sm:flex">
                <Github className="h-4 w-4 mr-2" />
                Connect Repo
              </Button>
              <Button>
                <Target className="h-4 w-4 mr-2" />
                Set Target
              </Button>
            </div>
          </div>

          {/* New activity notification */}
          {lastActivity && (
            <motion.div
              className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center space-x-3">
                <div className="bg-primary-500 p-1 rounded-full">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-body-sm text-primary-800 font-medium">
                    New activity detected: {lastActivity.type} in {lastActivity.repository}
                  </p>
                  <p className="text-caption text-primary-600">
                    Carbon impact:{' '}
                    {lastActivity.carbonValue
                      ? `${lastActivity.carbonValue}${lastActivity.carbonUnit}`
                      : 'Calculating...'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Carbon Metrics Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <CarbonMetricCard
              title="Today's Carbon"
              value={metrics?.todayCarbon || 0}
              trend={metrics?.carbonTrend}
              trendValue={12.5}
              period="vs yesterday"
              isLoading={isLoading}
              isRealtime={isConnected}
              lastUpdated={metrics?.lastUpdated}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <CarbonMetricCard
              title="This Week"
              value={metrics?.weekCarbon || 0}
              trend="down"
              trendValue={8.2}
              period="vs last week"
              isLoading={isLoading}
              icon={Calendar}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <CarbonMetricCard
              title="This Month"
              value={metrics?.monthCarbon || 0}
              trend="stable"
              trendValue={2.1}
              period="vs last month"
              isLoading={isLoading}
              icon={BarChart3}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <CarbonMetricCard
              title="Efficiency Score"
              value={metrics?.efficiencyScore || 0}
              unit="kg" // This would be a different metric
              trend="up"
              trendValue={15.3}
              period="improvement"
              isLoading={isLoading}
              icon={Target}
              className="carbon-glow"
            />
          </motion.div>
        </motion.div>

        {/* Dashboard Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Activity Feed */}
          <motion.div className="lg:col-span-2" variants={itemVariants}>
            <ActivityFeed
              activities={recentActivities}
              isLoading={isLoading}
              showRealTimeIndicator={isConnected}
              maxItems={8}
            />
          </motion.div>

          {/* Sidebar with additional info */}
          <motion.div className="space-y-6" variants={itemVariants}>
            {/* Leaderboard Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Your Rank</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-4xl font-bold text-primary-500">
                    #{metrics?.leaderboardPosition || '--'}
                  </div>
                  <p className="text-body-sm text-carbon-600">Out of 2,847 developers</p>
                  <Badge variant="success" className="w-full justify-center">
                    Top 15% Efficiency
                  </Badge>
                  <Link to="/leaderboard">
                    <Button variant="outline" className="w-full">
                      View Full Leaderboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>This Week's Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-carbon-600">Commits</span>
                  <span className="font-medium">42</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-carbon-600">Pull Requests</span>
                  <span className="font-medium">8</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-carbon-600">CI Runs</span>
                  <span className="font-medium">156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-carbon-600">Deployments</span>
                  <span className="font-medium">12</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
