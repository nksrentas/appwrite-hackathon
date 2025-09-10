export interface ConnectionInfo {
  id: string;
  userId?: string;
  subscriptions: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface BroadcastMessage {
  channel: string;
  event: string;
  data: any;
  timestamp: string;
}

export interface SubscriptionRequest {
  channel: string;
  userId?: string;
}

export interface AuthRequest {
  userId: string;
  token?: string;
}

export interface CarbonUpdateEvent {
  userId: string;
  activityId: string;
  carbonKg: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ActivityUpdateEvent {
  userId: string;
  activityId: string;
  activityType: 'commit' | 'pr' | 'ci_run' | 'deployment' | 'local_dev';
  repository?: string;
}

export interface LeaderboardUpdateEvent {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  topUsers: {
    userId: string;
    rank: number;
    metrics: {
      total_carbon_kg: number;
      efficiency_score: number;
    };
  }[];
}

export interface InsightUpdateEvent {
  userId: string;
  insightId: string;
  type: 'efficiency_tip' | 'pattern_analysis' | 'comparison' | 'achievement';
  title: string;
}

export interface ChallengeUpdateEvent {
  challengeId: string;
  name: string;
  category: 'efficiency' | 'awareness' | 'reduction' | 'methodology';
  participants: string[];
}