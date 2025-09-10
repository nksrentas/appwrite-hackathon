import { motion, AnimatePresence } from 'framer-motion';
import { GitCommit, GitPullRequest, Zap, Package, Clock, MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import {
  formatCarbon,
  getCarbonIntensity,
  getCarbonIntensityClasses,
  getRelativeTime,
} from '@shared/utils/carbon';
import type { AppwriteActivity } from '@shared/services/appwrite.client';
import { cn } from '@shared/utils/cn';

interface ActivityFeedProps {
  activities: AppwriteActivity[];
  isLoading?: boolean;
  showRealTimeIndicator?: boolean;
  maxItems?: number;
  className?: string;
}

export const ActivityFeed = ({
  activities,
  isLoading = false,
  showRealTimeIndicator = false,
  maxItems = 10,
  className,
}: ActivityFeedProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit':
        return GitCommit;
      case 'pr':
        return GitPullRequest;
      case 'ci_run':
        return Zap;
      case 'deployment':
        return Package;
      default:
        return GitCommit;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'commit':
        return 'text-scientific-500 bg-scientific-100';
      case 'pr':
        return 'text-efficiency-600 bg-efficiency-100';
      case 'ci_run':
        return 'text-carbon-600 bg-carbon-100';
      case 'deployment':
        return 'text-primary-600 bg-primary-100';
      default:
        return 'text-carbon-500 bg-carbon-100';
    }
  };

  const formatActivityTitle = (activity: AppwriteActivity) => {
    const details = activity.details as any;

    switch (activity.type) {
      case 'commit':
        return details.message || 'Code commit';
      case 'pr':
        return `PR: ${details.title || 'Pull request'}`;
      case 'ci_run':
        return `CI: ${details.workflow || 'Build'} ${details.status || ''}`;
      case 'deployment':
        return `Deploy: ${details.environment || 'production'}`;
      default:
        return 'Development activity';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Recent Activity</span>
            {showRealTimeIndicator && <div className="loading-skeleton h-4 w-8 rounded" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="activity-item">
              <div className="loading-skeleton h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="loading-skeleton h-4 w-3/4 rounded" />
                <div className="loading-skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const displayActivities = activities.slice(0, maxItems);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Activity</span>
          {showRealTimeIndicator && (
            <motion.div
              className="flex items-center space-x-2 text-body-sm text-carbon-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-2 w-2 bg-primary-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <span>Live Updates</span>
            </motion.div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-1">
        <AnimatePresence mode="popLayout">
          {displayActivities.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 space-y-3"
            >
              <div className="text-carbon-400">
                <GitCommit className="h-12 w-12 mx-auto mb-3" />
              </div>
              <h3 className="text-lg font-medium text-carbon-600">No recent activity</h3>
              <p className="text-body-sm text-carbon-500 max-w-sm mx-auto">
                Your development activities will appear here once you start making commits, creating
                pull requests, or running CI pipelines.
              </p>
            </motion.div>
          ) : (
            displayActivities.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              const colorClasses = getActivityColor(activity.type);
              const intensity = getCarbonIntensity(activity.carbonValue || 0);
              const intensityClasses = getCarbonIntensityClasses(intensity);
              const title = formatActivityTitle(activity);

              return (
                <motion.div
                  key={activity.$id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    layout: { duration: 0.2 },
                  }}
                  className="activity-item group"
                >
                  <div className={cn('p-2 rounded-lg flex-shrink-0', colorClasses)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-body-sm font-medium text-carbon-900 truncate">{title}</h4>
                      {activity.carbonValue && (
                        <Badge className={cn('ml-2 flex-shrink-0', intensityClasses)}>
                          {formatCarbon(activity.carbonValue, activity.carbonUnit as any)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-caption text-carbon-500">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-32">{activity.repository}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{getRelativeTime(activity.$createdAt)}</span>
                      </div>

                      <motion.button
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 hover:text-carbon-700"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>View</span>
                      </motion.button>
                    </div>

                    {activity.type === 'ci_run' && (
                      <div className="flex items-center space-x-2 text-caption">
                        <div
                          className={cn(
                            'px-2 py-0.5 rounded text-white text-xs',
                            (activity.details as any)?.status === 'success'
                              ? 'bg-primary-500'
                              : (activity.details as any)?.status === 'failure'
                                ? 'bg-danger'
                                : 'bg-carbon-400'
                          )}
                        >
                          {(activity.details as any)?.status || 'running'}
                        </div>
                        <span className="text-carbon-500">
                          Duration: {(activity.details as any)?.duration || 'unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {activities.length > maxItems && (
          <motion.div
            className="pt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button className="text-body-sm text-primary-600 hover:text-primary-700 font-medium">
              View all {activities.length} activities
            </button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
