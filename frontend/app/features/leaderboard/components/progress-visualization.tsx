import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
  Users,
  Trophy,
  Clock,
  CheckCircle,
  Star,
  Flame,
  ChevronUp,
  ChevronDown,
  Info,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shared/components/ui/tooltip';
import { cn } from '@shared/utils/cn';

export type TimeRange = 'week' | 'month' | 'quarter' | 'year';
export type MetricType = 'efficiency' | 'emissions' | 'improvements' | 'achievements';
export type ChartType = 'line' | 'bar' | 'area' | 'pie';

export interface ProgressDataPoint {
  timestamp: Date;
  value: number;
  target?: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: 'efficiency' | 'consistency' | 'improvement' | 'collaboration';
  deadline?: Date;
  isCompleted: boolean;
  completedAt?: Date;
  reward: {
    points: number;
    badge?: string;
    title?: string;
  };
}

export interface StreakData {
  current: number;
  longest: number;
  type: 'daily' | 'weekly' | 'monthly';
  lastActivity: Date;
  milestones: number[];
}

interface ProgressVisualizationProps {
  className?: string;
  userId?: string;
  teamId?: string;
  data?: ProgressDataPoint[];
  milestones?: Milestone[];
  streaks?: StreakData[];
  showComparison?: boolean;
  showPredictions?: boolean;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

export const ProgressVisualization = ({
  className,
  userId,
  teamId,
  data = [],
  milestones = [],
  streaks = [],
  showComparison = false,
  showPredictions = false,
  timeRange = 'month',
  onTimeRangeChange,
}: ProgressVisualizationProps) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('efficiency');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [animatedValues, setAnimatedValues] = useState<Map<string, number>>(new Map());

  // Mock data for demonstration
  const mockData: ProgressDataPoint[] = useMemo(() => {
    const points: ProgressDataPoint[] = [];
    const now = new Date();
    const daysBack = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365;
    
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      let value: number;
      switch (selectedMetric) {
        case 'efficiency':
          value = 0.3 + (Math.random() - 0.5) * 0.1 + (i / daysBack) * 0.2;
          break;
        case 'emissions':
          value = 50 + Math.random() * 30 - (i / daysBack) * 20;
          break;
        case 'improvements':
          value = Math.random() * 25;
          break;
        case 'achievements':
          value = Math.floor(Math.random() * 3);
          break;
        default:
          value = Math.random() * 100;
      }
      
      points.push({
        timestamp: date,
        value: Math.max(0, value),
        target: selectedMetric === 'efficiency' ? 0.25 : selectedMetric === 'emissions' ? 40 : undefined,
      });
    }
    
    return points;
  }, [timeRange, selectedMetric]);

  const mockMilestones: Milestone[] = [
    {
      id: '1',
      name: 'Carbon Efficiency Master',
      description: 'Maintain below 0.25kg CO₂ per commit for 30 days',
      targetValue: 30,
      currentValue: 18,
      unit: 'days',
      category: 'efficiency',
      deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      isCompleted: false,
      reward: { points: 500, badge: 'efficiency-master', title: 'Efficiency Master' },
    },
    {
      id: '2',
      name: 'Improvement Streak',
      description: 'Show continuous improvement for 14 days',
      targetValue: 14,
      currentValue: 8,
      unit: 'days',
      category: 'improvement',
      isCompleted: false,
      reward: { points: 250, badge: 'improver' },
    },
    {
      id: '3',
      name: 'Team Player',
      description: 'Complete 5 team challenges',
      targetValue: 5,
      currentValue: 5,
      unit: 'challenges',
      category: 'collaboration',
      isCompleted: true,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      reward: { points: 300, badge: 'team-player' },
    },
  ];

  const mockStreaks: StreakData[] = [
    {
      current: 12,
      longest: 28,
      type: 'daily',
      lastActivity: new Date(),
      milestones: [7, 14, 30, 60, 100],
    },
    {
      current: 3,
      longest: 8,
      type: 'weekly',
      lastActivity: new Date(),
      milestones: [2, 4, 8, 16],
    },
  ];

  const stats = useMemo(() => {
    const current = mockData[mockData.length - 1]?.value || 0;
    const previous = mockData[mockData.length - 2]?.value || 0;
    const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    const trend = change > 0 ? (selectedMetric === 'efficiency' || selectedMetric === 'emissions' ? 'up' : 'up') : 'down';
    const average = mockData.reduce((sum, point) => sum + point.value, 0) / mockData.length;
    
    return {
      current,
      change: Math.abs(change),
      trend: selectedMetric === 'efficiency' || selectedMetric === 'emissions' ? 
        (change < 0 ? 'improving' : 'declining') : 
        (change > 0 ? 'improving' : 'declining'),
      average,
      best: Math.min(...mockData.map(p => p.value)),
      worst: Math.max(...mockData.map(p => p.value)),
    };
  }, [mockData, selectedMetric]);

  // Animation effect for counters
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValues(new Map([
        ['current', stats.current],
        ['change', stats.change],
        ['average', stats.average],
      ]));
    }, 100);

    return () => clearTimeout(timer);
  }, [stats]);

  const formatValue = (value: number, metric: MetricType): string => {
    switch (metric) {
      case 'efficiency':
        return `${value.toFixed(2)} kg CO₂`;
      case 'emissions':
        return `${value.toFixed(0)} g CO₂`;
      case 'improvements':
        return `${value.toFixed(1)}%`;
      case 'achievements':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getMetricIcon = (metric: MetricType) => {
    switch (metric) {
      case 'efficiency':
        return Zap;
      case 'emissions':
        return Activity;
      case 'improvements':
        return TrendingUp;
      case 'achievements':
        return Trophy;
      default:
        return BarChart3;
    }
  };

  const getCategoryIcon = (category: Milestone['category']) => {
    switch (category) {
      case 'efficiency':
        return Zap;
      case 'consistency':
        return Clock;
      case 'improvement':
        return TrendingUp;
      case 'collaboration':
        return Users;
      default:
        return Target;
    }
  };

  const getMilestoneProgress = (milestone: Milestone) => {
    return Math.min((milestone.currentValue / milestone.targetValue) * 100, 100);
  };

  const getStreakIcon = (streak: StreakData) => {
    if (streak.current >= streak.milestones[streak.milestones.length - 1]) {
      return Flame;
    }
    return streak.current >= streak.milestones[0] ? Star : Activity;
  };

  const getStreakColor = (streak: StreakData) => {
    if (streak.current >= 30) return 'text-red-500';
    if (streak.current >= 14) return 'text-orange-500';
    if (streak.current >= 7) return 'text-yellow-500';
    return 'text-blue-500';
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
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 font-bold text-carbon-900 mb-2">Progress Tracking</h2>
            <p className="text-carbon-600">
              Monitor your carbon efficiency journey and celebrate milestones
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efficiency">Efficiency</SelectItem>
                <SelectItem value="emissions">Emissions</SelectItem>
                <SelectItem value="improvements">Improvements</SelectItem>
                <SelectItem value="achievements">Achievements</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={(value) => onTimeRangeChange?.(value as TimeRange)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        >
          {/* Key Metrics */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {React.createElement(getMetricIcon(selectedMetric), {
                      className: 'h-5 w-5 text-primary-500'
                    })}
                    <span className="font-medium">Current</span>
                  </div>
                  <Badge variant={stats.trend === 'improving' ? 'success' : 'destructive'}>
                    {stats.trend === 'improving' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {stats.change.toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-carbon-900">
                  {formatValue(stats.current, selectedMetric)}
                </div>
                <div className="text-caption text-carbon-500 mt-1">
                  vs previous period
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Average</span>
                </div>
                <div className="text-2xl font-bold text-carbon-900">
                  {formatValue(stats.average, selectedMetric)}
                </div>
                <div className="text-caption text-carbon-500 mt-1">
                  {timeRange} average
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Award className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Best</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatValue(stats.best, selectedMetric)}
                </div>
                <div className="text-caption text-carbon-500 mt-1">
                  personal best
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Goal</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {selectedMetric === 'efficiency' ? '0.25 kg CO₂' : 
                   selectedMetric === 'emissions' ? '40 g CO₂' : 
                   selectedMetric === 'improvements' ? '20%' : '5'}
                </div>
                <div className="text-caption text-carbon-500 mt-1">
                  target value
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Area */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Progress Chart</span>
                    <div className="flex items-center space-x-2">
                      <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">Line</SelectItem>
                          <SelectItem value="bar">Bar</SelectItem>
                          <SelectItem value="area">Area</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Simplified chart representation */}
                  <div className="h-64 bg-carbon-50 rounded-lg flex items-end justify-center p-4 space-x-2">
                    {mockData.slice(-15).map((point, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ 
                              height: `${Math.max(10, (point.value / Math.max(...mockData.map(p => p.value))) * 200)}px` 
                            }}
                            transition={{ delay: index * 0.1, duration: 0.8 }}
                            className="w-4 bg-primary-500 rounded-t hover:bg-primary-600 transition-colors"
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <div className="font-medium">{formatValue(point.value, selectedMetric)}</div>
                            <div className="text-xs text-carbon-500">
                              {point.timestamp.toLocaleDateString()}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  
                  {showPredictions && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div>
                          <div className="font-medium text-blue-800">Prediction</div>
                          <div className="text-sm text-blue-600">
                            Based on current trends, you're likely to reach your efficiency goal in 
                            <span className="font-medium"> 8 days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Milestones */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span>Active Milestones</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AnimatePresence>
                    {mockMilestones.filter(m => !m.isCompleted).map((milestone) => {
                      const Icon = getCategoryIcon(milestone.category);
                      const progress = getMilestoneProgress(milestone);
                      const isNearDeadline = milestone.deadline && 
                        (milestone.deadline.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
                      
                      return (
                        <motion.div
                          key={milestone.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="p-4 border border-carbon-200 rounded-lg"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-primary-100 rounded-full">
                              <Icon className="h-4 w-4 text-primary-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium text-carbon-900">{milestone.name}</h4>
                                  <p className="text-sm text-carbon-600 mt-1">{milestone.description}</p>
                                </div>
                                <Badge variant={isNearDeadline ? 'destructive' : 'outline'}>
                                  <Star className="h-3 w-3 mr-1" />
                                  {milestone.reward.points} pts
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-carbon-600">Progress</span>
                                  <span className="font-medium">
                                    {milestone.currentValue} / {milestone.targetValue} {milestone.unit}
                                  </span>
                                </div>
                                <Progress value={progress} className="h-2" />
                                
                                {milestone.deadline && (
                                  <div className="text-xs text-carbon-500">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    Due {milestone.deadline.toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  
                  {mockMilestones.filter(m => !m.isCompleted).length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="font-medium text-carbon-900 mb-2">All milestones completed!</h3>
                      <p className="text-carbon-600">Great work! New challenges are coming soon.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Streaks & Achievements */}
          <div className="space-y-6">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span>Streaks</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockStreaks.map((streak, index) => {
                    const Icon = getStreakIcon(streak);
                    return (
                      <div key={index} className="p-3 bg-carbon-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Icon className={cn('h-4 w-4', getStreakColor(streak))} />
                            <span className="font-medium capitalize">{streak.type}</span>
                          </div>
                          <Badge variant="secondary">
                            {streak.current} {streak.type === 'daily' ? 'days' : 'weeks'}
                          </Badge>
                        </div>
                        
                        <div className="text-center">
                          <motion.div
                            className={cn('text-2xl font-bold', getStreakColor(streak))}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            key={streak.current}
                          >
                            {streak.current}
                          </motion.div>
                          <div className="text-sm text-carbon-600">
                            Best: {streak.longest}
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-carbon-500 mb-1">
                            <span>Next milestone</span>
                            <span>
                              {streak.milestones.find(m => m > streak.current) || streak.milestones[streak.milestones.length - 1]}
                            </span>
                          </div>
                          <Progress 
                            value={(streak.current / (streak.milestones.find(m => m > streak.current) || streak.milestones[streak.milestones.length - 1])) * 100}
                            className="h-1"
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-green-500" />
                    <span>Recent Achievements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockMilestones.filter(m => m.isCompleted).map((milestone) => (
                    <div key={milestone.id} className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-green-800">{milestone.name}</h4>
                        <p className="text-sm text-green-600">
                          Completed {milestone.completedAt?.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="success">
                        +{milestone.reward.points} pts
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {showComparison && (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <span>Comparison</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-carbon-600">Team Average</span>
                        <span className="font-medium">0.28 kg CO₂</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-carbon-600">Organization Avg</span>
                        <span className="font-medium">0.35 kg CO₂</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-carbon-600">Global Average</span>
                        <span className="font-medium">0.42 kg CO₂</span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <Badge variant="success" className="w-full justify-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        You're 15% better than team average
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};