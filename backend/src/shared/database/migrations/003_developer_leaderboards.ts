import { Client, Databases, ID } from 'node-appwrite';
import { logger } from '@shared/utils/logger';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace';

const migration = {
  id: '003_developer_leaderboards',
  name: 'Developer Leaderboards Schema',
  version: '1.0.0',
  description: 'Creates database schema for developer leaderboards, challenges, and achievements',

  async up(): Promise<void> {
    logger.info('Creating developer leaderboards database schema');

    try {
      // Privacy Settings Collection
      await databases.createCollection(
        databaseId,
        'privacy_settings',
        'Privacy Settings',
        ['read("users")', 'write("users")'],
        true
      );

      await databases.createStringAttribute(databaseId, 'privacy_settings', 'userId', 50, true);
      await databases.createStringAttribute(databaseId, 'privacy_settings', 'participationLevel', 20, true);
      await databases.createBooleanAttribute(databaseId, 'privacy_settings', 'shareCarbonEfficiency', true, false);
      await databases.createBooleanAttribute(databaseId, 'privacy_settings', 'shareImprovementTrends', true, false);
      await databases.createBooleanAttribute(databaseId, 'privacy_settings', 'shareAchievements', true, false);
      await databases.createBooleanAttribute(databaseId, 'privacy_settings', 'shareChallengeParticipation', true, false);
      await databases.createBooleanAttribute(databaseId, 'privacy_settings', 'teamVisibility', true, false);
      await databases.createBooleanAttribute(databaseId, 'privacy_settings', 'allowMentorship', true, false);
      await databases.createDatetimeAttribute(databaseId, 'privacy_settings', 'createdAt', true);
      await databases.createDatetimeAttribute(databaseId, 'privacy_settings', 'updatedAt', true);

      await databases.createIndex(databaseId, 'privacy_settings', 'user_index', 'unique' as any, ['userId']);
      await databases.createIndex(databaseId, 'privacy_settings', 'participation_index', 'key' as any, ['participationLevel']);

      logger.info('Privacy settings collection created');

      // Developer Leaderboard Collection (enhanced from existing basic leaderboard)
      await databases.createCollection(
        databaseId,
        'developer_leaderboard',
        'Developer Leaderboard',
        ['read("any")', 'write("administrators")'],
        false
      );

      await databases.createStringAttribute(databaseId, 'developer_leaderboard', 'userId', 50, true);
      await databases.createStringAttribute(databaseId, 'developer_leaderboard', 'username', 100, false);
      await databases.createStringAttribute(databaseId, 'developer_leaderboard', 'displayName', 100, false);
      await databases.createStringAttribute(databaseId, 'developer_leaderboard', 'category', 50, true);
      await databases.createStringAttribute(databaseId, 'developer_leaderboard', 'period', 20, true);
      await databases.createFloatAttribute(databaseId, 'developer_leaderboard', 'carbonEfficiency', true);
      await databases.createFloatAttribute(databaseId, 'developer_leaderboard', 'improvementPercentage', false);
      await databases.createIntegerAttribute(databaseId, 'developer_leaderboard', 'rank', true);
      await databases.createStringAttribute(databaseId, 'developer_leaderboard', 'privacyLevel', 20, true);
      await databases.createIntegerAttribute(databaseId, 'developer_leaderboard', 'totalCommits', false);
      await databases.createIntegerAttribute(databaseId, 'developer_leaderboard', 'totalBuilds', false);
      await databases.createIntegerAttribute(databaseId, 'developer_leaderboard', 'totalDeployments', false);
      await databases.createStringAttribute(databaseId, 'developer_leaderboard', 'contextGroup', 100, false);
      await databases.createDatetimeAttribute(databaseId, 'developer_leaderboard', 'lastUpdated', true);
      await databases.createDatetimeAttribute(databaseId, 'developer_leaderboard', 'createdAt', true);

      await databases.createIndex(databaseId, 'developer_leaderboard', 'category_period_rank_index', 'key' as any, ['category', 'period', 'rank']);
      await databases.createIndex(databaseId, 'developer_leaderboard', 'user_category_period_index', 'unique' as any, ['userId', 'category', 'period']);
      await databases.createIndex(databaseId, 'developer_leaderboard', 'efficiency_index', 'key' as any, ['carbonEfficiency']);
      await databases.createIndex(databaseId, 'developer_leaderboard', 'improvement_index', 'key' as any, ['improvementPercentage']);
      await databases.createIndex(databaseId, 'developer_leaderboard', 'context_group_index', 'key' as any, ['contextGroup']);

      logger.info('Developer leaderboard collection created');

      // Challenges Collection
      await databases.createCollection(
        databaseId,
        'challenges',
        'Challenges',
        ['read("any")', 'write("users")'],
        false
      );

      await databases.createStringAttribute(databaseId, 'challenges', 'title', 200, true);
      await databases.createStringAttribute(databaseId, 'challenges', 'description', 2000, true);
      await databases.createStringAttribute(databaseId, 'challenges', 'type', 50, true);
      await databases.createStringAttribute(databaseId, 'challenges', 'category', 50, true);
      await databases.createStringAttribute(databaseId, 'challenges', 'difficulty', 20, true);
      await databases.createStringAttribute(databaseId, 'challenges', 'goalType', 50, true);
      await databases.createFloatAttribute(databaseId, 'challenges', 'targetValue', true);
      await databases.createStringAttribute(databaseId, 'challenges', 'targetUnit', 50, true);
      await databases.createDatetimeAttribute(databaseId, 'challenges', 'startDate', true);
      await databases.createDatetimeAttribute(databaseId, 'challenges', 'endDate', true);
      await databases.createStringAttribute(databaseId, 'challenges', 'status', 20, true);
      await databases.createStringAttribute(databaseId, 'challenges', 'createdBy', 50, true);
      await databases.createIntegerAttribute(databaseId, 'challenges', 'maxParticipants', false);
      await databases.createIntegerAttribute(databaseId, 'challenges', 'currentParticipants', true, 0);
      await databases.createStringAttribute(databaseId, 'challenges', 'rules', 5000, false);
      await databases.createStringAttribute(databaseId, 'challenges', 'rewards', 2000, false);
      await databases.createStringAttribute(databaseId, 'challenges', 'tags', 500, false);
      await databases.createDatetimeAttribute(databaseId, 'challenges', 'createdAt', true);
      await databases.createDatetimeAttribute(databaseId, 'challenges', 'updatedAt', true);

      await databases.createIndex(databaseId, 'challenges', 'status_index', 'key' as any, ['status']);
      await databases.createIndex(databaseId, 'challenges', 'type_category_index', 'key' as any, ['type', 'category']);
      await databases.createIndex(databaseId, 'challenges', 'start_end_date_index', 'key' as any, ['startDate', 'endDate']);
      await databases.createIndex(databaseId, 'challenges', 'created_by_index', 'key' as any, ['createdBy']);
      await databases.createIndex(databaseId, 'challenges', 'difficulty_index', 'key' as any, ['difficulty']);

      logger.info('Challenges collection created');

      // Challenge Participants Collection
      await databases.createCollection(
        databaseId,
        'challenge_participants',
        'Challenge Participants',
        ['read("users")', 'write("users")'],
        true
      );

      await databases.createStringAttribute(databaseId, 'challenge_participants', 'challengeId', 50, true);
      await databases.createStringAttribute(databaseId, 'challenge_participants', 'userId', 50, true);
      await databases.createDatetimeAttribute(databaseId, 'challenge_participants', 'joinedAt', true);
      await databases.createStringAttribute(databaseId, 'challenge_participants', 'status', 20, true);
      await databases.createFloatAttribute(databaseId, 'challenge_participants', 'currentProgress', true, 0);
      await databases.createFloatAttribute(databaseId, 'challenge_participants', 'bestProgress', false);
      await databases.createDatetimeAttribute(databaseId, 'challenge_participants', 'lastActivityAt', false);
      await databases.createStringAttribute(databaseId, 'challenge_participants', 'teamId', 50, false);
      await databases.createStringAttribute(databaseId, 'challenge_participants', 'notes', 1000, false);
      await databases.createDatetimeAttribute(databaseId, 'challenge_participants', 'updatedAt', true);

      await databases.createIndex(databaseId, 'challenge_participants', 'challenge_user_index', 'unique' as any, ['challengeId', 'userId']);
      await databases.createIndex(databaseId, 'challenge_participants', 'user_status_index', 'key' as any, ['userId', 'status']);
      await databases.createIndex(databaseId, 'challenge_participants', 'challenge_progress_index', 'key' as any, ['challengeId', 'currentProgress']);
      await databases.createIndex(databaseId, 'challenge_participants', 'team_index', 'key' as any, ['teamId']);

      logger.info('Challenge participants collection created');

      // Achievements Collection
      await databases.createCollection(
        databaseId,
        'achievements',
        'Achievements',
        ['read("any")', 'write("administrators")'],
        false
      );

      await databases.createStringAttribute(databaseId, 'achievements', 'name', 200, true);
      await databases.createStringAttribute(databaseId, 'achievements', 'description', 1000, true);
      await databases.createStringAttribute(databaseId, 'achievements', 'icon', 100, true);
      await databases.createStringAttribute(databaseId, 'achievements', 'category', 50, true);
      await databases.createStringAttribute(databaseId, 'achievements', 'rarity', 20, true);
      await databases.createStringAttribute(databaseId, 'achievements', 'unlockCriteria', 5000, true);
      await databases.createIntegerAttribute(databaseId, 'achievements', 'points', true);
      await databases.createBooleanAttribute(databaseId, 'achievements', 'isActive', true, true);
      await databases.createIntegerAttribute(databaseId, 'achievements', 'totalUnlocked', true, 0);
      await databases.createStringAttribute(databaseId, 'achievements', 'requirements', 2000, false);
      await databases.createStringAttribute(databaseId, 'achievements', 'tips', 1000, false);
      await databases.createDatetimeAttribute(databaseId, 'achievements', 'createdAt', true);
      await databases.createDatetimeAttribute(databaseId, 'achievements', 'updatedAt', true);

      await databases.createIndex(databaseId, 'achievements', 'category_rarity_index', 'key' as any, ['category', 'rarity']);
      await databases.createIndex(databaseId, 'achievements', 'active_index', 'key' as any, ['isActive']);
      await databases.createIndex(databaseId, 'achievements', 'points_index', 'key' as any, ['points']);

      logger.info('Achievements collection created');

      // User Achievements Collection
      await databases.createCollection(
        databaseId,
        'user_achievements',
        'User Achievements',
        ['read("users")', 'write("users")'],
        true
      );

      await databases.createStringAttribute(databaseId, 'user_achievements', 'userId', 50, true);
      await databases.createStringAttribute(databaseId, 'user_achievements', 'achievementId', 50, true);
      await databases.createDatetimeAttribute(databaseId, 'user_achievements', 'unlockedAt', true);
      await databases.createFloatAttribute(databaseId, 'user_achievements', 'progress', false);
      await databases.createStringAttribute(databaseId, 'user_achievements', 'context', 1000, false);
      await databases.createBooleanAttribute(databaseId, 'user_achievements', 'isVisible', true, true);
      await databases.createStringAttribute(databaseId, 'user_achievements', 'shareLevel', 20, true);

      await databases.createIndex(databaseId, 'user_achievements', 'user_achievement_index', 'unique' as any, ['userId', 'achievementId']);
      await databases.createIndex(databaseId, 'user_achievements', 'user_unlocked_index', 'key' as any, ['userId', 'unlockedAt']);
      await databases.createIndex(databaseId, 'user_achievements', 'achievement_users_index', 'key' as any, ['achievementId']);

      logger.info('User achievements collection created');

      // Teams Collection
      await databases.createCollection(
        databaseId,
        'teams',
        'Teams',
        ['read("users")', 'write("users")'],
        false
      );

      await databases.createStringAttribute(databaseId, 'teams', 'name', 200, true);
      await databases.createStringAttribute(databaseId, 'teams', 'description', 1000, false);
      await databases.createStringAttribute(databaseId, 'teams', 'createdBy', 50, true);
      await databases.createStringAttribute(databaseId, 'teams', 'type', 50, true);
      await databases.createIntegerAttribute(databaseId, 'teams', 'maxMembers', false);
      await databases.createIntegerAttribute(databaseId, 'teams', 'currentMembers', true, 1);
      await databases.createBooleanAttribute(databaseId, 'teams', 'isPublic', true, true);
      await databases.createStringAttribute(databaseId, 'teams', 'inviteCode', 100, false);
      await databases.createStringAttribute(databaseId, 'teams', 'tags', 500, false);
      await databases.createDatetimeAttribute(databaseId, 'teams', 'createdAt', true);
      await databases.createDatetimeAttribute(databaseId, 'teams', 'updatedAt', true);

      await databases.createIndex(databaseId, 'teams', 'created_by_index', 'key' as any, ['createdBy']);
      await databases.createIndex(databaseId, 'teams', 'type_public_index', 'key' as any, ['type', 'isPublic']);
      await databases.createIndex(databaseId, 'teams', 'invite_code_index', 'unique' as any, ['inviteCode']);

      logger.info('Teams collection created');

      // Team Members Collection
      await databases.createCollection(
        databaseId,
        'team_members',
        'Team Members',
        ['read("users")', 'write("users")'],
        true
      );

      await databases.createStringAttribute(databaseId, 'team_members', 'teamId', 50, true);
      await databases.createStringAttribute(databaseId, 'team_members', 'userId', 50, true);
      await databases.createStringAttribute(databaseId, 'team_members', 'role', 50, true);
      await databases.createDatetimeAttribute(databaseId, 'team_members', 'joinedAt', true);
      await databases.createBooleanAttribute(databaseId, 'team_members', 'isActive', true, true);
      await databases.createStringAttribute(databaseId, 'team_members', 'invitedBy', 50, false);
      await databases.createDatetimeAttribute(databaseId, 'team_members', 'lastActiveAt', false);

      await databases.createIndex(databaseId, 'team_members', 'team_user_index', 'unique' as any, ['teamId', 'userId']);
      await databases.createIndex(databaseId, 'team_members', 'user_teams_index', 'key' as any, ['userId', 'isActive']);
      await databases.createIndex(databaseId, 'team_members', 'team_role_index', 'key' as any, ['teamId', 'role']);

      logger.info('Team members collection created');

      logger.info('Developer leaderboards database schema created successfully');

    } catch (error: any) {
      logger.error('Failed to create developer leaderboards database schema', {
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        }
      });
      throw error;
    }
  },

  async down(): Promise<void> {
    logger.info('Rolling back developer leaderboards database schema');

    try {
      const collections = [
        'team_members',
        'teams',
        'user_achievements',
        'achievements',
        'challenge_participants',
        'challenges',
        'developer_leaderboard',
        'privacy_settings'
      ];

      for (const collectionId of collections) {
        try {
          await databases.deleteCollection(databaseId, collectionId);
          logger.info(`Deleted collection: ${collectionId}`);
        } catch (error: any) {
          logger.warn(`Could not delete collection ${collectionId}`, {
            error: { code: 'DELETE_COLLECTION_ERROR', message: error.message }
          });
        }
      }

      logger.info('Developer leaderboards database schema rollback completed');

    } catch (error: any) {
      logger.error('Failed to rollback developer leaderboards database schema', {
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        }
      });
      throw error;
    }
  }
};

export default migration;