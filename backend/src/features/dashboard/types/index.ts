import { Activity, LeaderboardEntry } from '@shared/types/database';

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