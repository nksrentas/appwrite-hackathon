require('dotenv').config();

const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace';

async function createLeaderboardTables() {
  console.log('🚀 Creating developer leaderboards database schema...');
  
  try {
    // Create Privacy Settings Collection
    console.log('📋 Creating privacy_settings collection...');
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

    await databases.createIndex(databaseId, 'privacy_settings', 'user_index', 'unique', ['userId']);
    await databases.createIndex(databaseId, 'privacy_settings', 'participation_index', 'key', ['participationLevel']);

    console.log('✅ Privacy settings collection created');

    // Create Developer Leaderboard Collection
    console.log('📋 Creating developer_leaderboard collection...');
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

    console.log('✅ Developer leaderboard collection created');

    // Create other collections
    console.log('📋 Creating challenges collection...');
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

    console.log('✅ Challenges collection created');

    console.log('🎉 Developer leaderboards database schema created successfully!');
    
  } catch (error) {
    if (error.code === 409) {
      console.log('⚠️ Collections already exist - migration may have been run before');
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }
}

createLeaderboardTables();