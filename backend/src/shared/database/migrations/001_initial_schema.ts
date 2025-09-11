import { Client, Databases, ID } from 'node-appwrite';
import { logger } from '@shared/utils/logger';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace';

const migration = {
  id: '001_initial_schema',
  name: 'Initial Database Schema',
  version: '1.0.0',
  description: 'Creates the initial database schema with core collections for EcoTrace',

  async up(): Promise<void> {
    logger.info('Creating initial database schema');

    try {
      await databases.createCollection(
        databaseId,
        'users',
        'Users',
        ['read("any")', 'write("users")'],
        true
      );

      await databases.createStringAttribute(databaseId, 'users', 'email', 255, true);
      await databases.createStringAttribute(databaseId, 'users', 'username', 100, true);
      await databases.createStringAttribute(databaseId, 'users', 'fullName', 255, false);
      await databases.createStringAttribute(databaseId, 'users', 'avatarUrl', 500, false);
      await databases.createDatetimeAttribute(databaseId, 'users', 'createdAt', true);
      await databases.createDatetimeAttribute(databaseId, 'users', 'updatedAt', true);
      await databases.createBooleanAttribute(databaseId, 'users', 'isActive', true, true);
      await databases.createStringAttribute(databaseId, 'users', 'preferences', 2000, false);

      await databases.createIndex(databaseId, 'users', 'email_index', 'unique', ['email']);
      await databases.createIndex(databaseId, 'users', 'username_index', 'unique', ['username']);
      await databases.createIndex(databaseId, 'users', 'created_at_index', 'key', ['createdAt']);

      logger.info('Users collection created');

      await databases.createCollection(
        databaseId,
        'activities',
        'Activities',
        ['read("users")', 'write("users")'],
        true
      );

      await databases.createStringAttribute(databaseId, 'activities', 'userId', 50, true);
      await databases.createStringAttribute(databaseId, 'activities', 'activityType', 50, true);
      await databases.createDatetimeAttribute(databaseId, 'activities', 'timestamp', true);
      await databases.createFloatAttribute(databaseId, 'activities', 'carbonKg', true);
      await databases.createStringAttribute(databaseId, 'activities', 'confidence', 20, true);
      await databases.createStringAttribute(databaseId, 'activities', 'location', 500, false);
      await databases.createStringAttribute(databaseId, 'activities', 'metadata', 5000, false);
      await databases.createStringAttribute(databaseId, 'activities', 'repository', 255, false);
      await databases.createStringAttribute(databaseId, 'activities', 'branch', 100, false);
      await databases.createDatetimeAttribute(databaseId, 'activities', 'createdAt', true);

      await databases.createIndex(databaseId, 'activities', 'user_activities_index', 'key', ['userId', 'timestamp']);
      await databases.createIndex(databaseId, 'activities', 'activity_type_index', 'key', ['activityType']);
      await databases.createIndex(databaseId, 'activities', 'timestamp_index', 'key', ['timestamp']);
      await databases.createIndex(databaseId, 'activities', 'carbon_index', 'key', ['carbonKg']);

      logger.info('Activities collection created');

      await databases.createCollection(
        databaseId,
        'carbon_calculations',
        'Carbon Calculations',
        ['read("users")', 'write("users")'],
        true
      );

      await databases.createStringAttribute(databaseId, 'carbon_calculations', 'activityId', 50, true);
      await databases.createStringAttribute(databaseId, 'carbon_calculations', 'requestId', 100, true);
      await databases.createFloatAttribute(databaseId, 'carbon_calculations', 'carbonKg', true);
      await databases.createStringAttribute(databaseId, 'carbon_calculations', 'confidence', 20, true);
      await databases.createStringAttribute(databaseId, 'carbon_calculations', 'methodology', 2000, false);
      await databases.createStringAttribute(databaseId, 'carbon_calculations', 'sources', 5000, false);
      await databases.createFloatAttribute(databaseId, 'carbon_calculations', 'uncertaintyLower', false);
      await databases.createFloatAttribute(databaseId, 'carbon_calculations', 'uncertaintyUpper', false);
      await databases.createDatetimeAttribute(databaseId, 'carbon_calculations', 'calculatedAt', true);
      await databases.createDatetimeAttribute(databaseId, 'carbon_calculations', 'validUntil', true);
      await databases.createStringAttribute(databaseId, 'carbon_calculations', 'auditTrail', 10000, false);

      await databases.createIndex(databaseId, 'carbon_calculations', 'activity_calculation_index', 'key', ['activityId']);
      await databases.createIndex(databaseId, 'carbon_calculations', 'request_index', 'key', ['requestId']);
      await databases.createIndex(databaseId, 'carbon_calculations', 'calculated_at_index', 'key', ['calculatedAt']);

      logger.info('Carbon calculations collection created');

      await databases.createCollection(
        databaseId,
        'user_stats',
        'User Statistics',
        ['read("users")', 'write("users")'],
        true
      );

      await databases.createStringAttribute(databaseId, 'user_stats', 'userId', 50, true);
      await databases.createStringAttribute(databaseId, 'user_stats', 'period', 20, true);
      await databases.createFloatAttribute(databaseId, 'user_stats', 'totalEmissions', true);
      await databases.createIntegerAttribute(databaseId, 'user_stats', 'totalActivities', true);
      await databases.createFloatAttribute(databaseId, 'user_stats', 'averageDaily', true);
      await databases.createIntegerAttribute(databaseId, 'user_stats', 'rank', false);
      await databases.createFloatAttribute(databaseId, 'user_stats', 'improvementPercent', false);
      await databases.createDatetimeAttribute(databaseId, 'user_stats', 'calculatedAt', true);
      await databases.createDatetimeAttribute(databaseId, 'user_stats', 'periodStart', true);
      await databases.createDatetimeAttribute(databaseId, 'user_stats', 'periodEnd', true);

      await databases.createIndex(databaseId, 'user_stats', 'user_period_index', 'unique', ['userId', 'period']);
      await databases.createIndex(databaseId, 'user_stats', 'rank_index', 'key', ['rank']);
      await databases.createIndex(databaseId, 'user_stats', 'emissions_index', 'key', ['totalEmissions']);

      logger.info('User stats collection created');

      await databases.createCollection(
        databaseId,
        'leaderboard',
        'Leaderboard',
        ['read("any")', 'write("administrators")'],
        false
      );

      await databases.createStringAttribute(databaseId, 'leaderboard', 'userId', 50, true);
      await databases.createStringAttribute(databaseId, 'leaderboard', 'username', 100, true);
      await databases.createStringAttribute(databaseId, 'leaderboard', 'period', 20, true);
      await databases.createFloatAttribute(databaseId, 'leaderboard', 'emissions', true);
      await databases.createIntegerAttribute(databaseId, 'leaderboard', 'rank', true);
      await databases.createIntegerAttribute(databaseId, 'leaderboard', 'activitiesCount', true);
      await databases.createDatetimeAttribute(databaseId, 'leaderboard', 'lastActivity', false);
      await databases.createDatetimeAttribute(databaseId, 'leaderboard', 'updatedAt', true);

      await databases.createIndex(databaseId, 'leaderboard', 'period_rank_index', 'key', ['period', 'rank']);
      await databases.createIndex(databaseId, 'leaderboard', 'period_emissions_index', 'key', ['period', 'emissions']);
      await databases.createIndex(databaseId, 'leaderboard', 'user_period_index', 'unique', ['userId', 'period']);

      logger.info('Leaderboard collection created');

      await databases.createCollection(
        databaseId,
        'data_sources',
        'Data Sources',
        ['read("any")', 'write("administrators")'],
        false
      );

      await databases.createStringAttribute(databaseId, 'data_sources', 'name', 100, true);
      await databases.createStringAttribute(databaseId, 'data_sources', 'type', 50, true);
      await databases.createStringAttribute(databaseId, 'data_sources', 'description', 1000, false);
      await databases.createStringAttribute(databaseId, 'data_sources', 'endpoint', 500, false);
      await databases.createStringAttribute(databaseId, 'data_sources', 'coverage', 200, false);
      await databases.createStringAttribute(databaseId, 'data_sources', 'updateFrequency', 50, false);
      await databases.createStringAttribute(databaseId, 'data_sources', 'confidence', 20, false);
      await databases.createBooleanAttribute(databaseId, 'data_sources', 'isActive', true, true);
      await databases.createFloatAttribute(databaseId, 'data_sources', 'reliability', false);
      await databases.createDatetimeAttribute(databaseId, 'data_sources', 'lastUpdated', false);
      await databases.createDatetimeAttribute(databaseId, 'data_sources', 'createdAt', true);

      await databases.createIndex(databaseId, 'data_sources', 'name_index', 'unique', ['name']);
      await databases.createIndex(databaseId, 'data_sources', 'type_index', 'key', ['type']);
      await databases.createIndex(databaseId, 'data_sources', 'active_index', 'key', ['isActive']);

      logger.info('Data sources collection created');

      logger.info('Initial database schema created successfully');

    } catch (error: any) {
      logger.error('Failed to create initial database schema', {
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
    logger.info('Rolling back initial database schema');

    try {
      const collections = [
        'data_sources',
        'leaderboard', 
        'user_stats',
        'carbon_calculations',
        'activities',
        'users'
      ];

      for (const collectionId of collections) {
        try {
          await databases.deleteCollection(databaseId, collectionId);
          logger.info(`Deleted collection: ${collectionId}`);
        } catch (error: any) {
          logger.warn(`Could not delete collection ${collectionId}`, {
            error: { message: error.message }
          });
        }
      }

      logger.info('Initial database schema rollback completed');

    } catch (error: any) {
      logger.error('Failed to rollback initial database schema', {
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