/**
 * Live Data Streaming Service
 * Orchestrates real-time data updates and streaming for dashboard components
 * Manages data pipelines, aggregation, and broadcasting
 */

import { webSocketService } from './websocket-service';
import { DashboardService } from './dashboard-service';
import { ActivityService } from './database-service';
import { logger } from '../utils/logging-utils';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { cache } from '../utils/appwrite-client';

export interface StreamingDataOptions {
  userId?: string;
  channels: string[];
  updateInterval?: number;
  maxBatchSize?: number;
}

export interface DataStreamUpdate {
  type: 'carbon_update' | 'activity_update' | 'leaderboard_update' | 'stats_update';
  userId?: string;
  data: any;
  timestamp: string;
}

export interface CarbonStreamData {
  userId: string;
  currentTotal: number;
  recentChange: number;
  efficiency: number;
  lastActivity: {
    type: string;
    carbonKg: number;
    timestamp: string;
  } | null;
}

export interface ActivityStreamData {
  userId: string;
  activities: {
    id: string;
    type: string;
    carbonKg: number;
    repository?: string;
    timestamp: string;
  }[];
  totalToday: number;
}

export interface LeaderboardStreamData {
  period: string;
  topUsers: {
    userId: string;
    username: string;
    carbonKg: number;
    rank: number;
    change: number;
  }[];
  userPosition?: {
    rank: number;
    percentile: number;
  };
}

export class LiveDataService {
  private performanceMonitor: PerformanceMonitor;
  private streamingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeStreams: Set<string> = new Set();
  private updateBatches: Map<string, DataStreamUpdate[]> = new Map();
  private lastBroadcastTimes: Map<string, number> = new Map();
  
  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    logger.info('Live Data Service initialized');
  }
  
  /**
   * Start streaming live data for user
   */
  startUserStream(userId: string, options: Partial<StreamingDataOptions> = {}): void {
    const streamKey = `user_${userId}`;
    
    if (this.activeStreams.has(streamKey)) {
      logger.debug('User stream already active', { userId });
      return;
    }
    
    const config = {
      userId,
      channels: [
        `user.${userId}.carbon`,
        `user.${userId}.activities`,
        'global.stats'
      ],
      updateInterval: options.updateInterval || 5000, // 5 seconds
      maxBatchSize: options.maxBatchSize || 10,
      ...options
    };
    
    this.activeStreams.add(streamKey);
    
    // Start streaming interval
    const interval = setInterval(async () => {
      await this.processUserStreamUpdate(userId, config);
    }, config.updateInterval);
    
    this.streamingIntervals.set(streamKey, interval);
    
    logger.info('User stream started', {
      userId,
      updateInterval: config.updateInterval,
      channels: config.channels.length
    });
  }
  
  /**
   * Stop streaming for user
   */
  stopUserStream(userId: string): void {
    const streamKey = `user_${userId}`;
    
    const interval = this.streamingIntervals.get(streamKey);
    if (interval) {
      clearInterval(interval);
      this.streamingIntervals.delete(streamKey);
    }
    
    this.activeStreams.delete(streamKey);
    this.updateBatches.delete(streamKey);
    
    logger.info('User stream stopped', { userId });
  }
  
  /**
   * Start global leaderboard streaming
   */
  startLeaderboardStream(period: 'daily' | 'weekly' | 'monthly' = 'weekly'): void {
    const streamKey = `leaderboard_${period}`;
    
    if (this.activeStreams.has(streamKey)) {
      return;
    }
    
    this.activeStreams.add(streamKey);
    
    // Update every 30 seconds
    const interval = setInterval(async () => {
      await this.processLeaderboardStreamUpdate(period);
    }, 30000);
    
    this.streamingIntervals.set(streamKey, interval);
    
    logger.info('Leaderboard stream started', { period });
  }
  
  /**
   * Stop leaderboard streaming
   */
  stopLeaderboardStream(period: string): void {
    const streamKey = `leaderboard_${period}`;
    
    const interval = this.streamingIntervals.get(streamKey);
    if (interval) {
      clearInterval(interval);
      this.streamingIntervals.delete(streamKey);
    }
    
    this.activeStreams.delete(streamKey);
    
    logger.info('Leaderboard stream stopped', { period });
  }
  
  /**
   * Process carbon activity update and broadcast
   */
  async processCarbonUpdate(params: {
    userId: string;
    activityId: string;
    carbonKg: number;
    activityType: string;
    confidence: string;
  }): Promise<void> {
    const { userId, activityId, carbonKg, activityType, confidence } = params;
    const startTime = Date.now();
    
    try {
      // Get updated carbon data
      const carbonData = await DashboardService.getUserCarbonData({
        userId,
        period: 'weekly'
      });
      
      const streamData: CarbonStreamData = {
        userId,
        currentTotal: carbonData.current_total,
        recentChange: carbonKg,
        efficiency: carbonData.efficiency_score,
        lastActivity: {
          type: activityType,
          carbonKg,
          timestamp: new Date().toISOString()
        }
      };
      
      // Broadcast to user's carbon channel
      webSocketService.broadcast({
        channel: `user.${userId}.carbon`,
        event: 'carbon_updated',
        data: streamData,
        timestamp: new Date().toISOString()
      });
      
      // Also broadcast to global stats if significant change
      if (carbonKg > 0.001) { // More than 1g CO2
        webSocketService.broadcast({
          channel: 'global.stats',
          event: 'global_carbon_update',
          data: {
            userId,
            carbonKg,
            activityType,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info('Carbon update processed and broadcasted', {
        userId,
        activityId,
        carbonKg,
        activityType,
        confidence,
        processingTime: `${duration}ms`,
        metadata: { efficiency: streamData.efficiency }
      });
      
      this.performanceMonitor.recordApiCall('/carbon-update', duration);
      
    } catch (error: any) {
      logger.error('Failed to process carbon update', {
        error: {
          code: 'CARBON_UPDATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId, activityId, carbonKg }
      });
    }
  }
  
  /**
   * Process activity creation and broadcast
   */
  async processActivityUpdate(params: {
    userId: string;
    activityId: string;
    activityType: string;
    repository?: string;
  }): Promise<void> {
    const { userId, activityId, activityType, repository } = params;
    const startTime = Date.now();
    
    try {
      // Get recent activities
      const activitiesResult = await ActivityService.getUserActivities({
        userId,
        limit: 10,
        offset: 0
      });
      
      // Calculate today's activity total
      const today = new Date().toISOString().split('T')[0];
      const todayActivities = activitiesResult.activities.filter(
        a => a.timestamp.startsWith(today)
      );
      const totalToday = todayActivities.reduce((sum, a) => sum + a.carbon_kg, 0);
      
      const streamData: ActivityStreamData = {
        userId,
        activities: activitiesResult.activities.slice(0, 5).map(activity => ({
          id: activity.$id,
          type: activity.type,
          carbonKg: activity.carbon_kg,
          repository: activity.repository?.full_name,
          timestamp: activity.timestamp
        })),
        totalToday: Math.round(totalToday * 1000) / 1000
      };
      
      webSocketService.broadcast({
        channel: `user.${userId}.activities`,
        event: 'activity_created',
        data: streamData,
        timestamp: new Date().toISOString()
      });
      
      const duration = Date.now() - startTime;
      logger.info('Activity update processed and broadcasted', {
        userId,
        activityId,
        activityType,
        repository,
        processingTime: `${duration}ms`,
        metadata: { totalToday }
      });
      
      this.performanceMonitor.recordApiCall('/activity-update', duration);
      
    } catch (error: any) {
      logger.error('Failed to process activity update', {
        error: {
          code: 'ACTIVITY_UPDATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId, activityId, activityType }
      });
    }
  }
  
  private async processUserStreamUpdate(
    userId: string,
    _config: StreamingDataOptions & { userId: string }
  ): Promise<void> {
    const streamKey = `user_${userId}`;
    const lastBroadcast = this.lastBroadcastTimes.get(streamKey) || 0;
    const now = Date.now();
    
    if (now - lastBroadcast < 3000) {
      return;
    }
    
    try {
      const cacheKey = `user_stream_${userId}_last_check`;
      const lastCheck = cache.get(cacheKey) || new Date(now - 60000).toISOString();
      
      const recentActivities = await ActivityService.getUserActivities({
        userId,
        limit: 5,
        offset: 0
      });
      
      const newActivities = recentActivities.activities.filter(
        activity => new Date(activity.timestamp) > new Date(lastCheck)
      );
      
      if (newActivities.length > 0) {
        const carbonData = await DashboardService.getUserCarbonData({
          userId,
          period: 'weekly'
        });
        
        const carbonStreamData: CarbonStreamData = {
          userId,
          currentTotal: carbonData.current_total,
          recentChange: newActivities.reduce((sum, a) => sum + a.carbon_kg, 0),
          efficiency: carbonData.efficiency_score,
          lastActivity: newActivities.length > 0 ? {
            type: newActivities[0].type,
            carbonKg: newActivities[0].carbon_kg,
            timestamp: newActivities[0].timestamp
          } : null
        };
        
        webSocketService.broadcast({
          channel: `user.${userId}.carbon`,
          event: 'carbon_updated',
          data: carbonStreamData,
          timestamp: new Date().toISOString()
        });
        
        this.lastBroadcastTimes.set(streamKey, now);
      }
      
      cache.set(cacheKey, new Date().toISOString(), 60000);
      
    } catch (error: any) {
      logger.error('User stream update failed', {
        error: {
          code: 'USER_STREAM_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId }
      });
    }
  }
  
  private async processLeaderboardStreamUpdate(period: string): Promise<void> {
    const streamKey = `leaderboard_${period}`;
    const lastBroadcast = this.lastBroadcastTimes.get(streamKey) || 0;
    const now = Date.now();
    
    if (now - lastBroadcast < 25000) {
      return;
    }
    
    try {
      const leaderboardData = await DashboardService.getLeaderboardData({
        period: period as any,
        limit: 20
      });
      
      const streamData: LeaderboardStreamData = {
        period,
        topUsers: leaderboardData.leaderboard.slice(0, 10).map(entry => ({
          userId: entry.user_id,
          username: `User_${entry.user_id.slice(-8)}`,
          carbonKg: entry.metrics.total_carbon_kg,
          rank: entry.rank,
          change: 0
        }))
      };
      
      webSocketService.broadcast({
        channel: `leaderboard.${period}`,
        event: 'leaderboard_updated',
        data: streamData,
        timestamp: new Date().toISOString()
      });
      
      this.lastBroadcastTimes.set(streamKey, now);
      
      logger.debug('Leaderboard stream updated', {
        period,
        topUsersCount: streamData.topUsers.length
      });
      
    } catch (error: any) {
      logger.error('Leaderboard stream update failed', {
        error: {
          code: 'LEADERBOARD_STREAM_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { period }
      });
    }
  }
  
  async processBatchUpdates(updates: DataStreamUpdate[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      const groupedUpdates = new Map<string, DataStreamUpdate[]>();
      
      updates.forEach(update => {
        const key = `${update.type}_${update.userId || 'global'}`;
        if (!groupedUpdates.has(key)) {
          groupedUpdates.set(key, []);
        }
        groupedUpdates.get(key)!.push(update);
      });
      
      for (const [key, groupUpdates] of groupedUpdates) {
        await this.processUpdateGroup(key, groupUpdates);
      }
      
      const duration = Date.now() - startTime;
      logger.info('Batch updates processed', {
        totalUpdates: updates.length,
        groups: groupedUpdates.size,
        processingTime: `${duration}ms`
      });
      
    } catch (error: any) {
      logger.error('Batch update processing failed', {
        error: {
          code: 'BATCH_UPDATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { updatesCount: updates.length }
      });
    }
  }
  
  private async processUpdateGroup(key: string, updates: DataStreamUpdate[]): Promise<void> {
    const [type, userId] = key.split('_');
    
    switch (type) {
      case 'carbon_update':
        const totalCarbon = updates.reduce((sum, u) => sum + (u.data.carbonKg || 0), 0);
        if (userId !== 'global' && totalCarbon > 0) {
          await this.processCarbonUpdate({
            userId,
            activityId: updates[updates.length - 1].data.activityId,
            carbonKg: totalCarbon,
            activityType: updates[updates.length - 1].data.activityType,
            confidence: updates[updates.length - 1].data.confidence
          });
        }
        break;
        
      case 'activity_update':
        for (const update of updates) {
          if (userId !== 'global') {
            await this.processActivityUpdate({
              userId,
              activityId: update.data.activityId,
              activityType: update.data.activityType,
              repository: update.data.repository
            });
          }
        }
        break;
        
      default:
        logger.debug('Unknown update type', { type, userId });
    }
  }
  
  getStreamingStats(): {
    activeStreams: number;
    userStreams: number;
    leaderboardStreams: number;
    totalBroadcasts: number;
    averageUpdateInterval: number;
  } {
    const userStreams = Array.from(this.activeStreams).filter(s => s.startsWith('user_')).length;
    const leaderboardStreams = Array.from(this.activeStreams).filter(s => s.startsWith('leaderboard_')).length;
    
    return {
      activeStreams: this.activeStreams.size,
      userStreams,
      leaderboardStreams,
      totalBroadcasts: Array.from(this.lastBroadcastTimes.values()).length,
      averageUpdateInterval: 5000
    };
  }
  
  shutdown(): void {
    this.streamingIntervals.forEach(interval => {
      clearInterval(interval);
    });
    
    this.streamingIntervals.clear();
    this.activeStreams.clear();
    this.updateBatches.clear();
    this.lastBroadcastTimes.clear();
    
    logger.info('Live Data Service shutdown completed');
  }
}

export const liveDataService = new LiveDataService();