import { 
  ActivityService, 
  LeaderboardService
} from './database-service';
import { cache } from '../utils/appwrite-client';
import { logger } from '../utils/logging-utils';
import { Activity, LeaderboardEntry } from '../types/database-types';

export interface CarbonDataParams {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export interface CarbonDataResult {
  current_total: number;
  period_total: number;
  previous_period_total: number;
  change_percentage: number;
  breakdown_by_type: {
    commit: number;
    pr: number;
    ci_run: number;
    deployment: number;
    local_dev: number;
  };
  recent_activities: Activity[];
  efficiency_score: number;
  confidence_distribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface UserActivitiesParams {
  userId: string;
  limit: number;
  offset: number;
  type?: string;
  since?: string;
}

export interface UserActivitiesResult {
  activities: Activity[];
  total: number;
  has_more: boolean;
  since_timestamp?: string;
}

export interface UserStatsParams {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export interface UserStatsResult {
  total_carbon_kg: number;
  total_activities: number;
  avg_carbon_per_activity: number;
  avg_carbon_per_day: number;
  most_active_day: string;
  most_efficient_day: string;
  repositories_count: number;
  commits_count: number;
  prs_count: number;
  ci_runs_count: number;
  streak_days: number;
  rank_position?: number;
  percentile?: number;
}

export interface UserTrendsParams {
  userId: string;
  period: string;
  granularity: 'hourly' | 'daily' | 'weekly';
  days: number;
}

export interface UserTrendsResult {
  data_points: {
    timestamp: string;
    carbon_kg: number;
    activities_count: number;
    efficiency_score: number;
  }[];
  trend_analysis: {
    direction: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    confidence: number;
  };
  predictions: {
    next_week: number;
    next_month: number;
  };
}

export interface LeaderboardDataParams {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  limit: number;
  userId?: string;
}

export interface LeaderboardDataResult {
  leaderboard: LeaderboardEntry[];
  user_position?: LeaderboardEntry;
  total_participants: number;
  period_info: {
    start_date: string;
    end_date: string;
    days_remaining: number;
  };
}

export class DashboardService {
  static async getUserCarbonData(params: CarbonDataParams): Promise<CarbonDataResult> {
    const { userId, period } = params;
    const cacheKey = `dashboard_carbon_${userId}_${period}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.info('Dashboard carbon data served from cache', {
        userId,
        period,
        metadata: { cache_hit: true }
      });
      return cached;
    }
    
    try {
      const { currentStart, currentEnd, previousStart, previousEnd } = this.calculatePeriodRanges(period);
      
      const currentActivities = await ActivityService.getActivitiesByDateRange({
        startDate: currentStart,
        endDate: currentEnd,
        limit: 1000
      });
      
      const userCurrentActivities = currentActivities.activities.filter(a => a.user_id === userId);
      
      const previousActivities = await ActivityService.getActivitiesByDateRange({
        startDate: previousStart,
        endDate: previousEnd,
        limit: 1000
      });
      
      const userPreviousActivities = previousActivities.activities.filter(a => a.user_id === userId);
      
      const currentTotal = userCurrentActivities.reduce((sum, activity) => sum + activity.carbon_kg, 0);
      const previousTotal = userPreviousActivities.reduce((sum, activity) => sum + activity.carbon_kg, 0);
      
      const changePercentage = previousTotal > 0 
        ? ((currentTotal - previousTotal) / previousTotal) * 100 
        : currentTotal > 0 ? 100 : 0;
      
      const breakdownByType = {
        commit: 0,
        pr: 0,
        ci_run: 0,
        deployment: 0,
        local_dev: 0
      };
      
      userCurrentActivities.forEach(activity => {
        if (activity.type in breakdownByType) {
          breakdownByType[activity.type as keyof typeof breakdownByType] += activity.carbon_kg;
        }
      });
      
      const totalActivities = userCurrentActivities.length;
      const avgCarbonPerActivity = totalActivities > 0 ? currentTotal / totalActivities : 0;
      const efficiencyScore = Math.max(0, Math.min(100, 100 - (avgCarbonPerActivity * 1000)));
      
      const confidenceDistribution = {
        high: 0,
        medium: 0,
        low: 0
      };
      
      userCurrentActivities.forEach(activity => {
        confidenceDistribution[activity.calculation_confidence]++;
      });
      
      const recentActivities = userCurrentActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
      
      const result: CarbonDataResult = {
        current_total: Math.round(currentTotal * 1000) / 1000,
        period_total: Math.round(currentTotal * 1000) / 1000,
        previous_period_total: Math.round(previousTotal * 1000) / 1000,
        change_percentage: Math.round(changePercentage * 100) / 100,
        breakdown_by_type: {
          commit: Math.round(breakdownByType.commit * 1000) / 1000,
          pr: Math.round(breakdownByType.pr * 1000) / 1000,
          ci_run: Math.round(breakdownByType.ci_run * 1000) / 1000,
          deployment: Math.round(breakdownByType.deployment * 1000) / 1000,
          local_dev: Math.round(breakdownByType.local_dev * 1000) / 1000
        },
        recent_activities: recentActivities,
        efficiency_score: Math.round(efficiencyScore * 100) / 100,
        confidence_distribution: confidenceDistribution
      };
      
      cache.set(cacheKey, result, 2 * 60 * 1000);
      
      logger.info('Dashboard carbon data calculated', {
        userId,
        period,
        currentTotal: result.current_total,
        previousTotal: result.previous_period_total,
        changePercentage: result.change_percentage,
        metadata: { activities_count: totalActivities }
      });
      
      return result;
      
    } catch (error: any) {
      logger.error('Failed to calculate dashboard carbon data', {
        error: {
          message: error.message,
          code: 'DASHBOARD_CARBON_ERROR',
          stack: error.stack
        },
        metadata: { userId, period }
      });
      throw error;
    }
  }
  
  static async getUserActivities(params: UserActivitiesParams): Promise<UserActivitiesResult> {
    const { userId, limit, offset, type, since } = params;
    
    try {
      let queryLimit = Math.min(limit, 100); // Cap at 100
      
      const result = await ActivityService.getUserActivities({
        userId,
        limit: queryLimit + 1, // Get one extra to check if there are more
        offset
      });
      
      let activities = result.activities;
      
      if (type && type !== 'all') {
        activities = activities.filter(activity => activity.type === type);
      }
      
      if (since) {
        const sinceDate = new Date(since);
        activities = activities.filter(activity => new Date(activity.timestamp) > sinceDate);
      }
      
      const hasMore = activities.length > queryLimit;
      if (hasMore) {
        activities = activities.slice(0, queryLimit);
      }
      
      logger.info('Dashboard activities retrieved', {
        userId,
        limit: queryLimit,
        offset,
        type,
        since,
        returned: activities.length,
        hasMore,
        metadata: { total: result.total }
      });
      
      return {
        activities,
        total: result.total,
        has_more: hasMore,
        since_timestamp: since
      };
      
    } catch (error: any) {
      logger.error('Failed to get dashboard activities', {
        error: {
          message: error.message,
          code: 'DASHBOARD_ACTIVITIES_ERROR',
          stack: error.stack
        },
        metadata: { userId, limit, offset, type, since }
      });
      throw error;
    }
  }
  
  static async getUserStats(params: UserStatsParams): Promise<UserStatsResult> {
    const { userId, period } = params;
    const cacheKey = `dashboard_stats_${userId}_${period}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const { currentStart, currentEnd } = this.calculatePeriodRanges(period);
      
      const activitiesResult = await ActivityService.getActivitiesByDateRange({
        startDate: currentStart,
        endDate: currentEnd,
        limit: 2000
      });
      
      const userActivities = activitiesResult.activities.filter(a => a.user_id === userId);
      
      const totalActivities = userActivities.length;
      const totalCarbonKg = userActivities.reduce((sum, activity) => sum + activity.carbon_kg, 0);
      const avgCarbonPerActivity = totalActivities > 0 ? totalCarbonKg / totalActivities : 0;
      
      const periodDays = Math.ceil(
        (new Date(currentEnd).getTime() - new Date(currentStart).getTime()) / (1000 * 60 * 60 * 24)
      );
      const avgCarbonPerDay = periodDays > 0 ? totalCarbonKg / periodDays : 0;
      
      const typeCounts = {
        commits: userActivities.filter(a => a.type === 'commit').length,
        prs: userActivities.filter(a => a.type === 'pr').length,
        ci_runs: userActivities.filter(a => a.type === 'ci_run').length
      };
      
      const repositories = new Set(
        userActivities
          .filter(a => a.repository)
          .map(a => a.repository?.full_name || '')
      );
      
      const dailyStats = this.calculateDailyStats(userActivities);
      const mostActiveDay = this.findMostActiveDay(dailyStats);
      const mostEfficientDay = this.findMostEfficientDay(dailyStats);
      
      const streakDays = this.calculateStreakDays(userActivities);
      
      let rankPosition: number | undefined;
      let percentile: number | undefined;
      
      try {
        const userPosition = await LeaderboardService.getUserPosition({ userId, periodType: period });
        if (userPosition.position) {
          rankPosition = userPosition.position.rank;
          percentile = userPosition.position.percentile;
        }
      } catch (error) {
        logger.warn('Could not get leaderboard position for user stats', { userId, period });
      }
      
      const result: UserStatsResult = {
        total_carbon_kg: Math.round(totalCarbonKg * 1000) / 1000,
        total_activities: totalActivities,
        avg_carbon_per_activity: Math.round(avgCarbonPerActivity * 1000000) / 1000000,
        avg_carbon_per_day: Math.round(avgCarbonPerDay * 1000) / 1000,
        most_active_day: mostActiveDay,
        most_efficient_day: mostEfficientDay,
        repositories_count: repositories.size,
        commits_count: typeCounts.commits,
        prs_count: typeCounts.prs,
        ci_runs_count: typeCounts.ci_runs,
        streak_days: streakDays,
        rank_position: rankPosition,
        percentile: percentile
      };
      
      cache.set(cacheKey, result, 5 * 60 * 1000);
      
      logger.info('Dashboard stats calculated', {
        userId,
        period,
        totalActivities,
        totalCarbonKg: result.total_carbon_kg,
        metadata: { repositories_count: result.repositories_count }
      });
      
      return result;
      
    } catch (error: any) {
      logger.error('Failed to calculate dashboard stats', {
        error: {
          message: error.message,
          code: 'DASHBOARD_STATS_ERROR',
          stack: error.stack
        },
        metadata: { userId, period }
      });
      throw error;
    }
  }
  
  static async getUserTrends(params: UserTrendsParams): Promise<UserTrendsResult> {
    const { userId, granularity, days } = params;
    const cacheKey = `dashboard_trends_${userId}_${granularity}_${days}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const activitiesResult = await ActivityService.getActivitiesByDateRange({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 5000
      });
      
      const userActivities = activitiesResult.activities.filter(a => a.user_id === userId);
      
      const dataPoints = this.groupActivitiesByGranularity(userActivities, granularity, days);
      
      const trendAnalysis = this.calculateTrendAnalysis(dataPoints);
      
      const predictions = this.calculatePredictions(dataPoints, trendAnalysis);
      
      const result: UserTrendsResult = {
        data_points: dataPoints,
        trend_analysis: trendAnalysis,
        predictions: predictions
      };
      
      cache.set(cacheKey, result, 10 * 60 * 1000);
      
      logger.info('Dashboard trends calculated', {
        userId,
        granularity,
        days,
        dataPoints: dataPoints.length,
        trend: trendAnalysis.direction,
        metadata: { activities_analyzed: userActivities.length }
      });
      
      return result;
      
    } catch (error: any) {
      logger.error('Failed to calculate dashboard trends', {
        error: {
          message: error.message,
          code: 'DASHBOARD_TRENDS_ERROR',
          stack: error.stack
        },
        metadata: { userId, granularity, days }
      });
      throw error;
    }
  }
  
  static async getLeaderboardData(params: LeaderboardDataParams): Promise<LeaderboardDataResult> {
    const { period, limit, userId } = params;
    
    try {
      const leaderboardResult = await LeaderboardService.getLeaderboard({ 
        periodType: period, 
        limit 
      });
      
      let userPosition: LeaderboardEntry | undefined;
      if (userId) {
        try {
          const positionResult = await LeaderboardService.getUserPosition({ 
            userId, 
            periodType: period 
          });
          userPosition = positionResult.position || undefined;
        } catch (error) {
          logger.warn('Could not get user position in leaderboard', { userId, period });
        }
      }
      
      const periodInfo = this.calculateLeaderboardPeriodInfo(period);
      
      const result: LeaderboardDataResult = {
        leaderboard: leaderboardResult.leaderboard,
        user_position: userPosition,
        total_participants: leaderboardResult.leaderboard.length > 0 
          ? leaderboardResult.leaderboard[0].total_participants 
          : 0,
        period_info: periodInfo
      };
      
      logger.info('Dashboard leaderboard retrieved', {
        period,
        limit,
        userId,
        returned: result.leaderboard.length,
        totalParticipants: result.total_participants,
        userRank: userPosition?.rank
      });
      
      return result;
      
    } catch (error: any) {
      logger.error('Failed to get dashboard leaderboard', {
        error: {
          message: error.message,
          code: 'DASHBOARD_LEADERBOARD_ERROR',
          stack: error.stack
        },
        metadata: { period, limit, userId }
      });
      throw error;
    }
  }
  
  
  private static calculatePeriodRanges(period: string) {
    const now = new Date();
    const currentEnd = now.toISOString();
    
    let currentStart: string;
    let previousStart: string;
    let previousEnd: string;
    
    switch (period) {
      case 'daily':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        currentStart = todayStart.toISOString();
        
        const yesterdayStart = new Date(todayStart.getTime() - (24 * 60 * 60 * 1000));
        const yesterdayEnd = new Date(todayStart.getTime() - 1);
        previousStart = yesterdayStart.toISOString();
        previousEnd = yesterdayEnd.toISOString();
        break;
        
      case 'weekly':
        const weekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        currentStart = weekStart.toISOString();
        
        const prevWeekStart = new Date(weekStart.getTime() - (7 * 24 * 60 * 60 * 1000));
        const prevWeekEnd = new Date(weekStart.getTime() - 1);
        previousStart = prevWeekStart.toISOString();
        previousEnd = prevWeekEnd.toISOString();
        break;
        
      case 'monthly':
        const monthStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        currentStart = monthStart.toISOString();
        
        const prevMonthStart = new Date(monthStart.getTime() - (30 * 24 * 60 * 60 * 1000));
        const prevMonthEnd = new Date(monthStart.getTime() - 1);
        previousStart = prevMonthStart.toISOString();
        previousEnd = prevMonthEnd.toISOString();
        break;
        
      case 'all_time':
      default:
        const yearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
        currentStart = yearAgo.toISOString();
        
        const twoYearsAgo = new Date(yearAgo.getTime() - (365 * 24 * 60 * 60 * 1000));
        previousStart = twoYearsAgo.toISOString();
        previousEnd = yearAgo.toISOString();
        break;
    }
    
    return { currentStart, currentEnd, previousStart, previousEnd };
  }
  
  private static calculateDailyStats(activities: Activity[]) {
    const dailyStats: { [date: string]: { carbon: number; count: number } } = {};
    
    activities.forEach(activity => {
      const date = activity.timestamp.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { carbon: 0, count: 0 };
      }
      dailyStats[date].carbon += activity.carbon_kg;
      dailyStats[date].count += 1;
    });
    
    return dailyStats;
  }
  
  private static findMostActiveDay(dailyStats: { [date: string]: { carbon: number; count: number } }): string {
    let maxCount = 0;
    let mostActiveDay = 'N/A';
    
    for (const [date, stats] of Object.entries(dailyStats)) {
      if (stats.count > maxCount) {
        maxCount = stats.count;
        mostActiveDay = date;
      }
    }
    
    return mostActiveDay;
  }
  
  private static findMostEfficientDay(dailyStats: { [date: string]: { carbon: number; count: number } }): string {
    let lowestCarbonPerActivity = Infinity;
    let mostEfficientDay = 'N/A';
    
    for (const [date, stats] of Object.entries(dailyStats)) {
      if (stats.count > 0) {
        const carbonPerActivity = stats.carbon / stats.count;
        if (carbonPerActivity < lowestCarbonPerActivity) {
          lowestCarbonPerActivity = carbonPerActivity;
          mostEfficientDay = date;
        }
      }
    }
    
    return mostEfficientDay;
  }
  
  private static calculateStreakDays(activities: Activity[]): number {
    if (activities.length === 0) return 0;
    
    const sortedActivities = activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const uniqueDays = new Set(
      sortedActivities.map(activity => activity.timestamp.split('T')[0])
    );
    
    const daysArray = Array.from(uniqueDays).sort().reverse();
    
    let streak = 0;
    for (let i = 0; i < daysArray.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      
      if (daysArray[i] === expectedDateStr) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  private static groupActivitiesByGranularity(
    activities: Activity[], 
    granularity: 'hourly' | 'daily' | 'weekly', 
    days: number
  ) {
    const dataPoints: UserTrendsResult['data_points'] = [];
    const now = new Date();
    
    const slots: { [key: string]: Activity[] } = {};
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      
      let key: string;
      switch (granularity) {
        case 'hourly':
            if (i < 1) {
            for (let h = 23; h >= 0; h--) {
              const hourDate = new Date(now.getTime() - (h * 60 * 60 * 1000));
              key = `${hourDate.toISOString().split(':')[0]}:00`;
              slots[key] = [];
            }
          }
          break;
        case 'daily':
          key = date.toISOString().split('T')[0];
          slots[key] = [];
          break;
        case 'weekly':
          const weekNumber = Math.floor(i / 7);
          key = `week-${weekNumber}`;
          if (!slots[key]) slots[key] = [];
          break;
      }
    }
    
    activities.forEach(activity => {
      const activityDate = new Date(activity.timestamp);
      
      let key: string;
      switch (granularity) {
        case 'hourly':
          key = `${activityDate.toISOString().split(':')[0]}:00`;
          break;
        case 'daily':
          key = activityDate.toISOString().split('T')[0];
          break;
        case 'weekly':
          const daysFromNow = Math.floor((now.getTime() - activityDate.getTime()) / (24 * 60 * 60 * 1000));
          const weekNumber = Math.floor(daysFromNow / 7);
          key = `week-${weekNumber}`;
          break;
        default:
          key = activityDate.toISOString().split('T')[0];
      }
      
      if (slots[key]) {
        slots[key].push(activity);
      }
    });
    
    for (const [timestamp, slotActivities] of Object.entries(slots)) {
      const carbonKg = slotActivities.reduce((sum, activity) => sum + activity.carbon_kg, 0);
      const activitiesCount = slotActivities.length;
      const efficiencyScore = activitiesCount > 0 
        ? Math.max(0, Math.min(100, 100 - (carbonKg / activitiesCount * 1000)))
        : 100;
      
      dataPoints.push({
        timestamp,
        carbon_kg: Math.round(carbonKg * 1000) / 1000,
        activities_count: activitiesCount,
        efficiency_score: Math.round(efficiencyScore * 100) / 100
      });
    }
    
    return dataPoints.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  
  private static calculateTrendAnalysis(dataPoints: UserTrendsResult['data_points']) {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable' as const,
        slope: 0,
        confidence: 0
      };
    }
    
    const n = dataPoints.length;
    const xValues = dataPoints.map((_, index) => index);
    const yValues = dataPoints.map(point => point.carbon_kg);
    
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.001) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }
    
    const totalVariation = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const explainedVariation = yValues.reduce((sum, _y, i) => {
      const predicted = yMean + slope * (xValues[i] - xMean);
      return sum + Math.pow(predicted - yMean, 2);
    }, 0);
    
    const confidence = totalVariation > 0 ? explainedVariation / totalVariation : 0;
    
    return {
      direction,
      slope: Math.round(slope * 10000) / 10000,
      confidence: Math.round(confidence * 100) / 100
    };
  }
  
  private static calculatePredictions(
    dataPoints: UserTrendsResult['data_points'],
    trendAnalysis: UserTrendsResult['trend_analysis']
  ) {
    if (dataPoints.length === 0) {
      return { next_week: 0, next_month: 0 };
    }
    
    const lastPoint = dataPoints[dataPoints.length - 1];
    const avgCarbon = dataPoints.reduce((sum, point) => sum + point.carbon_kg, 0) / dataPoints.length;
    
    let weekMultiplier = 1;
    let monthMultiplier = 1;
    
    if (trendAnalysis.direction === 'increasing') {
      weekMultiplier = 1 + (trendAnalysis.confidence * 0.1);
      monthMultiplier = 1 + (trendAnalysis.confidence * 0.3);
    } else if (trendAnalysis.direction === 'decreasing') {
      weekMultiplier = 1 - (trendAnalysis.confidence * 0.1);
      monthMultiplier = 1 - (trendAnalysis.confidence * 0.3);
    }
    
    const nextWeek = Math.max(0, lastPoint.carbon_kg * weekMultiplier);
    const nextMonth = Math.max(0, avgCarbon * monthMultiplier);
    
    return {
      next_week: Math.round(nextWeek * 1000) / 1000,
      next_month: Math.round(nextMonth * 1000) / 1000
    };
  }
  
  private static calculateLeaderboardPeriodInfo(period: string) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000) - 1);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        endDate = new Date(startDate.getTime() + (7 * 24 * 60 * 60 * 1000) - 1);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'all_time':
      default:
        startDate = new Date(2020, 0, 1);
        endDate = new Date(2030, 11, 31);
        break;
    }
    
    const daysRemaining = Math.max(0, Math.ceil(
      (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    ));
    
    return {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      days_remaining: daysRemaining
    };
  }
}