import { Databases, Query } from 'node-appwrite';
import { client } from '@shared/config/appwrite';
import { logger } from '@shared/utils/logger';
import { PrivacySettings, PrivacyLevel, PrivacyUpdateRequest, LeaderboardEntry } from '../types';

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace';

export class PrivacyManager {
  private readonly collectionId = 'privacy_settings';

  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    try {
      logger.info('Retrieving privacy settings', { userId });

      const response = await databases.listDocuments(
        databaseId,
        this.collectionId,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length === 0) {
        return null;
      }

      const doc = response.documents[0];
      return {
        userId: doc.userId,
        participationLevel: doc.participationLevel as PrivacyLevel,
        shareCarbonEfficiency: doc.shareCarbonEfficiency,
        shareImprovementTrends: doc.shareImprovementTrends,
        shareAchievements: doc.shareAchievements,
        shareChallengeParticipation: doc.shareChallengeParticipation,
        teamVisibility: doc.teamVisibility,
        allowMentorship: doc.allowMentorship,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      };

    } catch (error: any) {
      logger.error('Failed to get privacy settings', {
        error: {
          code: 'PRIVACY_GET_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId }
      });
      throw error;
    }
  }

  async createDefaultPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      logger.info('Creating default privacy settings', { userId });

      const now = new Date();
      const defaultSettings: Omit<PrivacySettings, 'createdAt' | 'updatedAt'> = {
        userId,
        participationLevel: 'none', // Default to not participating
        shareCarbonEfficiency: false,
        shareImprovementTrends: false,
        shareAchievements: false,
        shareChallengeParticipation: false,
        teamVisibility: false,
        allowMentorship: false
      };

      const doc = await databases.createDocument(
        databaseId,
        this.collectionId,
        'unique()',
        {
          ...defaultSettings,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      );

      return {
        ...defaultSettings,
        createdAt: now,
        updatedAt: now
      };

    } catch (error: any) {
      logger.error('Failed to create default privacy settings', {
        error: {
          code: 'PRIVACY_CREATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId }
      });
      throw error;
    }
  }

  async updatePrivacySettings(userId: string, updates: PrivacyUpdateRequest): Promise<PrivacySettings> {
    try {
      logger.info('Updating privacy settings', { userId, updates });

      // Get existing settings or create defaults
      let existingSettings = await this.getPrivacySettings(userId);
      if (!existingSettings) {
        existingSettings = await this.createDefaultPrivacySettings(userId);
      }

      const updatedSettings: Partial<PrivacySettings> = {
        updatedAt: new Date()
      };

      // Update participation level
      if (updates.participationLevel !== undefined) {
        updatedSettings.participationLevel = updates.participationLevel;
      }

      // Update sharing preferences
      if (updates.shareMetrics) {
        if (updates.shareMetrics.carbonEfficiency !== undefined) {
          updatedSettings.shareCarbonEfficiency = updates.shareMetrics.carbonEfficiency;
        }
        if (updates.shareMetrics.improvementTrends !== undefined) {
          updatedSettings.shareImprovementTrends = updates.shareMetrics.improvementTrends;
        }
        if (updates.shareMetrics.achievements !== undefined) {
          updatedSettings.shareAchievements = updates.shareMetrics.achievements;
        }
        if (updates.shareMetrics.challengeParticipation !== undefined) {
          updatedSettings.shareChallengeParticipation = updates.shareMetrics.challengeParticipation;
        }
      }

      if (updates.teamVisibility !== undefined) {
        updatedSettings.teamVisibility = updates.teamVisibility;
      }

      if (updates.allowMentorship !== undefined) {
        updatedSettings.allowMentorship = updates.allowMentorship;
      }

      // Find and update the document
      const response = await databases.listDocuments(
        databaseId,
        this.collectionId,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length === 0) {
        throw new Error('Privacy settings not found');
      }

      const docId = response.documents[0].$id;
      const doc = await databases.updateDocument(
        databaseId,
        this.collectionId,
        docId,
        {
          ...updatedSettings,
          updatedAt: updatedSettings.updatedAt!.toISOString()
        }
      );

      // Update leaderboard visibility if participation level changed
      if (updates.participationLevel !== undefined) {
        await this.updateLeaderboardVisibility(userId, updates.participationLevel);
      }

      const result = {
        ...existingSettings,
        ...updatedSettings
      } as PrivacySettings;

      logger.info('Privacy settings updated successfully', {
        userId,
        participationLevel: result.participationLevel
      });

      return result;

    } catch (error: any) {
      logger.error('Failed to update privacy settings', {
        error: {
          code: 'PRIVACY_UPDATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId, updates }
      });
      throw error;
    }
  }

  async updateLeaderboardVisibility(userId: string, participationLevel: PrivacySettings['participationLevel']): Promise<void> {
    try {
      logger.info('Updating leaderboard visibility', { userId, participationLevel });

      if (participationLevel === 'none') {
        // Remove user from all leaderboards
        await this.removeUserFromLeaderboards(userId);
      } else {
        // Update privacy level in leaderboard entries
        await this.updateUserLeaderboardPrivacy(userId, participationLevel);
      }

    } catch (error: any) {
      logger.error('Failed to update leaderboard visibility', {
        error: {
          code: 'LEADERBOARD_VISIBILITY_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId, participationLevel }
      });
      throw error;
    }
  }

  private async removeUserFromLeaderboards(userId: string): Promise<void> {
    try {
      const response = await databases.listDocuments(
        databaseId,
        'developer_leaderboard',
        [Query.equal('userId', userId)]
      );

      for (const doc of response.documents) {
        await databases.deleteDocument(databaseId, 'developer_leaderboard', doc.$id);
      }

      logger.info('User removed from leaderboards', { userId });

    } catch (error: any) {
      logger.error('Failed to remove user from leaderboards', {
        error: { message: error.message },
        metadata: { userId }
      });
      throw error;
    }
  }

  private async updateUserLeaderboardPrivacy(userId: string, privacyLevel: PrivacySettings['participationLevel']): Promise<void> {
    try {
      const response = await databases.listDocuments(
        databaseId,
        'developer_leaderboard',
        [Query.equal('userId', userId)]
      );

      for (const doc of response.documents) {
        await databases.updateDocument(
          databaseId,
          'developer_leaderboard',
          doc.$id,
          { privacyLevel }
        );
      }

      logger.info('User leaderboard privacy updated', { userId, privacyLevel });

    } catch (error: any) {
      logger.error('Failed to update user leaderboard privacy', {
        error: { message: error.message },
        metadata: { userId, privacyLevel }
      });
      throw error;
    }
  }

  anonymizeLeaderboardEntry(entry: LeaderboardEntry, privacyLevel: PrivacyLevel): LeaderboardEntry {
    switch (privacyLevel) {
      case 'anonymous':
        return {
          ...entry,
          userId: this.generateAnonymousId(entry.userId),
          username: `Developer #${entry.rank}`,
          displayName: undefined
        };
      case 'username':
        return {
          ...entry,
          userId: this.generateAnonymousId(entry.userId),
          displayName: undefined
        };
      case 'full':
      default:
        return entry;
    }
  }

  private generateAnonymousId(userId: string): string {
    // Generate a consistent anonymous ID based on user ID hash
    const hash = this.simpleHash(userId);
    return `anon_${hash.toString(36).substring(0, 8)}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async canUserParticipate(userId: string): Promise<boolean> {
    try {
      const settings = await this.getPrivacySettings(userId);
      return settings ? settings.participationLevel !== 'none' : false;
    } catch (error: any) {
      logger.warn('Error checking user participation eligibility', {
        error: { message: error.message },
        metadata: { userId }
      });
      return false;
    }
  }

  async getUsersWithPrivacyLevel(privacyLevel: PrivacyLevel): Promise<string[]> {
    try {
      const response = await databases.listDocuments(
        databaseId,
        this.collectionId,
        [Query.equal('participationLevel', privacyLevel)]
      );

      return response.documents.map(doc => doc.userId);

    } catch (error: any) {
      logger.error('Failed to get users with privacy level', {
        error: { message: error.message },
        metadata: { privacyLevel }
      });
      throw error;
    }
  }

  async notifyPrivacyChange(userId: string): Promise<void> {
    try {
      // This would integrate with the notification system
      // For now, just log the change
      logger.info('Privacy settings changed', { userId });
      
      // TODO: Send WebSocket notification about privacy change
      // TODO: Update cached leaderboard data
      // TODO: Notify team members if team visibility changed
      
    } catch (error: any) {
      logger.error('Failed to notify privacy change', {
        error: { message: error.message },
        metadata: { userId }
      });
      // Don't throw error as this is not critical
    }
  }

  async ensureUserHasPrivacySettings(userId: string): Promise<PrivacySettings> {
    let settings = await this.getPrivacySettings(userId);
    if (!settings) {
      settings = await this.createDefaultPrivacySettings(userId);
    }
    return settings;
  }

  async exportUserPrivacyData(userId: string): Promise<any> {
    try {
      const settings = await this.getPrivacySettings(userId);
      if (!settings) {
        return null;
      }

      return {
        privacySettings: settings,
        exportedAt: new Date().toISOString(),
        dataRetentionPolicy: 'Data will be retained according to EcoTrace privacy policy'
      };

    } catch (error: any) {
      logger.error('Failed to export user privacy data', {
        error: { message: error.message },
        metadata: { userId }
      });
      throw error;
    }
  }

  async deleteUserPrivacyData(userId: string): Promise<void> {
    try {
      logger.info('Deleting user privacy data', { userId });

      // Remove privacy settings
      const response = await databases.listDocuments(
        databaseId,
        this.collectionId,
        [Query.equal('userId', userId)]
      );

      for (const doc of response.documents) {
        await databases.deleteDocument(databaseId, this.collectionId, doc.$id);
      }

      // Remove from leaderboards
      await this.removeUserFromLeaderboards(userId);

      logger.info('User privacy data deleted successfully', { userId });

    } catch (error: any) {
      logger.error('Failed to delete user privacy data', {
        error: {
          code: 'PRIVACY_DELETE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { userId }
      });
      throw error;
    }
  }
}

export const privacyManager = new PrivacyManager();