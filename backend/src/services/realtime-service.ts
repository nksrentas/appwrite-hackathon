import { logger } from '../utils/logging-utils';

export interface RealtimeEvent {
  event: string;
  data: any;
  timestamp: string;
}

export interface CarbonUpdateEvent extends RealtimeEvent {
  event: 'carbon.calculated' | 'carbon.updated';
  data: {
    user_id: string;
    activity_id: string;
    carbon_kg: number;
    confidence: string;
  };
}

export interface UserActivityEvent extends RealtimeEvent {
  event: 'activity.created' | 'activity.updated';
  data: {
    user_id: string;
    activity_id: string;
    activity_type: string;
    repository: string;
  };
}

export interface LeaderboardUpdateEvent extends RealtimeEvent {
  event: 'leaderboard.updated';
  data: {
    period_type: string;
    updated_users: string[];
  };
}

export const REALTIME_CHANNELS = {
  USER_CARBON: (userId: string) => `user.${userId}.carbon`,
  USER_ACTIVITIES: (userId: string) => `user.${userId}.activities`,
  LEADERBOARD: (periodType: string) => `leaderboard.${periodType}`,
  GLOBAL_STATS: () => 'global.stats'
};

export class EcoTraceRealtimeService {
  private isConnected: boolean = false;

  constructor() {
    // Client initialization will be implemented in future iterations
  }

  async connect(): Promise<void> {
    try {
      this.isConnected = true;
      logger.info('EcoTrace Realtime service initialized');
    } catch (error: any) {
      logger.error('Failed to initialize realtime service', {
        error: {
          code: 'REALTIME_INIT_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  subscribeToUserCarbon(
    userId: string
  ): string {
    const channel = REALTIME_CHANNELS.USER_CARBON(userId);
    
    logger.warn(`Server-side real-time subscriptions not supported. Channel: ${channel}. Use client-side SDK for subscriptions.`);
    
    return channel;
  }

  subscribeToUserActivities(
    userId: string
  ): string {
    const channel = REALTIME_CHANNELS.USER_ACTIVITIES(userId);
    
    logger.warn(`Server-side real-time subscriptions not supported. Channel: ${channel}. Use client-side SDK for subscriptions.`);
    
    return channel;
  }

  subscribeToLeaderboard(
    periodType: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): string {
    const channel = REALTIME_CHANNELS.LEADERBOARD(periodType);
    
    logger.warn(`Server-side real-time subscriptions not supported. Channel: ${channel}. Use client-side SDK for subscriptions.`);
    
    return channel;
  }

  subscribeToGlobalStats(): string {
    const channel = REALTIME_CHANNELS.GLOBAL_STATS();
    
    logger.warn(`Server-side real-time subscriptions not supported. Channel: ${channel}. Use client-side SDK for subscriptions.`);
    
    return channel;
  }

  unsubscribe(channel: string): boolean {
    logger.info(`Unsubscribe requested for channel: ${channel} (server-side mode)`);
    return true;
  }

  disconnect(): void {
    this.isConnected = false;
    logger.info('Realtime service disconnected');
  }

  isReady(): boolean {
    return this.isConnected;
  }

  getActiveSubscriptions(): string[] {
    return [];
  }
}

export class RealtimeEventBroadcaster {
  // Service will be implemented in future iterations

  async broadcastCarbonUpdate(params: {
    userId: string;
    activityId: string;
    carbonKg: number;
    confidence: string;
  }): Promise<void> {
    const { userId, activityId, carbonKg, confidence } = params;
    const channel = REALTIME_CHANNELS.USER_CARBON(userId);
    
    // Import WebSocket service dynamically to avoid circular dependencies
    const { webSocketService } = await import('./websocket-service');
    const { liveDataService } = await import('./live-data-service');
    
    // Broadcast via WebSocket
    webSocketService.broadcast({
      channel,
      event: 'carbon.calculated',
      data: {
        user_id: userId,
        activity_id: activityId,
        carbon_kg: carbonKg,
        confidence,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
    await liveDataService.processCarbonUpdate({
      userId,
      activityId,
      carbonKg,
      activityType: 'unknown', // Will be determined by live service
      confidence
    });
    
    logger.info('Carbon update broadcasted', {
      userId,
      activityId,
      metadata: { channel, carbonKg, confidence }
    });
  }

  async broadcastActivityUpdate(params: {
    userId: string;
    activityId: string;
    activityType: string;
    repository: string;
  }): Promise<void> {
    const { userId, activityId, activityType, repository } = params;
    const channel = REALTIME_CHANNELS.USER_ACTIVITIES(userId);
    
    // Import WebSocket service dynamically to avoid circular dependencies
    const { webSocketService } = await import('./websocket-service');
    const { liveDataService } = await import('./live-data-service');
    
    // Broadcast via WebSocket
    webSocketService.broadcast({
      channel,
      event: 'activity.created',
      data: {
        user_id: userId,
        activity_id: activityId,
        activity_type: activityType,
        repository,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
    await liveDataService.processActivityUpdate({
      userId,
      activityId,
      activityType,
      repository
    });
    
    logger.info('Activity update broadcasted', {
      userId,
      activityId,
      metadata: { channel, activityType, repository }
    });
  }

  async broadcastLeaderboardUpdate(params: {
    periodType: string;
    updatedUsers: string[];
  }): Promise<void> {
    const { periodType, updatedUsers } = params;
    const channel = REALTIME_CHANNELS.LEADERBOARD(periodType);
    
    // Import WebSocket service dynamically to avoid circular dependencies
    const { webSocketService } = await import('./websocket-service');
    
    // Broadcast via WebSocket
    webSocketService.broadcast({
      channel,
      event: 'leaderboard.updated',
      data: {
        period_type: periodType,
        updated_users: updatedUsers,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
    logger.info('Leaderboard update broadcasted', {
      metadata: { periodType, channel, updatedUsersCount: updatedUsers.length }
    });
  }
}

export const realtimeService = new EcoTraceRealtimeService();
export const realtimeBroadcaster = new RealtimeEventBroadcaster();

logger.info('EcoTrace Realtime services initialized (server-side)', {
  metadata: {
    note: 'Real-time subscriptions require client-side SDK',
    channels: Object.keys(REALTIME_CHANNELS)
  }
});