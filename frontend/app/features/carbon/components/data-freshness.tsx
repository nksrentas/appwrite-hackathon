import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Calendar,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Progress } from '@shared/components/ui/progress';
import { cn } from '@shared/utils/cn';
import type { DataFreshnessProps } from '@features/carbon/types';
import { useWebSocket } from '@features/carbon/services/websocket.service';
import type { DataSourceUpdateEvent, EmissionFactorUpdateEvent } from '@features/carbon/services/websocket.service';

export const DataFreshness = ({
  lastUpdated: initialLastUpdated,
  maxAge,
  status: initialStatus,
  showDetails = false,
  className
}: DataFreshnessProps) => {
  const [lastUpdated, setLastUpdated] = useState(initialLastUpdated);
  const [status, setStatus] = useState(initialStatus);
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);
  const [realtimeFactors, setRealtimeFactors] = useState<EmissionFactorUpdateEvent[]>([]);
  const { connectionState, subscribeToDataSourceUpdates, subscribeToEmissionFactorUpdates } = useWebSocket();

  useEffect(() => {
    setLastUpdated(initialLastUpdated);
    setStatus(initialStatus);
  }, [initialLastUpdated, initialStatus]);

  useEffect(() => {
    const handleDataSourceUpdate = (data: DataSourceUpdateEvent) => {
      setLastUpdated(new Date(data.lastUpdate));
      setStatus(data.status === 'healthy' ? 'fresh' : data.status === 'degraded' ? 'stale' : 'expired');
      setLiveUpdateCount(prev => prev + 1);
    };

    const handleEmissionFactorUpdate = (data: EmissionFactorUpdateEvent) => {
      setRealtimeFactors(prev => {
        const updated = prev.filter(f => f.region !== data.region);
        return [...updated, data].slice(-5); 
      });
      setLiveUpdateCount(prev => prev + 1);
      setLastUpdated(new Date(data.lastUpdated));
      setStatus('fresh');
    };

    if (connectionState === 'connected') {
      subscribeToDataSourceUpdates(handleDataSourceUpdate);
      subscribeToEmissionFactorUpdates(handleEmissionFactorUpdate);
    }

    
  }, [connectionState, subscribeToDataSourceUpdates, subscribeToEmissionFactorUpdates]);
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'fresh':
        return {
          icon: CheckCircle,
          color: 'text-success-600',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
          label: 'Fresh',
          description: 'Data is current and reliable'
        };
      case 'stale':
        return {
          icon: AlertTriangle,
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          label: 'Stale',
          description: 'Data may be outdated'
        };
      case 'expired':
        return {
          icon: XCircle,
          color: 'text-danger-600',
          bgColor: 'bg-danger-50',
          borderColor: 'border-danger-200',
          label: 'Expired',
          description: 'Data needs immediate refresh'
        };
      default:
        return {
          icon: Clock,
          color: 'text-carbon-600',
          bgColor: 'bg-carbon-50',
          borderColor: 'border-carbon-200',
          label: 'Unknown',
          description: 'Data status unknown'
        };
    }
  };

  const calculateAge = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const calculateFreshnessScore = () => {
    const now = new Date();
    const ageMs = now.getTime() - lastUpdated.getTime();
    const maxAgeMs = maxAge * 1000; 
    const freshnessRatio = Math.max(0, 1 - (ageMs / maxAgeMs));
    return Math.round(freshnessRatio * 100);
  };

  const getNextUpdate = () => {
    
    const now = new Date();
    const nextUpdate = new Date(now.getTime() + (maxAge * 1000 / 2)); 
    return nextUpdate;
  };

  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;
  const freshnessScore = calculateFreshnessScore();
  const ageText = calculateAge();
  const nextUpdate = getNextUpdate();

  if (!showDetails) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
        <span className="text-body-sm text-carbon-600">{ageText}</span>
        <Badge className={cn('text-xs', statusInfo.bgColor, statusInfo.color, statusInfo.borderColor)}>
          {statusInfo.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary-600" />
            <span>Data Freshness</span>
          </CardTitle>
          <Badge className={cn(statusInfo.bgColor, statusInfo.color, statusInfo.borderColor)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-carbon-600">Freshness Score</span>
            <span className={cn(
              'text-body-sm font-semibold',
              freshnessScore >= 80 ? 'text-success-600' :
              freshnessScore >= 50 ? 'text-warning-600' : 'text-danger-600'
            )}>
              {freshnessScore}%
            </span>
          </div>
          <Progress
            value={freshnessScore}
            className={cn(
              'h-2',
              freshnessScore >= 80 ? '[&>div]:bg-success-500' :
              freshnessScore >= 50 ? '[&>div]:bg-warning-500' : '[&>div]:bg-danger-500'
            )}
          />
          <p className="text-caption text-carbon-500">{statusInfo.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Calendar className="h-4 w-4 text-carbon-400" />
              <span className="text-body-sm text-carbon-600">Last Updated</span>
            </div>
            <p className="text-body-base font-medium text-carbon-900">
              {lastUpdated.toLocaleDateString()}
            </p>
            <p className="text-caption text-carbon-500">
              {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="h-4 w-4 text-carbon-400" />
              <span className="text-body-sm text-carbon-600">Data Age</span>
            </div>
            <p className="text-body-base font-medium text-carbon-900">
              {ageText}
            </p>
          </div>
        </div>

        <div className="border-t border-carbon-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-body-sm font-medium text-carbon-700">WebSocket Connection</span>
            <div className="flex items-center space-x-1">
              {connectionState === 'connected' ? (
                <>
                  <Wifi className="h-4 w-4 text-success-600" />
                  <span className="text-caption text-success-600">Live</span>
                </>
              ) : connectionState === 'connecting' ? (
                <>
                  <Activity className="h-4 w-4 text-warning-600 animate-pulse" />
                  <span className="text-caption text-warning-600">Connecting</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-danger-600" />
                  <span className="text-caption text-danger-600">Offline</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-carbon-500">Live Updates Received</span>
              <span className="text-caption text-carbon-700">
                {liveUpdateCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-caption text-carbon-500">Update Frequency</span>
              <span className="text-caption text-carbon-700">
                {connectionState === 'connected' ? 'Real-time' : `Every ${Math.round(maxAge / 3600)}h`}
              </span>
            </div>
          </div>
        </div>

        {realtimeFactors.length > 0 && (
          <div className="border-t border-carbon-100 pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="h-4 w-4 text-primary-600" />
              <span className="text-body-sm font-medium text-carbon-700">
                Live Emission Factor Updates
              </span>
            </div>
            <div className="space-y-2 max-h-20 overflow-y-auto">
              {realtimeFactors.map((factor, index) => (
                <motion.div
                  key={`${factor.region}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between text-caption"
                >
                  <span className="text-carbon-600">{factor.region}</span>
                  <span className="font-medium text-carbon-900">
                    {factor.factor.toFixed(3)} {factor.unit}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-carbon-100 pt-4">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={status === 'fresh' || connectionState === 'connected'}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {connectionState === 'connected' ? 'Live Updates' : 'Force Refresh'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-carbon-600"
            >
              View History
            </Button>
          </div>
        </div>

        <div className="relative">
          <motion.div
            className={cn(
              'absolute inset-0 rounded-lg opacity-20',
              statusInfo.bgColor
            )}
            animate={{
              scale: [1, 1.02, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};