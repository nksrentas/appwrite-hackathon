import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Trophy,
  Award,
  Star,
  Users,
  Target,
  TrendingUp,
  Zap,
  Crown,
  X,
  Check,
  Info,
  AlertTriangle,
  Calendar,
  Clock,
  Flame,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { Avatar } from '@shared/components/ui/avatar';
import { toast } from '@shared/hooks/use-toast';
import { cn } from '@shared/utils/cn';

export type NotificationType = 
  | 'achievement_unlocked'
  | 'milestone_reached'
  | 'rank_change'
  | 'challenge_started'
  | 'challenge_completed'
  | 'team_invitation'
  | 'progress_reminder'
  | 'goal_deadline'
  | 'streak_milestone'
  | 'leaderboard_update';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, any>;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: Date;
}

export interface AchievementUnlock {
  achievementId: string;
  name: string;
  description: string;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: React.ComponentType<{ className?: string }>;
}

export interface ProgressUpdate {
  metric: string;
  previousValue: number;
  currentValue: number;
  improvement: number;
  rankChange?: number;
}

interface NotificationIntegrationProps {
  className?: string;
  userId?: string;
  notifications?: Notification[];
  onNotificationRead?: (id: string) => void;
  onNotificationDismiss?: (id: string) => void;
  onNavigateToAction?: (url: string) => void;
  showFloatingNotifications?: boolean;
  maxFloatingNotifications?: number;
}

export const NotificationIntegration = ({
  className,
  userId,
  notifications = [],
  onNotificationRead,
  onNotificationDismiss,
  onNavigateToAction,
  showFloatingNotifications = true,
  maxFloatingNotifications = 3,
}: NotificationIntegrationProps) => {
  const [floatingNotifications, setFloatingNotifications] = useState<Notification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Mock notifications for demonstration
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'achievement_unlocked',
      title: '🏆 Achievement Unlocked!',
      message: 'Efficiency Master - You maintained below 0.25kg CO₂ per commit for 30 days!',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      read: false,
      data: {
        achievementId: 'efficiency-master',
        points: 500,
        rarity: 'rare',
        icon: 'Zap',
      },
      actionUrl: '/leaderboard?tab=achievements',
      priority: 'high',
    },
    {
      id: '2',
      type: 'rank_change',
      title: '📈 Rank Improved!',
      message: 'You moved up 3 positions to #12 on the weekly leaderboard!',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      read: false,
      data: {
        previousRank: 15,
        currentRank: 12,
        improvement: 3,
        leaderboard: 'weekly',
      },
      actionUrl: '/leaderboard',
      priority: 'medium',
    },
    {
      id: '3',
      type: 'challenge_started',
      title: '🎯 New Challenge Available',
      message: 'Green Code Sprint - Reduce your carbon footprint by 20% this week',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      data: {
        challengeId: 'green-sprint-2024',
        duration: '7 days',
        target: '20% reduction',
      },
      actionUrl: '/challenges',
      priority: 'medium',
    },
    {
      id: '4',
      type: 'team_invitation',
      title: '👥 Team Invitation',
      message: 'EcoWarriors team invited you to join their carbon reduction challenge',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: true,
      data: {
        teamId: 'ecowarriors',
        teamName: 'EcoWarriors',
        invitedBy: 'Alice Johnson',
      },
      actionUrl: '/teams',
      priority: 'high',
    },
    {
      id: '5',
      type: 'streak_milestone',
      title: '🔥 Streak Milestone!',
      message: 'Congratulations on your 14-day improvement streak!',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      read: true,
      data: {
        streakType: 'daily',
        streakLength: 14,
        nextMilestone: 30,
      },
      actionUrl: '/leaderboard?tab=progress',
      priority: 'medium',
    },
  ];

  const allNotifications = [...notifications, ...mockNotifications];

  // Update floating notifications when new ones arrive
  useEffect(() => {
    if (!showFloatingNotifications) return;

    const newUnreadNotifications = allNotifications
      .filter(n => !n.read && !dismissedNotifications.has(n.id))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxFloatingNotifications);

    setFloatingNotifications(newUnreadNotifications);
  }, [allNotifications, dismissedNotifications, showFloatingNotifications, maxFloatingNotifications]);

  // Auto-dismiss floating notifications after delay
  useEffect(() => {
    if (floatingNotifications.length === 0) return;

    const timers = floatingNotifications.map(notification => {
      const delay = notification.priority === 'urgent' ? 10000 : 
                   notification.priority === 'high' ? 8000 : 
                   notification.priority === 'medium' ? 6000 : 4000;

      return setTimeout(() => {
        handleDismissFloating(notification.id);
      }, delay);
    });

    return () => timers.forEach(clearTimeout);
  }, [floatingNotifications]);

  const handleDismissFloating = useCallback((notificationId: string) => {
    setDismissedNotifications(prev => new Set([...prev, notificationId]));
    setFloatingNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      onNotificationRead?.(notification.id);
    }
    
    if (notification.actionUrl) {
      onNavigateToAction?.(notification.actionUrl);
    }
    
    handleDismissFloating(notification.id);
  }, [onNotificationRead, onNavigateToAction, handleDismissFloating]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'achievement_unlocked':
        return Trophy;
      case 'milestone_reached':
        return Award;
      case 'rank_change':
        return TrendingUp;
      case 'challenge_started':
      case 'challenge_completed':
        return Target;
      case 'team_invitation':
        return Users;
      case 'progress_reminder':
        return Bell;
      case 'goal_deadline':
        return Calendar;
      case 'streak_milestone':
        return Flame;
      case 'leaderboard_update':
        return Star;
      default:
        return Info;
    }
  };

  const getNotificationColor = (type: NotificationType, priority: string) => {
    if (priority === 'urgent') return 'border-red-300 bg-red-50';
    if (priority === 'high') return 'border-yellow-300 bg-yellow-50';
    
    switch (type) {
      case 'achievement_unlocked':
        return 'border-green-300 bg-green-50';
      case 'rank_change':
        return 'border-blue-300 bg-blue-50';
      case 'team_invitation':
        return 'border-purple-300 bg-purple-50';
      case 'challenge_started':
        return 'border-orange-300 bg-orange-50';
      default:
        return 'border-carbon-300 bg-carbon-50';
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Show achievement unlock with special animation
  const showAchievementUnlock = useCallback((achievement: AchievementUnlock) => {
    toast({
      title: '🏆 Achievement Unlocked!',
      description: `${achievement.name} - ${achievement.points} points earned!`,
      duration: 8000,
    });
  }, []);

  // Show progress update notification
  const showProgressUpdate = useCallback((update: ProgressUpdate) => {
    const isImprovement = update.improvement > 0;
    const emoji = isImprovement ? '📈' : '📉';
    
    toast({
      title: `${emoji} Progress Update`,
      description: `${update.metric}: ${isImprovement ? '+' : ''}${update.improvement.toFixed(1)}% change`,
      duration: 5000,
    });
  }, []);

  return (
    <div className={cn('relative', className)}>
      {/* Floating Notifications */}
      <AnimatePresence>
        {showFloatingNotifications && floatingNotifications.map((notification, index) => {
          const Icon = getNotificationIcon(notification.type);
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 400, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1,
                y: index * 100,
              }}
              exit={{ opacity: 0, x: 400, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                delay: index * 0.1,
              }}
              className="fixed top-20 right-6 z-50 w-80"
              style={{ zIndex: 9999 }}
            >
              <Card 
                className={cn(
                  'border-2 shadow-lg cursor-pointer hover:shadow-xl transition-shadow',
                  getNotificationColor(notification.type, notification.priority)
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      'flex-shrink-0 p-2 rounded-full',
                      notification.priority === 'high' || notification.priority === 'urgent' 
                        ? 'bg-primary-100' : 'bg-carbon-100'
                    )}>
                      <Icon className={cn(
                        'h-5 w-5',
                        notification.priority === 'high' || notification.priority === 'urgent'
                          ? 'text-primary-600' : 'text-carbon-600'
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-carbon-900 truncate">
                          {notification.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissFloating(notification.id);
                          }}
                          className="ml-2 p-0 h-auto"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-carbon-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-carbon-500">
                          {getTimeAgo(notification.timestamp)}
                        </span>
                        
                        {notification.actionUrl && (
                          <div className="flex items-center text-xs text-primary-600 hover:text-primary-800">
                            <span>View</span>
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar for time-sensitive notifications */}
                  {notification.priority === 'urgent' && (
                    <motion.div
                      className="mt-3 h-1 bg-red-200 rounded-full overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <motion.div
                        className="h-full bg-red-500 rounded-full"
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ duration: 10, ease: 'linear' }}
                      />
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Notification Center */}
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </div>
            <Badge variant="outline">
              {allNotifications.filter(n => !n.read).length} unread
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {allNotifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="h-12 w-12 text-carbon-400 mx-auto mb-4" />
                <h3 className="font-medium text-carbon-900 mb-2">No notifications</h3>
                <p className="text-carbon-600 text-sm">
                  Achievement unlocks and progress updates will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {allNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex items-start space-x-3 p-4 hover:bg-carbon-50 transition-colors cursor-pointer border-l-4',
                        notification.read 
                          ? 'border-transparent opacity-75' 
                          : 'border-primary-500 bg-primary-50/50'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={cn(
                        'flex-shrink-0 p-1.5 rounded-full',
                        notification.read ? 'bg-carbon-100' : 'bg-primary-100'
                      )}>
                        <Icon className={cn(
                          'h-4 w-4',
                          notification.read ? 'text-carbon-600' : 'text-primary-600'
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={cn(
                            'text-sm font-medium truncate',
                            notification.read ? 'text-carbon-700' : 'text-carbon-900'
                          )}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-carbon-500 ml-2 flex-shrink-0">
                            {getTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        
                        <p className={cn(
                          'text-sm mt-1',
                          notification.read ? 'text-carbon-500' : 'text-carbon-600'
                        )}>
                          {notification.message}
                        </p>
                        
                        {notification.data && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {notification.data.points && (
                              <Badge variant="success" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                {notification.data.points} pts
                              </Badge>
                            )}
                            {notification.data.rarity && (
                              <Badge variant="outline" className="text-xs">
                                {notification.data.rarity}
                              </Badge>
                            )}
                            {notification.data.improvement && (
                              <Badge variant="secondary" className="text-xs">
                                +{notification.data.improvement} positions
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
          
          {allNotifications.length > 0 && (
            <div className="p-4 border-t border-carbon-200">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  // Mark all as read
                  allNotifications.forEach(n => {
                    if (!n.read) onNotificationRead?.(n.id);
                  });
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};