import { Databases, Query, ID } from 'node-appwrite';
import { client } from '@shared/config/appwrite';
import { logger } from '@shared/utils/logger';
import { cacheService } from '@shared/utils/cache';
import { 
  Achievement, 
  UserAchievement, 
  AchievementRequest, 
  AchievementResponse,
  AchievementUnlockEvent,
  UnlockCriteria,
  CriteriaCondition,
  AchievementCategory,
  AchievementRarity,
  ShareLevel
} from '../types';
import { privacyManager } from './privacy-manager';

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace';

export class AchievementEngine {
  private readonly achievementsCollectionId = 'achievements';
  private readonly userAchievementsCollectionId = 'user_achievements';
  private readonly activitiesCollectionId = 'activities';
  private readonly leaderboardCollectionId = 'developer_leaderboard';
  private readonly cacheKeyPrefix = 'achievements:';
  private readonly cacheTTL = 1800; // 30 minutes

  async getAchievements(request: AchievementRequest): Promise<AchievementResponse> {
    try {
      const {
        category,
        rarity,
        userId,
        onlyUnlocked = false
      } = request;

      logger.info('Getting achievements', { category, userId, metadata: { rarity, onlyUnlocked } });

      // Build queries for achievements
      const queries = [
        Query.equal('isActive', true),
        Query.orderDesc('points')
      ];

      if (category) queries.push(Query.equal('category', category));
      if (rarity) queries.push(Query.equal('rarity', rarity));

      const response = await databases.listDocuments(
        databaseId,
        this.achievementsCollectionId,
        queries
      );

      const achievements: Achievement[] = response.documents.map(doc => ({
        id: doc.$id,
        name: doc.name,
        description: doc.description,
        icon: doc.icon,
        category: doc.category as AchievementCategory,
        rarity: doc.rarity as AchievementRarity,
        unlockCriteria: JSON.parse(doc.unlockCriteria),
        points: doc.points,
        isActive: doc.isActive,
        totalUnlocked: doc.totalUnlocked,
        requirements: doc.requirements,
        tips: doc.tips,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      }));

      let userAchievements: UserAchievement[] | undefined;
      let unlockedCount: number | undefined;

      if (userId) {
        userAchievements = await this.getUserAchievements(userId);
        unlockedCount = userAchievements.length;

        if (onlyUnlocked) {
          const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
          return {
            achievements: achievements.filter(a => unlockedIds.has(a.id)),
            userAchievements,
            totalAchievements: unlockedCount,
            unlockedCount
          };
        }
      }

      return {
        achievements,
        userAchievements,
        totalAchievements: achievements.length,
        unlockedCount
      };

    } catch (error: any) {
      logger.error('Failed to get achievements', {
        error: {
          code: 'ACHIEVEMENTS_GET_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: request
      });
      throw error;
    }
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const response = await databases.listDocuments(
        databaseId,
        this.userAchievementsCollectionId,
        [
          Query.equal('userId', userId),
          Query.orderDesc('unlockedAt')
        ]
      );

      return response.documents.map(doc => ({
        id: doc.$id,
        userId: doc.userId,
        achievementId: doc.achievementId,
        unlockedAt: new Date(doc.unlockedAt),
        progress: doc.progress,
        context: doc.context,
        isVisible: doc.isVisible,
        shareLevel: doc.shareLevel as ShareLevel
      }));

    } catch (error: any) {
      logger.error('Failed to get user achievements', {
        error: { 
          code: 'USER_ACHIEVEMENTS_GET_ERROR',
          message: error.message,
          stack: error.stack 
        },
        metadata: { userId }
      });
      throw error;
    }
  }

  async checkAchievements(userId: string, activityData: any): Promise<Achievement[]> {
    try {
      logger.info('Checking achievements for user activity', { userId });

      // Check if user can participate in achievements
      const canParticipate = await privacyManager.canUserParticipate(userId);
      if (!canParticipate) {
        return [];
      }

      const privacySettings = await privacyManager.ensureUserHasPrivacySettings(userId);
      if (!privacySettings.shareAchievements) {
        return [];
      }

      // Get all active achievements
      const allAchievements = await this.getAllActiveAchievements();
      
      // Get user's existing achievements
      const userAchievements = await this.getUserAchievements(userId);
      const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

      // Check each achievement
      const newlyUnlocked: Achievement[] = [];

      for (const achievement of allAchievements) {
        if (unlockedIds.has(achievement.id)) {
          continue; // Already unlocked
        }

        const isUnlocked = await this.evaluateUnlockCriteria(
          achievement.unlockCriteria,
          userId,
          activityData
        );

        if (isUnlocked) {
          await this.unlockAchievement(userId, achievement.id, activityData);
          newlyUnlocked.push(achievement);
        }
      }

      if (newlyUnlocked.length > 0) {
        logger.info('New achievements unlocked', {
          userId,
          count: newlyUnlocked.length,
          metadata: { achievements: newlyUnlocked.map(a => a.name) }
        });
      }

      return newlyUnlocked;

    } catch (error: any) {
      logger.error('Failed to check achievements', {
        error: {
          code: 'ACHIEVEMENT_CHECK_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId, activityData }
      });
      return [];
    }
  }

  private async evaluateUnlockCriteria(
    criteria: UnlockCriteria,
    userId: string,
    activityData: any
  ): Promise<boolean> {
    try {
      logger.debug('Evaluating unlock criteria', { userId, criteriaType: criteria.type });

      switch (criteria.type) {
        case 'carbon_efficiency':
          return this.evaluateCarbonEfficiencyCriteria(criteria, userId);
        
        case 'total_reduction':
          return this.evaluateTotalReductionCriteria(criteria, userId);
        
        case 'improvement_streak':
          return this.evaluateImprovementStreakCriteria(criteria, userId);
        
        case 'challenge_completion':
          return this.evaluateChallengeCompletionCriteria(criteria, userId);
        
        case 'community_contribution':
          return this.evaluateCommunityContributionCriteria(criteria, userId);
        
        default:
          logger.warn('Unknown criteria type', { type: criteria.type });
          return false;
      }

    } catch (error: any) {
      logger.error('Failed to evaluate unlock criteria', {
        error: { message: error.message },
        metadata: { userId, criteria }
      });
      return false;
    }
  }

  private async evaluateCarbonEfficiencyCriteria(criteria: UnlockCriteria, userId: string): Promise<boolean> {
    try {
      // Get user's carbon efficiency from leaderboard
      const leaderboardQuery = [
        Query.equal('userId', userId),
        Query.equal('category', 'carbon_efficiency')
      ];

      if (criteria.timeframe) {
        leaderboardQuery.push(Query.equal('period', criteria.timeframe));
      }

      const response = await databases.listDocuments(
        databaseId,
        this.leaderboardCollectionId,
        leaderboardQuery
      );

      if (response.documents.length === 0) {
        return false;
      }

      const efficiency = response.documents[0].carbonEfficiency;
      return this.evaluateConditions(criteria.conditions, { efficiency });

    } catch (error: any) {
      logger.error('Failed to evaluate carbon efficiency criteria', {
        error: { message: error.message },
        metadata: { userId, criteria }
      });
      return false;
    }
  }

  private async evaluateTotalReductionCriteria(criteria: UnlockCriteria, userId: string): Promise<boolean> {
    try {
      // Calculate total carbon reduction
      const activitiesResponse = await databases.listDocuments(
        databaseId,
        this.activitiesCollectionId,
        [
          Query.equal('userId', userId),
          ...(criteria.timeframe ? this.getTimeframeQuery(criteria.timeframe) : [])
        ]
      );

      const totalReduction = activitiesResponse.documents.reduce((sum, activity) => {
        // Assume positive carbon values represent savings/reductions
        return sum + Math.max(0, activity.carbonKg);
      }, 0);

      const activityCount = activitiesResponse.documents.length;

      return this.evaluateConditions(criteria.conditions, { 
        totalReduction, 
        activityCount 
      }) && (!criteria.minimumActivities || activityCount >= criteria.minimumActivities);

    } catch (error: any) {
      logger.error('Failed to evaluate total reduction criteria', {
        error: { message: error.message },
        metadata: { userId, criteria }
      });
      return false;
    }
  }

  private async evaluateImprovementStreakCriteria(criteria: UnlockCriteria, userId: string): Promise<boolean> {
    try {
      // Get user's improvement trend data
      const leaderboardResponse = await databases.listDocuments(
        databaseId,
        this.leaderboardCollectionId,
        [
          Query.equal('userId', userId),
          Query.equal('category', 'improvement'),
          Query.orderDesc('lastUpdated'),
          Query.limit(10)
        ]
      );

      if (leaderboardResponse.documents.length === 0) {
        return false;
      }

      // Calculate streak of positive improvements
      let streak = 0;
      for (const doc of leaderboardResponse.documents) {
        if (doc.improvementPercentage > 0) {
          streak++;
        } else {
          break;
        }
      }

      return this.evaluateConditions(criteria.conditions, { streak });

    } catch (error: any) {
      logger.error('Failed to evaluate improvement streak criteria', {
        error: { message: error.message },
        metadata: { userId, criteria }
      });
      return false;
    }
  }

  private async evaluateChallengeCompletionCriteria(criteria: UnlockCriteria, userId: string): Promise<boolean> {
    try {
      // Get completed challenges
      const participantsResponse = await databases.listDocuments(
        databaseId,
        'challenge_participants',
        [
          Query.equal('userId', userId),
          Query.equal('status', 'completed')
        ]
      );

      const completedChallenges = participantsResponse.documents.length;

      return this.evaluateConditions(criteria.conditions, { completedChallenges });

    } catch (error: any) {
      logger.error('Failed to evaluate challenge completion criteria', {
        error: { message: error.message },
        metadata: { userId, criteria }
      });
      return false;
    }
  }

  private async evaluateCommunityContributionCriteria(criteria: UnlockCriteria, userId: string): Promise<boolean> {
    try {
      // This would evaluate community contributions like:
      // - Knowledge sharing posts
      // - Mentorship activities
      // - Team formations
      // For now, return false as these features aren't implemented yet
      return false;

    } catch (error: any) {
      logger.error('Failed to evaluate community contribution criteria', {
        error: { message: error.message },
        metadata: { userId, criteria }
      });
      return false;
    }
  }

  private evaluateConditions(conditions: CriteriaCondition[], data: any): boolean {
    return conditions.every(condition => {
      const value = data[condition.field];
      if (value === undefined) return false;

      switch (condition.operator) {
        case 'gt':
          return value > condition.value;
        case 'gte':
          return value >= condition.value;
        case 'lt':
          return value < condition.value;
        case 'lte':
          return value <= condition.value;
        case 'eq':
          return value === condition.value;
        case 'neq':
          return value !== condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value);
        case 'between':
          return Array.isArray(condition.value) && 
                 condition.value.length === 2 && 
                 value >= condition.value[0] && 
                 value <= condition.value[1];
        default:
          return false;
      }
    });
  }

  private async unlockAchievement(userId: string, achievementId: string, context?: any): Promise<void> {
    try {
      const now = new Date();

      // Create user achievement record
      await databases.createDocument(
        databaseId,
        this.userAchievementsCollectionId,
        ID.unique(),
        {
          userId,
          achievementId,
          unlockedAt: now.toISOString(),
          context: context ? JSON.stringify(context) : undefined,
          isVisible: true,
          shareLevel: 'public'
        }
      );

      // Update achievement total unlocked count
      const achievement = await databases.getDocument(
        databaseId,
        this.achievementsCollectionId,
        achievementId
      );

      await databases.updateDocument(
        databaseId,
        this.achievementsCollectionId,
        achievementId,
        {
          totalUnlocked: achievement.totalUnlocked + 1,
          updatedAt: now.toISOString()
        }
      );

      // Invalidate caches
      await this.invalidateCache();

      logger.info('Achievement unlocked', { userId, achievementId });

      // TODO: Trigger notification
      // TODO: Send WebSocket event
      // TODO: Update user points

    } catch (error: any) {
      logger.error('Failed to unlock achievement', {
        error: { message: error.message },
        metadata: { userId, achievementId, context }
      });
      throw error;
    }
  }

  private async getAllActiveAchievements(): Promise<Achievement[]> {
    try {
      const cacheKey = `${this.cacheKeyPrefix}all_active`;
      let achievements = await cacheService.get<Achievement[]>(cacheKey);

      if (!achievements) {
        const response = await databases.listDocuments(
          databaseId,
          this.achievementsCollectionId,
          [Query.equal('isActive', true)]
        );

        achievements = response.documents.map(doc => ({
          id: doc.$id,
          name: doc.name,
          description: doc.description,
          icon: doc.icon,
          category: doc.category as AchievementCategory,
          rarity: doc.rarity as AchievementRarity,
          unlockCriteria: JSON.parse(doc.unlockCriteria),
          points: doc.points,
          isActive: doc.isActive,
          totalUnlocked: doc.totalUnlocked,
          requirements: doc.requirements,
          tips: doc.tips,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt)
        }));

        await cacheService.set(cacheKey, achievements, this.cacheTTL);
      }

      return achievements;

    } catch (error: any) {
      logger.error('Failed to get all active achievements', {
        error: { message: error.message }
      });
      return [];
    }
  }

  private getTimeframeQuery(timeframe: string): any[] {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarterly':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return [];
    }

    return [Query.greaterThanEqual('timestamp', startDate.toISOString())];
  }

  async getUserAchievementProgress(userId: string, achievementId: string): Promise<number> {
    try {
      // This would calculate current progress towards an achievement
      // For now, return 0 as this requires complex logic based on criteria type
      return 0;

    } catch (error: any) {
      logger.error('Failed to get user achievement progress', {
        error: { message: error.message },
        metadata: { userId, achievementId }
      });
      return 0;
    }
  }

  async createAchievement(achievement: Omit<Achievement, 'id' | 'totalUnlocked' | 'createdAt' | 'updatedAt'>): Promise<Achievement> {
    try {
      const now = new Date();

      const doc = await databases.createDocument(
        databaseId,
        this.achievementsCollectionId,
        ID.unique(),
        {
          ...achievement,
          unlockCriteria: JSON.stringify(achievement.unlockCriteria),
          totalUnlocked: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      );

      const newAchievement: Achievement = {
        id: doc.$id,
        name: doc.name,
        description: doc.description,
        icon: doc.icon,
        category: doc.category as AchievementCategory,
        rarity: doc.rarity as AchievementRarity,
        unlockCriteria: JSON.parse(doc.unlockCriteria),
        points: doc.points,
        isActive: doc.isActive,
        totalUnlocked: doc.totalUnlocked,
        requirements: doc.requirements,
        tips: doc.tips,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      };

      await this.invalidateCache();

      return newAchievement;

    } catch (error: any) {
      logger.error('Failed to create achievement', {
        error: { message: error.message },
        metadata: achievement
      });
      throw error;
    }
  }

  private async invalidateCache(): Promise<void> {
    try {
      await cacheService.deletePattern(`${this.cacheKeyPrefix}*`);
    } catch (error: any) {
      logger.warn('Failed to invalidate achievement cache', {
        error: { message: error.message }
      });
    }
  }

  async getAchievementCategories(): Promise<AchievementCategory[]> {
    return ['efficiency', 'improvement', 'community', 'challenge', 'milestone', 'innovation'];
  }

  async getAchievementRarities(): Promise<AchievementRarity[]> {
    return ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  }
}

export const achievementEngine = new AchievementEngine();