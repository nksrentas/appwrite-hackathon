import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  GitBranch, 
  Activity, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Plus,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

import { Button } from '~/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/shared/components/ui/card';
import { Badge } from '~/shared/components/ui/badge';
import { Progress } from '~/shared/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '~/shared/components/ui/avatar';

import { useGitHubIntegration } from '../hooks/use-github-integration';
import { formatDistanceToNow } from 'date-fns';

interface GitHubDashboardWidgetProps {
  className?: string;
  showHeader?: boolean;
}

export function GitHubDashboardWidget({ 
  className = '', 
  showHeader = true 
}: GitHubDashboardWidgetProps) {
  const {
    connection,
    isConnected,
    trackedRepositories,
    recentActivities,
    stats,
    refresh
  } = useGitHubIntegration();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const carbonImpactToday = recentActivities.reduce((total, activity) => 
    total + (activity.carbonImpact?.co2Grams || 0), 0
  );

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          {showHeader && (
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              GitHub Integration
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <GitBranch className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Connect GitHub</h3>
            <p className="text-sm text-gray-600 mb-4">
              Track your development carbon footprint by connecting your GitHub repositories
            </p>
            <Button size="sm">
              <GitBranch className="w-4 h-4 mr-2" />
              Connect GitHub
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              GitHub Integration
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                stats.connectionHealth === 'connected' ? 'bg-green-500' : 
                stats.connectionHealth === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <Activity className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            Development activity and carbon footprint tracking
          </CardDescription>
        </CardHeader>
      )}
      
      <CardContent className="space-y-6">
        {/* Connection Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={connection?.githubAvatarUrl} alt={connection?.githubUsername} />
            <AvatarFallback>
              <GitBranch className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">@{connection?.githubUsername}</p>
            <p className="text-xs text-gray-600">
              {stats.trackedRepositories} repositories tracked
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.recentActivities}</p>
            <p className="text-xs text-gray-600">Activities</p>
            <p className="text-xs text-gray-500">today</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{carbonImpactToday}g</p>
            <p className="text-xs text-gray-600">CO₂</p>
            <p className="text-xs text-gray-500">today</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {stats.healthyWebhooks}/{stats.totalWebhooks}
            </p>
            <p className="text-xs text-gray-600">Webhooks</p>
            <p className="text-xs text-gray-500">healthy</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Recent Activity</h4>
            <Button variant="ghost" size="sm">
              View all
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {recentActivities.slice(0, 3).map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 p-2 rounded border"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {activity.type === 'push' && <GitBranch className="w-3 h-3 text-blue-500" />}
                  {activity.type === 'workflow_run' && <Activity className="w-3 h-3 text-green-500" />}
                  {activity.type === 'deployment' && <ExternalLink className="w-3 h-3 text-purple-500" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {activity.repositoryName}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {activity.type === 'push' && `${activity.metadata.commitCount || 1} commits by ${activity.actor.login}`}
                    {activity.type === 'workflow_run' && `${activity.metadata.workflowName} ${activity.metadata.conclusion}`}
                    {activity.type === 'deployment' && `Deployed by ${activity.actor.login}`}
                  </p>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  {activity.carbonImpact && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {activity.carbonImpact.co2Grams}g
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {recentActivities.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* API Rate Limit */}
        {stats.apiRateLimit && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">API Rate Limit</span>
              <span className="text-xs text-gray-600">
                {stats.apiRateLimit.remaining} / {stats.apiRateLimit.total}
              </span>
            </div>
            <Progress 
              value={(stats.apiRateLimit.remaining / stats.apiRateLimit.total) * 100} 
              className="h-1.5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Resets {formatDistanceToNow(new Date(stats.apiRateLimit.resetAt), { addSuffix: true })}
            </p>
          </div>
        )}

        {/* Health Status */}
        {stats.connectionHealth !== 'connected' && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-yellow-800 font-medium">
              Connection issues detected
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Add Repos
          </Button>
          <Button variant="ghost" size="sm" className="flex-1">
            Manage
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}