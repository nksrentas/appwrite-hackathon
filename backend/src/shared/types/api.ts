export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  response_time_ms?: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  code?: string;
  details?: any;
}

export interface HealthCheckResponse {
  status: 'OK' | 'ERROR';
  message: string;
  timestamp: string;
  uptime: number;
  version: string;
  services?: {
    database: 'healthy' | 'unhealthy';
    cache: 'healthy' | 'unhealthy';
    websocket: 'healthy' | 'unhealthy';
  };
}

export interface WebSocketMessage {
  channel: string;
  event: string;
  data: any;
  timestamp: string;
}

export interface BroadcastRequest {
  channels: string[];
  event: string;
  data: any;
  userId?: string;
}

export interface SubscriptionRequest {
  channel: string;
  userId?: string;
}

export interface AuthRequest {
  userId: string;
  token?: string;
}

export interface CarbonUpdateBroadcast {
  userId: string;
  activityId: string;
  carbonKg: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ActivityUpdateBroadcast {
  userId: string;
  activityId: string;
  activityType: 'commit' | 'pr' | 'ci_run' | 'deployment' | 'local_dev';
  repository?: string;
}

export interface LeaderboardUpdateBroadcast {
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

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface RequestContext {
  userId?: string;
  requestId: string;
  timestamp: number;
  method: string;
  path: string;
  ip?: string;
  userAgent?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}