import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  GitBranch, 
  Clock,
  Zap,
  Settings,
  ExternalLink
} from 'lucide-react';

import { Button } from '~/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/shared/components/ui/card';
import { Badge } from '~/shared/components/ui/badge';
import { Alert, AlertDescription } from '~/shared/components/ui/alert';
import { Progress } from '~/shared/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '~/shared/components/ui/avatar';

import { useGitHubStore } from '../stores/github.store';
import { useToast } from '~/shared/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface GitHubConnectionStatusProps {
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

export function GitHubConnectionStatus({ 
  compact = false, 
  showActions = true, 
  className = '' 
}: GitHubConnectionStatusProps) {
  const { toast } = useToast();
  
  const {
    connection,
    isConnected,
    isConnecting,
    connectionError,
    integrationHealth,
    repositories,
    checkConnection,
    refreshConnection,
    checkIntegrationHealth,
    disconnectGitHub
  } = useGitHubStore();

  const [refreshing, setRefreshing] = useState(false);

  const trackedRepos = repositories.filter(repo => repo.trackingEnabled);
  const healthyWebhooks = integrationHealth?.webhooksHealthy || 0;
  const totalWebhooks = integrationHealth?.webhooksTotal || 0;

  const getConnectionStatus = () => {
    if (!isConnected) return { status: 'disconnected', label: 'Not Connected', color: 'text-gray-500' };
    if (connectionError) return { status: 'error', label: 'Connection Error', color: 'text-red-500' };
    if (integrationHealth?.connectionStatus === 'error') return { status: 'error', label: 'Integration Error', color: 'text-red-500' };
    if (totalWebhooks > 0 && healthyWebhooks < totalWebhooks) return { status: 'warning', label: 'Partial Issues', color: 'text-yellow-500' };
    return { status: 'healthy', label: 'Connected', color: 'text-green-500' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        checkConnection(),
        checkIntegrationHealth()
      ]);
      
      toast({
        title: 'Status Updated',
        description: 'GitHub connection status has been refreshed.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to update connection status.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleReconnect = async () => {
    try {
      await refreshConnection();
      toast({
        title: 'Connection Refreshed',
        description: 'GitHub connection has been refreshed successfully.',
      });
    } catch (error) {
      toast({
        title: 'Reconnection Failed',
        description: 'Failed to refresh GitHub connection.',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGitHub();
      toast({
        title: 'GitHub Disconnected',
        description: 'Your GitHub account has been disconnected.',
      });
    } catch (error) {
      toast({
        title: 'Disconnection Failed',
        description: 'Failed to disconnect GitHub account.',
        variant: 'destructive',
      });
    }
  };

  const connectionStatus = getConnectionStatus();

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon(connectionStatus.status)}
        <span className={`text-sm font-medium ${connectionStatus.color}`}>
          {connectionStatus.label}
        </span>
        {isConnected && connection && (
          <span className="text-xs text-gray-500">
            @{connection.githubUsername}
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            GitHub Integration Status
          </div>
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || isConnecting}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Connection Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected && connection ? (
              <>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={connection.githubAvatarUrl} alt={connection.githubUsername} />
                  <AvatarFallback>
                    <GitBranch className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(connectionStatus.status)}
                    <span className={`font-medium ${connectionStatus.color}`}>
                      {connectionStatus.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">@{connection.githubUsername}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon('disconnected')}
                    <span className="font-medium text-gray-500">Not Connected</span>
                  </div>
                  <p className="text-sm text-gray-500">GitHub integration not configured</p>
                </div>
              </div>
            )}
          </div>
          
          {isConnected && connection && (
            <Badge variant="outline">
              Connected {formatDistanceToNow(new Date(connection.connectedAt), { addSuffix: true })}
            </Badge>
          )}
        </div>

        {/* Connection Error */}
        {connectionError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        {/* Integration Stats */}
        {isConnected && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Repositories</p>
                <p className="text-2xl font-bold text-gray-900">{trackedRepos.length}</p>
                <p className="text-xs text-gray-600">tracked</p>
              </div>
              <GitBranch className="w-8 h-8 text-gray-400" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Webhooks</p>
                <p className="text-2xl font-bold text-gray-900">{healthyWebhooks}</p>
                <p className="text-xs text-gray-600">of {totalWebhooks} healthy</p>
              </div>
              <Zap className={`w-8 h-8 ${healthyWebhooks === totalWebhooks && totalWebhooks > 0 ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
          </div>
        )}

        {/* API Rate Limit */}
        {isConnected && integrationHealth?.apiRateLimit && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">API Rate Limit</span>
              </div>
              <span className="text-sm text-gray-600">
                {integrationHealth.apiRateLimit.remaining} / {integrationHealth.apiRateLimit.total}
              </span>
            </div>
            <Progress 
              value={(integrationHealth.apiRateLimit.remaining / integrationHealth.apiRateLimit.total) * 100} 
              className="h-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Resets {formatDistanceToNow(new Date(integrationHealth.apiRateLimit.resetAt), { addSuffix: true })}
            </p>
          </div>
        )}

        {/* Last Sync */}
        {isConnected && integrationHealth?.lastSyncAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last synchronized:</span>
            <span className="font-medium">
              {formatDistanceToNow(new Date(integrationHealth.lastSyncAt), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Recent Errors */}
        {integrationHealth?.recentErrors && integrationHealth.recentErrors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">
                {integrationHealth.recentErrors.length} Recent Error(s)
              </span>
            </div>
            <div className="space-y-2">
              {integrationHealth.recentErrors.slice(0, 2).map((error, index) => (
                <div key={index} className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-200">
                  <p className="font-medium text-red-900">{error.error}</p>
                  <p className="text-red-700">
                    {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-4 border-t">
            {isConnected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReconnect}
                  disabled={isConnecting}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                  Reconnect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button size="sm">
                <GitBranch className="w-4 h-4 mr-2" />
                Connect GitHub
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}