import { webSocketService } from './connection';
import { logger } from '@shared/utils/logger';
import { 
  CarbonUpdateEvent, 
  ActivityUpdateEvent, 
  LeaderboardUpdateEvent, 
  InsightUpdateEvent, 
  ChallengeUpdateEvent 
} from '@websocket/types';

export class RealtimeBroadcaster {
  async broadcastCarbonUpdate(event: CarbonUpdateEvent): Promise<void> {
    try {
      const { userId, activityId, carbonKg, confidence } = event;
      
      const channels = [
        `user.${userId}.carbon`,
        'global.stats'
      ];
      
      const data = {
        type: 'carbon_updated',
        userId,
        activityId,
        carbonKg,
        confidence,
        timestamp: new Date().toISOString()
      };
      
      webSocketService.broadcastToChannels(channels, 'carbon_updated', data);
      
      logger.info('Carbon update broadcasted', {
        userId,
        activityId,
        carbonKg,
        confidence
      });
      
    } catch (error: any) {
      logger.error('Failed to broadcast carbon update', {
        error: {
          code: 'CARBON_BROADCAST_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: event
      });
    }
  }
  
  async broadcastActivityUpdate(event: ActivityUpdateEvent): Promise<void> {
    try {
      const { userId, activityId, activityType, repository } = event;
      
      const channels = [
        `user.${userId}.activities`,
        'global.activities'
      ];
      
      const data = {
        type: 'activity_created',
        userId,
        activityId,
        activityType,
        repository,
        timestamp: new Date().toISOString()
      };
      
      webSocketService.broadcastToChannels(channels, 'activity_created', data);
      
      logger.info('Activity update broadcasted', {
        userId,
        activityId,
        activityType,
        repository
      });
      
    } catch (error: any) {
      logger.error('Failed to broadcast activity update', {
        error: {
          code: 'ACTIVITY_BROADCAST_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: event
      });
    }
  }
  
  async broadcastLeaderboardUpdate(event: LeaderboardUpdateEvent): Promise<void> {
    try {
      const { period, topUsers } = event;
      
      const channels = [
        `leaderboard.${period}`,
        'global.leaderboard'
      ];
      
      const data = {
        type: 'leaderboard_updated',
        period,
        topUsers,
        timestamp: new Date().toISOString()
      };
      
      webSocketService.broadcastToChannels(channels, 'leaderboard_updated', data);
      
      logger.info('Leaderboard update broadcasted', {
        period,
        topUsersCount: topUsers.length
      });
      
    } catch (error: any) {
      logger.error('Failed to broadcast leaderboard update', {
        error: {
          code: 'LEADERBOARD_BROADCAST_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: event
      });
    }
  }
  
  async broadcastInsightUpdate(event: InsightUpdateEvent): Promise<void> {
    try {
      const { userId, insightId, type, title } = event;
      
      const channels = [
        `user.${userId}.insights`
      ];
      
      const data = {
        type: 'insight_created',
        userId,
        insightId,
        insightType: type,
        title,
        timestamp: new Date().toISOString()
      };
      
      webSocketService.broadcastToChannels(channels, 'insight_created', data);
      
      logger.info('Insight update broadcasted', {
        userId,
        insightId,
        type,
        title
      });
      
    } catch (error: any) {
      logger.error('Failed to broadcast insight update', {
        error: {
          code: 'INSIGHT_BROADCAST_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: event
      });
    }
  }
  
  async broadcastChallengeUpdate(event: ChallengeUpdateEvent): Promise<void> {
    try {
      const { challengeId, name, category, participants } = event;
      
      const channels = [
        'global.challenges',
        ...participants.map(userId => `user.${userId}.challenges`)
      ];
      
      const data = {
        type: 'challenge_updated',
        challengeId,
        name,
        category,
        participantsCount: participants.length,
        timestamp: new Date().toISOString()
      };
      
      webSocketService.broadcastToChannels(channels, 'challenge_updated', data);
      
      logger.info('Challenge update broadcasted', {
        challengeId,
        name,
        category,
        participantsCount: participants.length
      });
      
    } catch (error: any) {
      logger.error('Failed to broadcast challenge update', {
        error: {
          code: 'CHALLENGE_BROADCAST_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: event
      });
    }
  }
  
  async broadcastSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    try {
      const data = {
        type: 'system_message',
        message,
        level,
        timestamp: new Date().toISOString()
      };
      
      webSocketService.broadcastToChannels(['global.system'], 'system_message', data);
      
      logger.info('System message broadcasted', { message, level });
      
    } catch (error: any) {
      logger.error('Failed to broadcast system message', {
        error: {
          code: 'SYSTEM_BROADCAST_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { message, level }
      });
    }
  }
  
  async broadcastMaintenanceNotice(
    message: string, 
    scheduledTime: string, 
    estimatedDuration: string
  ): Promise<void> {
    try {
      const data = {
        type: 'maintenance_notice',
        message,
        scheduledTime,
        estimatedDuration,
        timestamp: new Date().toISOString()
      };
      
      webSocketService.broadcastToChannels(['global.system'], 'maintenance_notice', data);
      
      logger.info('Maintenance notice broadcasted', {
        message,
        scheduledTime,
        estimatedDuration
      });
      
    } catch (error: any) {
      logger.error('Failed to broadcast maintenance notice', {
        error: {
          code: 'MAINTENANCE_BROADCAST_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { message, scheduledTime, estimatedDuration }
      });
    }
  }
}

export const realtimeBroadcaster = new RealtimeBroadcaster();