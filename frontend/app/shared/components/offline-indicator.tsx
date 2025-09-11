import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Database,
  Upload,
} from 'lucide-react';
import { Card, CardContent } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { useOffline, useOfflineStorage, useConnectionQuality } from '@shared/hooks/use-offline';
import { cn } from '@shared/utils/cn';

interface OfflineIndicatorProps {
  className?: string;
  showConnectionQuality?: boolean;
  showPendingSync?: boolean;
  onSyncPending?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className,
  showConnectionQuality = true,
  showPendingSync = true,
  onSyncPending,
}) => {
  const { isOnline, isOffline, lastOnlineTime } = useOffline();
  const { quality, isSlow } = useConnectionQuality();
  const { pendingItems, hasPendingItems } = useOfflineStorage();

  if (isOnline && !isSlow && !hasPendingItems) {
    return null; // Don't show indicator when everything is fine
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={cn('fixed top-4 left-1/2 transform -translate-x-1/2 z-50', className)}
      >
        <Card className="shadow-lg border-l-4 border-l-warning-500 max-w-md">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {isOffline ? (
                  <WifiOff className="h-5 w-5 text-danger-600" />
                ) : isSlow ? (
                  <Wifi className="h-5 w-5 text-warning-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-success-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-carbon-900">
                    {isOffline ? 'Offline Mode' : isSlow ? 'Slow Connection' : 'Connected'}
                  </h4>
                  
                  {showConnectionQuality && quality !== 'unknown' && (
                    <Badge
                      variant={
                        quality === 'fast' ? 'default' :
                        quality === 'slow' ? 'secondary' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {quality}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-carbon-600 mt-1">
                  {isOffline ? (
                    lastOnlineTime ? (
                      `Last online: ${lastOnlineTime.toLocaleTimeString()}`
                    ) : (
                      'Working offline with cached data'
                    )
                  ) : isSlow ? (
                    'Some features may be slower than usual'
                  ) : (
                    'All systems operational'
                  )}
                </p>

                {showPendingSync && hasPendingItems && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-warning-600" />
                      <span className="text-xs text-carbon-600">
                        {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''} pending sync
                      </span>
                    </div>
                    
                    {isOnline && onSyncPending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSyncPending}
                        className="h-6 px-2 text-xs"
                      >
                        Sync Now
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

interface PendingSyncStatusProps {
  className?: string;
  onSync?: () => void;
  onClear?: () => void;
}

export const PendingSyncStatus: React.FC<PendingSyncStatusProps> = ({
  className,
  onSync,
  onClear,
}) => {
  const { isOnline } = useOffline();
  const { pendingItems, hasPendingItems } = useOfflineStorage();

  if (!hasPendingItems) return null;

  const groupedItems = pendingItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className={cn('border-warning-200 bg-warning-50', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Upload className="h-5 w-5 text-warning-600" />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-warning-900 mb-1">
                Pending Sync ({pendingItems.length} items)
              </h3>
              <div className="space-y-1">
                {Object.entries(groupedItems).map(([type, count]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-warning-500 rounded-full" />
                    <span className="text-xs text-warning-700 capitalize">
                      {count} {type.replace('_', ' ')} item{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
              
              {!isOnline && (
                <p className="text-xs text-warning-600 mt-2 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Will sync automatically when online
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isOnline && onSync && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSync}
                className="border-warning-300 text-warning-700 hover:bg-warning-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync
              </Button>
            )}
            
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-warning-600 hover:text-warning-700 hover:bg-warning-100"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface OfflineModeBannerProps {
  className?: string;
  onDismiss?: () => void;
}

export const OfflineModeBanner: React.FC<OfflineModeBannerProps> = ({
  className,
  onDismiss,
}) => {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'bg-warning-100 border-b border-warning-200 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <WifiOff className="h-5 w-5 text-warning-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning-900">
              You're currently offline
            </p>
            <p className="text-xs text-warning-700">
              You can continue working with cached data. Changes will sync when connection is restored.
            </p>
          </div>
        </div>

        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-warning-600 hover:text-warning-700 hover:bg-warning-200"
          >
            Dismiss
          </Button>
        )}
      </div>
    </motion.div>
  );
};

interface ConnectionQualityIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const ConnectionQualityIndicator: React.FC<ConnectionQualityIndicatorProps> = ({
  className,
  showLabel = false,
}) => {
  const { quality, isOffline } = useConnectionQuality();

  const getQualityColor = () => {
    switch (quality) {
      case 'fast':
        return 'text-success-600';
      case 'slow':
        return 'text-warning-600';
      case 'offline':
        return 'text-danger-600';
      default:
        return 'text-carbon-400';
    }
  };

  const getQualityIcon = () => {
    if (isOffline) return WifiOff;
    return Wifi;
  };

  const Icon = getQualityIcon();

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Icon className={cn('h-4 w-4', getQualityColor())} />
      {showLabel && (
        <span className={cn('text-xs capitalize', getQualityColor())}>
          {quality}
        </span>
      )}
    </div>
  );
};

interface SyncProgressProps {
  isVisible: boolean;
  progress: number;
  totalItems: number;
  currentItem?: string;
  onCancel?: () => void;
}

export const SyncProgress: React.FC<SyncProgressProps> = ({
  isVisible,
  progress,
  totalItems,
  currentItem,
  onCancel,
}) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card className="w-80 shadow-lg">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 text-primary-600 animate-spin" />
                  <span className="text-sm font-medium text-carbon-900">
                    Syncing Data
                  </span>
                </div>
                
                {onCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-carbon-600">
                  <span>{Math.round(progress)}% complete</span>
                  <span>{Math.ceil(progress * totalItems / 100)}/{totalItems} items</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {currentItem && (
                <p className="text-xs text-carbon-500 truncate">
                  Syncing: {currentItem}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};