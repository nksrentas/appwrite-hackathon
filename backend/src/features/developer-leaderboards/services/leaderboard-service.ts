import { Databases, Query } from 'node-appwrite';
import { client } from '@shared/config/appwrite';
import { logger } from '@shared/utils/logger';
import { cacheService } from '@shared/utils/cache';
import { 
  LeaderboardEntry, 
  LeaderboardRequest, 
  LeaderboardResponse, 
  LeaderboardCalculationOptions,
  LeaderboardCategory,
  TimePeriod,
  PrivacyLevel 
} from '../types';
import { privacyManager } from './privacy-manager';

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace';

export class LeaderboardService {
  private readonly collectionId = 'developer_leaderboard';
  private readonly activitiesCollectionId = 'activities';
  private readonly cacheKeyPrefix = 'leaderboard:';
  private readonly cacheTTL = 300; // 5 minutes

  async getLeaderboard(request: LeaderboardRequest): Promise<LeaderboardResponse> {
    try {
      const {
        category = 'carbon_efficiency',
        period = 'weekly',
        limit = 50,
        offset = 0,
        userId,
        contextGroup
      } = request;

      logger.info('Getting leaderboard', { category, period, limit, offset, userId });

      const cacheKey = `${this.cacheKeyPrefix}${category}:${period}:${limit}:${offset}:${contextGroup || 'all'}`;
      
      // Try to get from cache first
      let leaderboardData = await cacheService.get<LeaderboardResponse>(cacheKey);
      
      if (!leaderboardData) {
        // Calculate fresh leaderboard
        leaderboardData = await this.calculateLeaderboard({
          category,
          period,
          contextAware: true,
          privacyFiltering: true
        }, limit, offset, contextGroup);

        // Cache the result
        await cacheService.set(cacheKey, leaderboardData, this.cacheTTL);
      }

      // If userId is provided, get their position
      if (userId) {
        const userPosition = await this.getUserPosition(userId, category, period, contextGroup);
        leaderboardData.userPosition = userPosition;
      }

      return leaderboardData;

    } catch (error: any) {
      logger.error('Failed to get leaderboard', {
        error: {
          code: 'LEADERBOARD_GET_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: request
      });
      throw error;
    }
  }

  private async calculateLeaderboard(
    options: LeaderboardCalculationOptions,
    limit: number = 50,
    offset: number = 0,
    contextGroup?: string
  ): Promise<LeaderboardResponse> {
    try {
      const { category, period, contextAware, privacyFiltering } = options;

      logger.info('Calculating leaderboard', { 
        metadata: { options, limit, offset }
      });

      // Build queries based on filters
      const queries = [
        Query.equal('category', category),
        Query.equal('period', period),
        Query.orderAsc('rank'),
        Query.limit(limit),
        Query.offset(offset)
      ];

      if (contextGroup && contextAware) {
        queries.push(Query.equal('contextGroup', contextGroup));
      }

      if (privacyFiltering) {
        // Only include users who allow leaderboard participation
        queries.push(Query.notEqual('privacyLevel', 'none'));
      }

      const response = await databases.listDocuments(
        databaseId,
        this.collectionId,
        queries
      );

      // Process entries with privacy filtering
      const entries: LeaderboardEntry[] = response.documents.map(doc => {
        const entry: LeaderboardEntry = {
          userId: doc.userId,
          username: doc.username,
          displayName: doc.displayName,
          category: doc.category as LeaderboardCategory,
          period: doc.period as TimePeriod,
          carbonEfficiency: doc.carbonEfficiency,
          improvementPercentage: doc.improvementPercentage,
          rank: doc.rank,
          privacyLevel: doc.privacyLevel as PrivacyLevel,
          totalCommits: doc.totalCommits,
          totalBuilds: doc.totalBuilds,
          totalDeployments: doc.totalDeployments,
          contextGroup: doc.contextGroup,
          lastUpdated: new Date(doc.lastUpdated),
          createdAt: new Date(doc.createdAt)
        };

        // Apply privacy anonymization
        return privacyManager.anonymizeLeaderboardEntry(entry, entry.privacyLevel);
      });

      // Get total count for pagination
      const totalResponse = await databases.listDocuments(
        databaseId,
        this.collectionId,
        [
          Query.equal('category', category),
          Query.equal('period', period),
          ...(contextGroup && contextAware ? [Query.equal('contextGroup', contextGroup)] : []),
          ...(privacyFiltering ? [Query.notEqual('privacyLevel', 'none')] : [])
        ]
      );

      return {
        entries,
        totalEntries: totalResponse.total,
        period,
        category,
        lastUpdated: new Date()
      };

    } catch (error: any) {
      logger.error('Failed to calculate leaderboard', {
        error: { 
          code: 'LEADERBOARD_CALCULATION_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: options
      });
      throw error;
    }
  }

  private async getUserPosition(
    userId: string, 
    category: LeaderboardCategory, 
    period: TimePeriod,
    contextGroup?: string
  ): Promise<{ entry: LeaderboardEntry; rank: number } | undefined> {
    try {
      const queries = [
        Query.equal('userId', userId),
        Query.equal('category', category),
        Query.equal('period', period)
      ];

      if (contextGroup) {
        queries.push(Query.equal('contextGroup', contextGroup));
      }

      const response = await databases.listDocuments(
        databaseId,
        this.collectionId,
        queries
      );

      if (response.documents.length === 0) {
        return undefined;
      }

      const doc = response.documents[0];
      const entry: LeaderboardEntry = {
        userId: doc.userId,
        username: doc.username,
        displayName: doc.displayName,
        category: doc.category as LeaderboardCategory,
        period: doc.period as TimePeriod,
        carbonEfficiency: doc.carbonEfficiency,
        improvementPercentage: doc.improvementPercentage,
        rank: doc.rank,
        privacyLevel: doc.privacyLevel as PrivacyLevel,
        totalCommits: doc.totalCommits,
        totalBuilds: doc.totalBuilds,
        totalDeployments: doc.totalDeployments,
        contextGroup: doc.contextGroup,
        lastUpdated: new Date(doc.lastUpdated),
        createdAt: new Date(doc.createdAt)
      };

      return {
        entry: privacyManager.anonymizeLeaderboardEntry(entry, entry.privacyLevel),
        rank: doc.rank
      };

    } catch (error: any) {
      logger.error('Failed to get user position', {
        error: { 
          code: 'USER_POSITION_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId, category, period, contextGroup }
      });
      return undefined;
    }
  }

  async updateUserLeaderboardEntry(
    userId: string,
    category: LeaderboardCategory,
    period: TimePeriod,
    data: Partial<LeaderboardEntry>
  ): Promise<void> {
    try {
      logger.info('Updating user leaderboard entry', { userId, category, period });

      // Check if user can participate in leaderboards
      const canParticipate = await privacyManager.canUserParticipate(userId);
      if (!canParticipate) {
        logger.info('User cannot participate in leaderboards', { userId });
        return;
      }

      // Get user's privacy settings
      const privacySettings = await privacyManager.ensureUserHasPrivacySettings(userId);

      // Find or create leaderboard entry
      const queries = [
        Query.equal('userId', userId),
        Query.equal('category', category),
        Query.equal('period', period)
      ];

      if (data.contextGroup) {
        queries.push(Query.equal('contextGroup', data.contextGroup));
      }

      const response = await databases.listDocuments(
        databaseId,
        this.collectionId,
        queries
      );

      const now = new Date();
      const entryData = {
        userId,
        category,
        period,
        privacyLevel: privacySettings.participationLevel,
        lastUpdated: now.toISOString(),
        ...data
      };

      if (response.documents.length === 0) {
        // Create new entry
        await databases.createDocument(
          databaseId,
          this.collectionId,
          'unique()',
          {
            ...entryData,
            createdAt: now.toISOString()
          }
        );
      } else {
        // Update existing entry
        const docId = response.documents[0].$id;
        await databases.updateDocument(
          databaseId,
          this.collectionId,
          docId,
          entryData
        );
      }

      // Invalidate related caches
      await this.invalidateCache(category, period);

      // Trigger ranking recalculation if needed
      await this.scheduleRankingUpdate(category, period);

    } catch (error: any) {
      logger.error('Failed to update user leaderboard entry', {
        error: {
          code: 'LEADERBOARD_UPDATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId, category, period, data }
      });
      throw error;
    }
  }

  async recalculateRankings(category: LeaderboardCategory, period: TimePeriod): Promise<void> {
    try {
      logger.info('Recalculating rankings', { category, period });

      // Get all entries for the category and period
      const response = await databases.listDocuments(
        databaseId,
        this.collectionId,
        [
          Query.equal('category', category),
          Query.equal('period', period),
          Query.orderDesc('carbonEfficiency'), // Better efficiency = higher rank
          Query.limit(1000) // Process in batches if needed
        ]
      );

      // Update rankings
      const updatePromises = response.documents.map(async (doc, index) => {
        const newRank = index + 1;
        if (doc.rank !== newRank) {
          await databases.updateDocument(
            databaseId,
            this.collectionId,
            doc.$id,
            { 
              rank: newRank,
              lastUpdated: new Date().toISOString()
            }
          );
        }
      });

      await Promise.all(updatePromises);

      // Invalidate caches
      await this.invalidateCache(category, period);

      logger.info('Rankings recalculated successfully', { 
        metadata: { 
          category, 
          period, 
          entriesProcessed: response.documents.length 
        }
      });

    } catch (error: any) {
      logger.error('Failed to recalculate rankings', {
        error: {
          code: 'RANKING_RECALC_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { category, period }
      });
      throw error;
    }
  }

  async calculateUserCarbonEfficiency(userId: string, period: TimePeriod): Promise<number> {
    try {
      // Calculate carbon efficiency based on activities
      const periodQuery = this.getPeriodQuery(period);
      
      const activitiesResponse = await databases.listDocuments(
        databaseId,
        this.activitiesCollectionId,
        [
          Query.equal('userId', userId),
          ...periodQuery,
          Query.limit(1000)
        ]
      );

      const activities = activitiesResponse.documents;
      
      if (activities.length === 0) {
        return 0;
      }

      // Calculate total carbon and total activities
      const totalCarbon = activities.reduce((sum, activity) => sum + activity.carbonKg, 0);
      const totalActivities = activities.length;

      // Carbon efficiency = kg CO2e per activity (lower is better)
      const efficiency = totalCarbon / totalActivities;

      logger.info('Calculated user carbon efficiency', {
        userId,
        period,
        totalCarbonKg: totalCarbon,
        totalActivities,
        metadata: { efficiency }
      });

      return efficiency;

    } catch (error: any) {
      logger.error('Failed to calculate user carbon efficiency', {
        error: { 
          code: 'CARBON_EFFICIENCY_CALCULATION_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId, period }
      });
      return 0;
    }
  }

  private getPeriodQuery(period: TimePeriod): any[] {
    const now = new Date();
    let startDate: Date;

    switch (period) {
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
      case 'all_time':
      default:
        return [];
    }

    return [Query.greaterThanEqual('timestamp', startDate.toISOString())];
  }

  private async invalidateCache(category: LeaderboardCategory, period: TimePeriod): Promise<void> {
    try {
      // Invalidate all related cache entries
      const patterns = [
        `${this.cacheKeyPrefix}${category}:${period}:*`,
        `${this.cacheKeyPrefix}${category}:*`,
        `${this.cacheKeyPrefix}*:${period}:*`
      ];

      for (const pattern of patterns) {
        await cacheService.deletePattern(pattern);
      }

    } catch (error: any) {
      logger.warn('Failed to invalidate cache', {
        error: { 
          code: 'CACHE_INVALIDATION_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { category, period }
      });
      // Don't throw error as cache invalidation is not critical
    }
  }

  private async scheduleRankingUpdate(category: LeaderboardCategory, period: TimePeriod): Promise<void> {
    try {
      // In a production system, this would queue a background job
      // For now, we'll do it immediately but could be optimized
      setTimeout(() => {
        this.recalculateRankings(category, period).catch(error => {
          logger.error('Scheduled ranking update failed', {
            error: { 
              code: 'SCHEDULED_RANKING_UPDATE_ERROR',
              message: error.message,
              stack: error.stack
            },
            metadata: { category, period }
          });
        });
      }, 1000);

    } catch (error: any) {
      logger.warn('Failed to schedule ranking update', {
        error: { 
          code: 'RANKING_SCHEDULE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { category, period }
      });
    }
  }

  async getLeaderboardCategories(): Promise<LeaderboardCategory[]> {
    return ['carbon_efficiency', 'improvement', 'total_reduction', 'consistency'];
  }

  async getAvailablePeriods(): Promise<TimePeriod[]> {
    return ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all_time'];
  }

  async getUserLeaderboardStats(userId: string): Promise<any> {
    try {
      const response = await databases.listDocuments(
        databaseId,
        this.collectionId,
        [Query.equal('userId', userId)]
      );

      const entries = response.documents;
      
      const stats = {
        totalEntries: entries.length,
        bestRank: entries.length > 0 ? Math.min(...entries.map(e => e.rank)) : null,
        averageEfficiency: entries.length > 0 
          ? entries.reduce((sum, e) => sum + e.carbonEfficiency, 0) / entries.length 
          : 0,
        categories: entries.map(e => ({
          category: e.category,
          period: e.period,
          rank: e.rank,
          efficiency: e.carbonEfficiency,
          improvement: e.improvementPercentage
        }))
      };

      return stats;

    } catch (error: any) {
      logger.error('Failed to get user leaderboard stats', {
        error: { 
          code: 'USER_STATS_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId }
      });
      throw error;
    }
  }
}

export const leaderboardService = new LeaderboardService();