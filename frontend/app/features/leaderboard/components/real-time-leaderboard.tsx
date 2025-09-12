import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  Zap,
  Activity,
  Star,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

import { useLeaderboardStore } from '@features/leaderboard/stores/leaderboard.store';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Avatar } from '@shared/components/ui/avatar';
import { Progress } from '@shared/components/ui/progress';
import { Alert, AlertDescription } from '@shared/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { cn } from '@shared/utils/cn';

export type RankingContext = 'individual' | 'team' | 'organization' | 'global';
export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'all_time';

interface RealTimeLeaderboardProps {
  className?: string;
  context?: RankingContext;
  timeRange?: TimeRange;
  showControls?: boolean;
  showUserPosition?: boolean;
  maxEntries?: number;
  autoUpdate?: boolean;
  updateInterval?: number;
}

interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  name?: string;
  avatar?: string;
  rank: number;
  previousRank?: number;
  carbonScore: number;
  efficiencyScore: number;
  trend: 'up' | 'down' | 'stable';
  trendChange: number;
  achievements: string[];
  totalContributions: number;
  lastActive: string;
  isCurrentUser?: boolean;
  teamName?: string;
  organizationName?: string;
}

const RANK_CHANGES_DURATION = 2000;
const UPDATE_ANIMATION_DURATION = 800;

export const RealTimeLeaderboard = ({
  className,
  context = 'global',
  timeRange = 'weekly',
  showControls = true,
  showUserPosition = true,
  maxEntries = 10,
  autoUpdate = true,
  updateInterval = 30000,
}: RealTimeLeaderboardProps) => {
  const {
    leaderboards,
    currentPeriod,
    userPosition,
    isLoading,
    error,
    lastUpdated,
    subscriptions,
    loadLeaderboard,
    loadUserPosition,
    setPeriod,
    subscribeToRealTimeUpdates,
    unsubscribeFromRealTimeUpdates,
    refreshLeaderboard,
    clearError,
  } = useLeaderboardStore();

  const [localContext, setLocalContext] = useState<RankingContext>(context);
  const [localTimeRange, setLocalTimeRange] = useState<TimeRange>(timeRange);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [rankChanges, setRankChanges] = useState<Map<string, number>>(new Map());
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Mock data for demonstration - in real implementation, this would come from the store
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([
    {
      id: '1',
      userId: '1',
      username: 'eco-warrior',
      name: 'Alex Chen',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face',
      rank: 1,
      previousRank: 2,
      carbonScore: 0.24,
      efficiencyScore: 92,
      trend: 'down',
      trendChange: 15.2,
      achievements: ['efficiency-master', 'green-streak'],
      totalContributions: 847,
      lastActive: '2 minutes ago',
      teamName: 'Green Coders',
      organizationName: 'TechCorp',
    },
    {
      id: '2',
      userId: '2',
      username: 'sustainable-dev',
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b832c96a?w=64&h=64&fit=crop&crop=face',
      rank: 2,
      previousRank: 1,
      carbonScore: 0.31,
      efficiencyScore: 88,
      trend: 'up',
      trendChange: 8.7,
      achievements: ['early-adopter', 'team-leader'],
      totalContributions: 623,
      lastActive: '5 minutes ago',
      teamName: 'EcoTech',
      organizationName: 'GreenSoft',
    },
    {
      id: '3',
      userId: '3',
      username: 'carbon-zero',
      name: 'Mike Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face',
      rank: 3,
      previousRank: 3,
      carbonScore: 0.35,
      efficiencyScore: 85,
      trend: 'stable',
      trendChange: 2.1,
      achievements: ['consistency-king'],
      totalContributions: 512,
      lastActive: '1 hour ago',
      teamName: 'Zero Impact',
      organizationName: 'EcoSystems',
    },
  ]);

  const contextOptions = [
    { value: 'individual', label: 'Individual', icon: Users },
    { value: 'team', label: 'Team', icon: Users },
    { value: 'organization', label: 'Organization', icon: Users },
    { value: 'global', label: 'Global', icon: Users },
  ];

  const timeRangeOptions = [
    { value: 'daily', label: 'Today' },
    { value: 'weekly', label: 'This Week' },
    { value: 'monthly', label: 'This Month' },
    { value: 'all_time', label: 'All Time' },
  ];

  useEffect(() => {
    if (autoUpdate) {
      setConnectionStatus('connecting');
      subscribeToRealTimeUpdates(localTimeRange);
      setConnectionStatus('connected');
      
      return () => {
        unsubscribeFromRealTimeUpdates(localTimeRange);
        setConnectionStatus('disconnected');
      };
    }
  }, [localTimeRange, autoUpdate, subscribeToRealTimeUpdates, unsubscribeFromRealTimeUpdates]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoUpdate && connectionStatus === 'connected') {
        // Simulate real-time updates
        simulateLeaderboardUpdate();
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [autoUpdate, connectionStatus, updateInterval]);

  const simulateLeaderboardUpdate = useCallback(() => {
    setLeaderboardData(current => {
      const updated = [...current];
      
      // Randomly update a few entries
      const indicesToUpdate = [Math.floor(Math.random() * updated.length)];
      
      indicesToUpdate.forEach(index => {
        const entry = updated[index];
        const newScore = entry.carbonScore + (Math.random() - 0.5) * 0.1;
        const newRank = Math.max(1, entry.rank + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0));
        
        updated[index] = {
          ...entry,
          carbonScore: Math.max(0.1, newScore),
          previousRank: entry.rank,
          rank: newRank,
          trend: newScore < entry.carbonScore ? 'down' : newScore > entry.carbonScore ? 'up' : 'stable',
          trendChange: Math.abs(((newScore - entry.carbonScore) / entry.carbonScore) * 100),
          lastActive: 'just now',
        };

        // Track rank changes for animation
        if (newRank !== entry.rank) {
          setRankChanges(prev => new Map(prev.set(entry.id, entry.rank - newRank)));
          
          // Clear rank change after animation
          setTimeout(() => {
            setRankChanges(prev => {
              const newChanges = new Map(prev);
              newChanges.delete(entry.id);
              return newChanges;
            });
          }, RANK_CHANGES_DURATION);
        }
      });

      // Re-sort by carbon score (lower is better)
      updated.sort((a, b) => a.carbonScore - b.carbonScore);
      
      // Update ranks after sorting
      updated.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setLastUpdateTime(new Date());
      return updated;
    });
  }, []);

  const handleRefresh = () => {
    refreshLeaderboard(localTimeRange);
    simulateLeaderboardUpdate();
  };

  const handleContextChange = (newContext: RankingContext) => {
    setLocalContext(newContext);
    // Filter or fetch data based on context
  };

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setLocalTimeRange(newTimeRange);
    setPeriod(newTimeRange);
    loadLeaderboard(newTimeRange);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-carbon-500 font-bold">#{rank}</span>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-carbon-400" />;
    }
  };

  const getRankChangeIndicator = (entryId: string, currentRank: number, previousRank?: number) => {
    const change = rankChanges.get(entryId);
    if (change !== undefined && change !== 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={cn(
            'flex items-center space-x-1 text-xs font-medium',
            change > 0 ? 'text-green-500' : 'text-red-500'
          )}
        >
          {change > 0 ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span>{Math.abs(change)}</span>
        </motion.div>
      );
    }

    if (previousRank && previousRank !== currentRank) {
      const diff = previousRank - currentRank;
      return (
        <div className={cn(
          'text-xs font-medium',
          diff > 0 ? 'text-green-500' : 'text-red-500'
        )}>
          {diff > 0 ? `+${diff}` : diff}
        </div>
      );
    }

    return null;
  };

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
    <div className={cn('space-y-6', className)}>
      {showControls && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>Live Leaderboard</span>
                <Badge variant={connectionStatus === 'connected' ? 'success' : 'outline'}>
                  {connectionStatus === 'connected' ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  {connectionStatus === 'connected' ? 'Live' : 'Offline'}
                </Badge>
              </CardTitle>
              
              <div className="flex items-center space-x-3">
                {lastUpdateTime && (
                  <div className="text-caption text-carbon-500">
                    Updated {lastUpdateTime.toLocaleTimeString()}
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-body-sm font-medium">Context:</span>
                <Select value={localContext} onValueChange={handleContextChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contextOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-body-sm font-medium">Period:</span>
                <Select value={localTimeRange} onValueChange={handleTimeRangeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="link" onClick={clearError} className="ml-2 p-0 h-auto">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="wait">
              {leaderboardData.slice(0, maxEntries).map((entry, index) => (
                <motion.div
                  key={entry.id}
                  variants={itemVariants}
                  layout
                  transition={{ duration: UPDATE_ANIMATION_DURATION / 1000 }}
                  className={cn(
                    'flex items-center space-x-4 p-4 border-b border-carbon-100 last:border-b-0',
                    'hover:bg-carbon-50 transition-colors',
                    entry.isCurrentUser && 'bg-primary-50 border-primary-200'
                  )}
                >
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(entry.rank)}
                    <AnimatePresence>
                      {getRankChangeIndicator(entry.id, entry.rank, entry.previousRank)}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar className="h-12 w-12">
                      {entry.avatar && (
                        <img
                          src={entry.avatar}
                          alt={entry.name || entry.username}
                          className="h-full w-full object-cover rounded-full"
                        />
                      )}
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-carbon-900 truncate">
                          {entry.name || entry.username}
                        </h3>
                        <span className="text-carbon-500 text-sm truncate">
                          @{entry.username}
                        </span>
                        {entry.achievements.length > 0 && (
                          <div className="flex space-x-1">
                            {entry.achievements.slice(0, 3).map((achievement, i) => (
                              <Star
                                key={i}
                                className="h-4 w-4 text-yellow-500 fill-current"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-caption text-carbon-500 mt-1">
                        <span>{entry.totalContributions} contributions</span>
                        {localContext !== 'individual' && entry.teamName && (
                          <span>Team: {entry.teamName}</span>
                        )}
                        <span>{entry.lastActive}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <motion.div 
                      className="text-lg font-bold text-carbon-900"
                      key={entry.carbonScore}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      {entry.carbonScore.toFixed(2)} kg CO₂
                    </motion.div>
                    <div className="flex items-center space-x-1 text-caption justify-center">
                      {getTrendIcon(entry.trend)}
                      <span className={cn(
                        entry.trend === 'down' ? 'text-green-500' : 
                        entry.trend === 'up' ? 'text-red-500' : 'text-carbon-400'
                      )}>
                        {entry.trendChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-primary-600">
                      {entry.efficiencyScore}
                    </div>
                    <div className="text-caption text-carbon-500">efficiency</div>
                    <Progress 
                      value={entry.efficiencyScore} 
                      className="w-16 mt-1" 
                      size="sm"
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </CardContent>
      </Card>

      {showUserPosition && userPosition[localTimeRange] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Your Position</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary-500">
                  #{userPosition[localTimeRange]?.rank}
                </div>
                <div className="text-body-sm text-carbon-600">
                  out of {userPosition[localTimeRange]?.total} developers
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-carbon-900">
                  {userPosition[localTimeRange]?.carbonTotal.toFixed(2)} kg CO₂
                </div>
                <Badge variant="success">
                  Top {userPosition[localTimeRange]?.percentile}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};