import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  Activity, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  BarChart3,
  Zap,
  Clock,
  Globe,
  Lock,
  Building
} from 'lucide-react';

import { Button } from '~/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/shared/components/ui/card';
import { Badge } from '~/shared/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '~/shared/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '~/shared/components/ui/avatar';
import { Progress } from '~/shared/components/ui/progress';

import { useGitHubStore } from '../stores/github.store';
import { githubService } from '../services/github.service';
import { useToast } from '~/shared/hooks/use-toast';
import type { GitHubRepository, GitHubActivity } from '../types/github.types';
import { formatDistanceToNow } from 'date-fns';

export function GitHubDashboard() {
  const { toast } = useToast();
  
  const {
    connection,
    isConnected,
    repositories,
    activities,
    integrationHealth,
    repositoriesLoading,
    activitiesLoading,
    healthLoading,
    loadRepositories,
    loadActivities,
    checkIntegrationHealth,
    disableRepositoryTracking,
    testWebhooks,
    initiateConnection,
    isConnecting
  } = useGitHubStore();

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isConnected) {
      Promise.all([
        loadRepositories(),
        loadActivities({ refresh: true })
      ]);
    }
  }, [isConnected, loadRepositories, loadActivities]);

  const trackedRepositories = repositories.filter(repo => repo.trackingEnabled);
  const recentActivities = activities.slice(0, 10);

  const handleRefreshAll = async () => {
    try {
      await Promise.all([
        loadRepositories({ refresh: true }),
        loadActivities({ refresh: true })
      ]);
      toast({
        title: 'Data Refreshed',
        description: 'All GitHub integration data has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh GitHub data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTestWebhooks = async () => {
    try {
      await testWebhooks();
      toast({
        title: 'Webhook Test Complete',
        description: 'All webhooks have been tested. Check the status in the repositories tab.',
      });
    } catch (error) {
      toast({
        title: 'Webhook Test Failed',
        description: 'Failed to test webhooks. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveRepository = async (repositoryId: number) => {
    try {
      await disableRepositoryTracking([repositoryId]);
      toast({
        title: 'Repository Removed',
        description: 'Repository tracking has been disabled.',
      });
    } catch (error) {
      toast({
        title: 'Removal Failed',
        description: 'Failed to remove repository tracking.',
        variant: 'destructive',
      });
    }
  };

  const handleConnectGitHub = async () => {
    try {
      const { authUrl } = await initiateConnection();
      window.location.href = authUrl;
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Failed to start GitHub connection. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <GitBranch className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">GitHub Not Connected</h2>
        <p className="text-gray-600 mb-4">
          Connect your GitHub account to start tracking repository carbon footprint
        </p>
        <Button 
          onClick={handleConnectGitHub}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect GitHub'}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={connection?.githubAvatarUrl} alt={connection?.githubUsername} />
                <AvatarFallback>
                  <GitBranch className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">GitHub Integration</h1>
                <p className="text-gray-600">@{connection?.githubUsername}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  integrationHealth?.connectionStatus === 'connected' ? 'bg-green-500' : 
                  integrationHealth?.connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-600 capitalize">
                  {integrationHealth?.connectionStatus || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              disabled={repositoriesLoading || activitiesLoading || healthLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(repositoriesLoading || activitiesLoading || healthLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleTestWebhooks}
            >
              <Zap className="w-4 h-4 mr-2" />
              Test Webhooks
            </Button>
          </div>
        </div>

        {/* Health Alerts */}
        {integrationHealth?.recentErrors && integrationHealth.recentErrors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Integration Issues Detected</AlertTitle>
            <AlertDescription>
              {integrationHealth.recentErrors.length} error(s) in the last 24 hours. 
              Check the monitoring tab for details.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="repositories">Repositories</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stats Cards */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tracked Repositories</p>
                      <p className="text-2xl font-bold">{trackedRepositories.length}</p>
                    </div>
                    <GitBranch className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Webhooks</p>
                      <p className="text-2xl font-bold">
                        {integrationHealth?.webhooksHealthy || 0}
                      </p>
                      <p className="text-xs text-gray-500">
                        of {integrationHealth?.webhooksTotal || 0} total
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Recent Activities</p>
                      <p className="text-2xl font-bold">{recentActivities.length}</p>
                      <p className="text-xs text-gray-500">last 24 hours</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">API Rate Limit</p>
                      <p className="text-2xl font-bold">
                        {integrationHealth?.apiRateLimit?.remaining || 0}
                      </p>
                      <p className="text-xs text-gray-500">
                        of {integrationHealth?.apiRateLimit?.total || 5000} remaining
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                  {integrationHealth?.apiRateLimit && (
                    <Progress 
                      value={(integrationHealth.apiRateLimit.remaining / integrationHealth.apiRateLimit.total) * 100} 
                      className="mt-2"
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest repository activities and their carbon impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivities.slice(0, 5).map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activities</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="repositories" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Tracked Repositories</h2>
                <p className="text-sm text-gray-600">
                  {trackedRepositories.length} repositories being monitored
                </p>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Repository
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {trackedRepositories.map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  repository={repo}
                  onRemove={() => handleRemoveRepository(repo.id)}
                />
              ))}
            </div>

            {trackedRepositories.length === 0 && (
              <div className="text-center py-12">
                <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories tracked</h3>
                <p className="text-gray-600 mb-4">
                  Add repositories to start tracking their carbon footprint
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Repository
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>
                  Chronological list of all tracked repository activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} detailed />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No activities recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Connection Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Connection Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Status</span>
                    <Badge variant={integrationHealth?.connectionStatus === 'connected' ? 'default' : 'destructive'}>
                      {integrationHealth?.connectionStatus || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Sync</span>
                    <span className="text-sm text-gray-600">
                      {integrationHealth?.lastSyncAt 
                        ? formatDistanceToNow(new Date(integrationHealth.lastSyncAt), { addSuffix: true })
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Webhooks Healthy</span>
                    <span className="text-sm">
                      {integrationHealth?.webhooksHealthy || 0} / {integrationHealth?.webhooksTotal || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* API Rate Limiting */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    API Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Rate Limit</span>
                      <span className="text-sm">
                        {integrationHealth?.apiRateLimit?.remaining || 0} / {integrationHealth?.apiRateLimit?.total || 5000}
                      </span>
                    </div>
                    {integrationHealth?.apiRateLimit && (
                      <Progress 
                        value={(integrationHealth.apiRateLimit.remaining / integrationHealth.apiRateLimit.total) * 100}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Resets At</span>
                    <span className="text-sm text-gray-600">
                      {integrationHealth?.apiRateLimit?.resetAt
                        ? formatDistanceToNow(new Date(integrationHealth.apiRateLimit.resetAt), { addSuffix: true })
                        : 'Unknown'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Errors */}
            {integrationHealth?.recentErrors && integrationHealth.recentErrors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Recent Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {integrationHealth.recentErrors.map((error, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900">{error.error}</p>
                          <p className="text-xs text-red-700">
                            {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true })}
                            {error.repositoryId && ` • Repository ID: ${error.repositoryId}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

interface RepositoryCardProps {
  repository: GitHubRepository;
  onRemove: () => void;
}

function RepositoryCard({ repository, onRemove }: RepositoryCardProps) {
  const languageColor = githubService.getRepositoryLanguageColor(repository.language);
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{repository.name}</h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {repository.private ? (
                  <Lock className="w-4 h-4 text-amber-600" />
                ) : (
                  <Globe className="w-4 h-4 text-green-600" />
                )}
                {repository.owner.type === 'Organization' && (
                  <Building className="w-4 h-4 text-blue-600" />
                )}
              </div>
            </div>
            
            {repository.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {repository.description}
              </p>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {repository.language && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: languageColor }}
                />
                <span>{repository.language}</span>
              </div>
            )}
            
            <Badge variant={repository.webhookStatus === 'active' ? 'default' : 'destructive'}>
              {repository.webhookStatus || 'inactive'}
            </Badge>
          </div>

          <Button variant="ghost" size="sm">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {repository.lastActivity && (
          <div className="mt-2 pt-2 border-t text-xs text-gray-500">
            Last activity: {formatDistanceToNow(new Date(repository.lastActivity), { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ActivityItemProps {
  activity: GitHubActivity;
  detailed?: boolean;
}

function ActivityItem({ activity, detailed = false }: ActivityItemProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'push':
        return <GitBranch className="w-4 h-4 text-blue-500" />;
      case 'workflow_run':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'deployment':
        return <ExternalLink className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatActivityDescription = (activity: GitHubActivity) => {
    switch (activity.type) {
      case 'push':
        return `${activity.actor.login} pushed ${(activity.metadata.commitCount as number) || 1} commit(s)`;
      case 'workflow_run':
        return `${activity.metadata.workflowName as string} workflow ${activity.metadata.conclusion as string}`;
      case 'deployment':
        return `Deployed to ${activity.metadata.environment || 'production'}`;
      default:
        return `${activity.type} by ${activity.actor.login}`;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <div className="flex-shrink-0">
        {getActivityIcon(activity.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium">
              {formatActivityDescription(activity)}
            </p>
            <p className="text-xs text-gray-600">
              {activity.repositoryName}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {activity.carbonImpact && (
              <Badge variant="outline" className="text-xs">
                {activity.carbonImpact.co2Grams}g CO₂
              </Badge>
            )}
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>

        {detailed && activity.metadata && (
          <div className="mt-2 text-xs text-gray-500">
            <div className="flex gap-4">
              {activity.metadata.branch && (
                <span>Branch: {activity.metadata.branch as string}</span>
              )}
              {activity.metadata.filesChanged && typeof activity.metadata.filesChanged === 'number' && (
                <span>Files: {activity.metadata.filesChanged as number}</span>
              )}
              {activity.metadata.durationMs && typeof activity.metadata.durationMs === 'number' && (
                <span>Duration: {Math.round((activity.metadata.durationMs as number) / 1000)}s</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}