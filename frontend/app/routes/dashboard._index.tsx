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
  Goal,
  Save,
} from 'lucide-react';

import { useAuthStore } from '@features/auth/stores/auth.store';
import { useDashboardStore } from '@features/dashboard/stores/dashboard.store';
import { CarbonMetricCard } from '@features/dashboard/components/carbon-metric-card';
import { ActivityFeed } from '@features/dashboard/components/activity-feed';
import { ConnectionStatus } from '@features/dashboard/components/connection-status';
import { MethodologyModal } from '@features/dashboard/components/methodology-modal';
import { TrendChart } from '@features/dashboard/components/trend-chart';
import { ActionItems } from '@features/dashboard/components/action-items';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import { Label } from '@shared/components/ui/label';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { NotificationProvider, useNotifications, notificationUtils } from '@shared/components/notification-system';
import { performanceMonitor, useDebounce } from '@shared/utils/performance';

export const meta: MetaFunction = () => {
  return [
    { title: 'Dashboard - EcoTrace' },
    { name: 'description', content: 'Monitor your real-time carbon footprint dashboard' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {

  return json({
    mockMode: true, // Enable mock mode for development
  });
}

function DashboardContent() {
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

  const { addNotification } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [targetForm, setTargetForm] = useState({
    targetType: 'daily',
    targetValue: '',
    targetPeriod: 'week',
    description: '',
  });
  
  const debouncedTrendPeriod = useDebounce(trendPeriod, 300);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user && isAuthenticated) {
      performanceMonitor.startMark('dashboard-load');
      loadDashboard(user.$id);
      subscribeToRealTimeUpdates(user.$id);
    }

    return () => {
      unsubscribeFromRealTimeUpdates();
      performanceMonitor.endMark('dashboard-load');
    };
  }, [
    user,
    isAuthenticated,
    loadDashboard,
    subscribeToRealTimeUpdates,
    unsubscribeFromRealTimeUpdates,
  ]);

  useEffect(() => {
    if (error) {
      addNotification(notificationUtils.error(
        'Connection Error',
        error,
        {
          action: {
            label: 'Retry',
            onClick: handleReconnect
          }
        }
      ));
    }
  }, [error, addNotification]);

  useEffect(() => {
    if (isConnected && !error) {
      const prevConnectionState = sessionStorage.getItem('dashboardConnected');
      if (prevConnectionState === 'false') {
        addNotification(notificationUtils.success(
          'Connected',
          'Real-time updates restored'
        ));
      }
    }
    sessionStorage.setItem('dashboardConnected', isConnected.toString());
  }, [isConnected, error, addNotification]);

  const handleRefresh = async () => {
    if (!user) return;

    setRefreshing(true);
    performanceMonitor.startMark('dashboard-refresh');
    
    try {
      await refreshData(user.$id);
      addNotification(notificationUtils.success(
        'Dashboard Updated',
        'Latest data has been loaded'
      ));
    } catch (error) {
      console.error('Refresh failed:', error);
      addNotification(notificationUtils.error(
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
      addNotification(notificationUtils.info(
        'Reconnecting...',
        'Attempting to restore real-time updates'
      ));
    }
  };

  const handleActionStart = (actionId: string) => {
    addNotification(notificationUtils.info(
      'Action Started',
      'Carbon reduction action has been initiated'
    ));
  };

  const handleActionComplete = (actionId: string) => {
    addNotification(notificationUtils.success(
      'Action Completed',
      'Great work on reducing your carbon footprint!'
    ));
  };

  const handleConnectRepo = () => {
    // Navigate to GitHub integration setup
    window.location.href = '/integrations/github';
  };

  const handleSetTarget = () => {
    setTargetDialogOpen(true);
  };

  const handleSaveTarget = () => {
    // TODO: Save target to backend
    addNotification(notificationUtils.success(
      'Target Set Successfully',
      `${targetForm.targetValue}g CO₂e ${targetForm.targetType} target has been set`
    ));
    setTargetDialogOpen(false);
    setTargetForm({
      targetType: 'daily',
      targetValue: '',
      targetPeriod: 'week',
      description: '',
    });
  };

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Authentication Required</h1>
          <p className="text-muted-foreground">Please sign in to access your dashboard.</p>
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
        staggerChildren: 0.05,
        duration: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  return (
    <motion.main
      className="max-w-7xl mx-auto px-6 py-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="mb-8" variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-display-lg text-foreground font-bold">
              Good{' '}
              {new Date().getHours() < 12
                ? 'morning'
                : new Date().getHours() < 18
                  ? 'afternoon'
                  : 'evening'}
              , {user?.name?.split(' ')[0] || 'Developer'}!
            </h1>
            <p className="text-body-md text-muted-foreground mt-2">
              Here's your carbon footprint overview for today.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" className="hidden sm:flex" onClick={handleConnectRepo}>
              <Github className="h-4 w-4 mr-2" />
              Connect Repo
            </Button>
            <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleSetTarget}>
                  <Target className="h-4 w-4 mr-2" />
                  Set Target
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Goal className="h-5 w-5" />
                    <span>Set Carbon Target</span>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-type">Target Type</Label>
                    <Select
                      value={targetForm.targetType}
                      onValueChange={(value) => setTargetForm({...targetForm, targetType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily Emissions</SelectItem>
                        <SelectItem value="weekly">Weekly Emissions</SelectItem>
                        <SelectItem value="monthly">Monthly Emissions</SelectItem>
                        <SelectItem value="per-commit">Per Commit</SelectItem>
                        <SelectItem value="per-build">Per Build</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-value">Target Value (g CO₂e)</Label>
                    <Input
                      id="target-value"
                      type="number"
                      placeholder="e.g., 100"
                      value={targetForm.targetValue}
                      onChange={(e) => setTargetForm({...targetForm, targetValue: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-period">Review Period</Label>
                    <Select
                      value={targetForm.targetPeriod}
                      onValueChange={(value) => setTargetForm({...targetForm, targetPeriod: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select review period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Weekly Review</SelectItem>
                        <SelectItem value="month">Monthly Review</SelectItem>
                        <SelectItem value="quarter">Quarterly Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-description">Description (Optional)</Label>
                    <Textarea
                      id="target-description"
                      placeholder="Why are you setting this target?"
                      value={targetForm.description}
                      onChange={(e) => setTargetForm({...targetForm, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setTargetDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveTarget}
                      disabled={!targetForm.targetValue}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Target
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {lastActivity && (
          <motion.div
            className="bg-card border border-border rounded-lg p-4 mb-6"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-primary p-1 rounded-full">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-body-sm text-foreground font-medium">
                  New activity detected: {lastActivity.type} in {lastActivity.repository}
                </p>
                <p className="text-caption text-muted-foreground">
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
          />
        </motion.div>
      </motion.div>

      <motion.div className="mb-8" variants={itemVariants}>
        <TrendChart
          period={debouncedTrendPeriod}
          onPeriodChange={setTrendPeriod}
          isLoading={isLoading}
          showTarget={true}
          showEfficiency={false}
          height={350}
        />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        <motion.div className="lg:col-span-2" variants={itemVariants}>
          <ActivityFeed
            activities={recentActivities}
            isLoading={isLoading}
            showRealTimeIndicator={isConnected}
            maxItems={8}
          />
        </motion.div>

        <motion.div className="space-y-6" variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Your Rank</span>
                </div>
                <MethodologyModal
                  carbonValue={metrics?.todayCarbon || 0}
                  trigger={
                    <Button variant="ghost" size="sm" className="text-carbon-500 hover:text-carbon-700">
                      <span className="sr-only">How is this calculated?</span>
                      ?
                    </Button>
                  }
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold text-primary">
                  #{metrics?.leaderboardPosition || '--'}
                </div>
                <p className="text-body-sm text-muted-foreground">Out of 2,847 developers</p>
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

          <Card>
            <CardHeader>
              <CardTitle>This Week's Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-body-sm text-muted-foreground">Commits</span>
                <span className="font-medium text-foreground">42</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-body-sm text-muted-foreground">Pull Requests</span>
                <span className="font-medium text-foreground">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-body-sm text-muted-foreground">CI Runs</span>
                <span className="font-medium text-foreground">156</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-body-sm text-muted-foreground">Deployments</span>
                <span className="font-medium text-foreground">12</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div className="mt-12" variants={itemVariants}>
        <ActionItems
          onActionStart={handleActionStart}
          onActionComplete={handleActionComplete}
        />
      </motion.div>
    </motion.main>
  );
}

export default function Dashboard() {
  return (
    <NotificationProvider position="top-right" maxNotifications={3}>
      <DashboardContent />
    </NotificationProvider>
  );
}