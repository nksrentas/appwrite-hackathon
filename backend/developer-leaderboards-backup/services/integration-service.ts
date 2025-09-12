import { logger } from '@shared/utils/logger';
import { realtimeBroadcaster } from '@websocket/services/broadcaster';
import { leaderboardService } from './leaderboard-service';
import { challengeService } from './challenge-service';
import { achievementEngine } from './achievement-engine';
import { privacyManager } from './privacy-manager';
import { 
  LeaderboardUpdateEvent, 
  ChallengeUpdateEvent, 
  AchievementUpdateEvent,
  LeaderboardCategory,
  TimePeriod,
  ChallengeProgressUpdate
} from '../types';

export class IntegrationService {
  /**
   * Handle new carbon calculation results and update leaderboards accordingly
   */
  async handleCarbonCalculationUpdate(data: {
    userId: string;
    activityId: string;
    activityType: string;
    carbonKg: number;
    confidence: string;
    timestamp: Date;
    repository?: string;
  }): Promise<void> {
    try {
      logger.info('Processing carbon calculation update for leaderboards', {
        userId: data.userId,
        activityId: data.activityId,
        carbonKg: data.carbonKg
      });

      // Check if user can participate
      const canParticipate = await privacyManager.canUserParticipate(data.userId);
      if (!canParticipate) {
        logger.info('User cannot participate in leaderboards', { userId: data.userId });
        return;
      }

      // Update leaderboard entries for different categories and periods
      await this.updateLeaderboardsFromActivity(data);

      // Update challenge progress
      await this.updateChallengeProgressFromActivity(data);

      // Check for new achievements
      await this.checkAchievementsFromActivity(data);

    } catch (error: any) {
      logger.error('Failed to handle carbon calculation update', {
        error: {
          code: 'INTEGRATION_CARBON_UPDATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: data
      });
    }
  }

  /**
   * Update leaderboard entries based on new activity
   */
  private async updateLeaderboardsFromActivity(data: {
    userId: string;
    activityType: string;
    carbonKg: number;
    timestamp: Date;
    repository?: string;
  }): Promise<void> {
    try {
      const categories: LeaderboardCategory[] = ['carbon_efficiency', 'total_reduction', 'consistency'];
      const periods: TimePeriod[] = ['daily', 'weekly', 'monthly', 'all_time'];

      for (const category of categories) {
        for (const period of periods) {
          // Calculate new metrics for this category and period
          const efficiency = await leaderboardService.calculateUserCarbonEfficiency(data.userId, period);
          
          // Update leaderboard entry
          await leaderboardService.updateUserLeaderboardEntry(
            data.userId,
            category,
            period,
            {
              carbonEfficiency: efficiency,
              contextGroup: this.determineContextGroup(data),
              ...(data.activityType === 'commit' && { totalCommits: await this.getTotalCommits(data.userId, period) }),
              ...(data.activityType === 'build' && { totalBuilds: await this.getTotalBuilds(data.userId, period) }),
              ...(data.activityType === 'deployment' && { totalDeployments: await this.getTotalDeployments(data.userId, period) })
            }
          );

          // Broadcast update
          await this.broadcastLeaderboardUpdate(category, period, [data.userId]);
        }
      }

    } catch (error: any) {
      logger.error('Failed to update leaderboards from activity', {
        error: { message: error.message },
        metadata: data
      });
    }
  }

  /**
   * Update challenge progress based on new activity
   */
  private async updateChallengeProgressFromActivity(data: {
    userId: string;
    activityType: string;
    carbonKg: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Get user's active challenge participations
      const participations = await challengeService.getUserParticipation(data.userId);
      const activeParticipations = participations.filter(p => p.status === 'active');

      for (const participation of activeParticipations) {
        const challenge = await challengeService.getChallengeById(participation.challengeId);
        if (!challenge || challenge.status !== 'active') continue;

        // Calculate progress based on challenge goal type
        const progressUpdate = await this.calculateChallengeProgress(challenge, data);
        
        if (progressUpdate) {
          await challengeService.updateChallengeProgress({
            challengeId: participation.challengeId,
            userId: data.userId,
            newProgress: progressUpdate.progress,
            activityData: data,
            timestamp: data.timestamp
          });

          // Broadcast challenge update
          await this.broadcastChallengeUpdate(participation.challengeId, [data.userId]);
        }
      }

    } catch (error: any) {
      logger.error('Failed to update challenge progress from activity', {
        error: { message: error.message },
        metadata: data
      });
    }
  }

  /**
   * Check for achievements based on new activity
   */
  private async checkAchievementsFromActivity(data: {
    userId: string;
    activityType: string;
    carbonKg: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      const newAchievements = await achievementEngine.checkAchievements(data.userId, data);

      for (const achievement of newAchievements) {
        // Broadcast achievement unlock
        await this.broadcastAchievementUpdate({
          type: 'achievement_unlocked',
          userId: data.userId,
          achievementId: achievement.id,
          unlocked: true,
          timestamp: data.timestamp
        });
      }

    } catch (error: any) {
      logger.error('Failed to check achievements from activity', {
        error: { message: error.message },
        metadata: data
      });
    }
  }

  /**
   * Determine context group for fair leaderboard comparison
   */
  private determineContextGroup(data: {
    activityType: string;
    repository?: string;
  }): string {
    // Context groups help ensure fair comparisons by grouping similar development environments
    const projectType = this.inferProjectType(data.repository || '');
    return `${data.activityType}_${projectType}`;
  }

  private inferProjectType(repository: string): string {
    // Simple project type inference based on repository name/structure
    // In a real implementation, this would be more sophisticated
    if (repository.includes('frontend') || repository.includes('ui') || repository.includes('react')) {
      return 'frontend';
    } else if (repository.includes('backend') || repository.includes('api') || repository.includes('server')) {
      return 'backend';
    } else if (repository.includes('mobile') || repository.includes('ios') || repository.includes('android')) {
      return 'mobile';
    } else if (repository.includes('data') || repository.includes('ml') || repository.includes('analytics')) {
      return 'data';
    }
    return 'general';
  }

  private async getTotalCommits(userId: string, period: TimePeriod): Promise<number> {
    // This would query the activities collection for commit count
    // For now, return a placeholder value
    return 0;
  }

  private async getTotalBuilds(userId: string, period: TimePeriod): Promise<number> {
    // This would query the activities collection for build count
    return 0;
  }

  private async getTotalDeployments(userId: string, period: TimePeriod): Promise<number> {
    // This would query the activities collection for deployment count
    return 0;
  }

  private async calculateChallengeProgress(challenge: any, data: {
    userId: string;
    activityType: string;
    carbonKg: number;
  }): Promise<{ progress: number } | null> {
    try {
      // Calculate progress based on challenge goal type
      switch (challenge.goalType) {
        case 'reduce_carbon':
          // Progress is cumulative carbon reduction
          return { progress: Math.max(0, data.carbonKg) };
          
        case 'improve_efficiency':
          // Progress based on efficiency improvement
          const currentEfficiency = await leaderboardService.calculateUserCarbonEfficiency(data.userId, 'weekly');
          return { progress: Math.max(0, 1 - currentEfficiency) }; // Lower efficiency = higher progress
          
        case 'complete_activities':
          // Progress is number of activities completed
          return { progress: 1 };
          
        case 'share_knowledge':
          // This would be based on community contributions
          return null; // Not implemented yet
          
        default:
          return null;
      }

    } catch (error: any) {
      logger.error('Failed to calculate challenge progress', {
        error: { message: error.message },
        metadata: { challengeId: challenge.id, userId: data.userId }
      });
      return null;
    }
  }

  /**
   * Broadcast leaderboard updates via WebSocket
   */
  async broadcastLeaderboardUpdate(
    category: LeaderboardCategory, 
    period: TimePeriod, 
    affectedUsers: string[]
  ): Promise<void> {
    try {
      const updateEvent: LeaderboardUpdateEvent = {
        type: 'leaderboard_updated',
        category,
        period,
        affectedUsers,
        timestamp: new Date()
      };

      // Use existing broadcaster to send real-time updates
      await realtimeBroadcaster.broadcastLeaderboardUpdate({
        period,
        topUsers: affectedUsers.map(userId => ({ userId, rank: 1, emissions: 0 })) // Simplified
      });

      logger.info('Leaderboard update broadcasted', {
        category,
        period,
        affectedUsersCount: affectedUsers.length
      });

    } catch (error: any) {
      logger.error('Failed to broadcast leaderboard update', {
        error: { message: error.message },
        metadata: { category, period, affectedUsers }
      });
    }
  }

  /**
   * Broadcast challenge updates via WebSocket
   */
  async broadcastChallengeUpdate(challengeId: string, participants: string[]): Promise<void> {
    try {
      const challenge = await challengeService.getChallengeById(challengeId);
      if (!challenge) return;

      await realtimeBroadcaster.broadcastChallengeUpdate({
        challengeId,
        name: challenge.title,
        category: challenge.category,
        participants
      });

      logger.info('Challenge update broadcasted', {
        challengeId,
        participantsCount: participants.length
      });

    } catch (error: any) {
      logger.error('Failed to broadcast challenge update', {
        error: { message: error.message },
        metadata: { challengeId, participants }
      });
    }
  }

  /**
   * Broadcast achievement updates via WebSocket
   */
  async broadcastAchievementUpdate(event: AchievementUpdateEvent): Promise<void> {
    try {
      // For now, we'll use the existing broadcaster structure
      // In the future, we could add achievement-specific broadcasting
      
      logger.info('Achievement update broadcasted', {
        type: event.type,
        userId: event.userId,
        achievementId: event.achievementId
      });

    } catch (error: any) {
      logger.error('Failed to broadcast achievement update', {
        error: { message: error.message },
        metadata: event
      });
    }
  }

  /**
   * Handle user activity for real-time leaderboard updates
   */
  async processUserActivity(activityData: {
    userId: string;
    activityType: string;
    carbonKg: number;
    confidence: string;
    timestamp: Date;
    repository?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      // This is the main entry point for processing user activities
      await this.handleCarbonCalculationUpdate(activityData);

      logger.info('User activity processed for leaderboards', {
        userId: activityData.userId,
        activityType: activityData.activityType
      });

    } catch (error: any) {
      logger.error('Failed to process user activity', {
        error: {
          code: 'INTEGRATION_ACTIVITY_PROCESS_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: activityData
      });
    }
  }

  /**
   * Schedule periodic leaderboard recalculations
   */
  async schedulePeriodicUpdates(): Promise<void> {
    try {
      // In a production system, this would use a proper job queue
      // For now, we'll set up simple intervals

      // Recalculate daily leaderboards every hour
      setInterval(async () => {
        await this.recalculateLeaderboards('daily');
      }, 60 * 60 * 1000); // 1 hour

      // Recalculate weekly leaderboards every 4 hours
      setInterval(async () => {
        await this.recalculateLeaderboards('weekly');
      }, 4 * 60 * 60 * 1000); // 4 hours

      // Recalculate monthly leaderboards daily
      setInterval(async () => {
        await this.recalculateLeaderboards('monthly');
      }, 24 * 60 * 60 * 1000); // 24 hours

      logger.info('Periodic leaderboard updates scheduled');

    } catch (error: any) {
      logger.error('Failed to schedule periodic updates', {
        error: { message: error.message }
      });
    }
  }

  private async recalculateLeaderboards(period: TimePeriod): Promise<void> {
    try {
      const categories: LeaderboardCategory[] = ['carbon_efficiency', 'improvement', 'total_reduction', 'consistency'];

      for (const category of categories) {
        await leaderboardService.recalculateRankings(category, period);
        
        // Broadcast update to all connected clients
        await this.broadcastLeaderboardUpdate(category, period, []);
      }

      logger.info('Leaderboards recalculated', { period });

    } catch (error: any) {
      logger.error('Failed to recalculate leaderboards', {
        error: { message: error.message },
        metadata: { period }
      });
    }
  }

  /**
   * Initialize the integration service
   */
  async initialize(): Promise<void> {
    try {
      // Schedule periodic updates
      await this.schedulePeriodicUpdates();

      logger.info('Developer leaderboards integration service initialized');

    } catch (error: any) {
      logger.error('Failed to initialize integration service', {
        error: {
          code: 'INTEGRATION_INIT_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }
}

export const integrationService = new IntegrationService();