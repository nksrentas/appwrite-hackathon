/**
 * Leaderboard Update Function - Appwrite Function
 * Calculates rankings for all time periods (daily, weekly, monthly, all-time)
 * Updates leaderboard entries and broadcasts updates via Realtime
 */

import { Client, Databases } from 'node-appwrite';

// Date utilities (simplified version of date-fns functionality)
function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;
  return startOfDay(new Date(start.setDate(diff)));
}

function endOfWeek(date: Date): Date {
  const end = new Date(date);
  const day = end.getDay();
  const diff = end.getDate() + (6 - day);
  return endOfDay(new Date(end.setDate(diff)));
}

function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// Types
interface UserMetrics {
  user_id: string;
  username?: string;
  total_carbon_kg: number;
  carbon_per_commit: number;
  carbon_per_line_added: number;
  efficiency_score: number;
  commits_count: number;
  active_days: number;
  total_lines_added: number;
}

interface LeaderboardPeriod {
  type: 'daily' | 'weekly' | 'monthly' | 'all_time';
  start: Date;
  end: Date;
}

interface AppwriteContext {
  req: any;
  res: any;
  log: (message: string) => void;
  error: (message: string) => void;
}

// Initialize Appwrite client
function initializeAppwrite(): { databases: Databases } {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

  return {
    databases: new Databases(client)
  };
}

/**
 * Define time periods for leaderboard calculation
 */
function getLeaderboardPeriods(): LeaderboardPeriod[] {
  const now = new Date();
  
  return [
    {
      type: 'daily',
      start: startOfDay(now),
      end: endOfDay(now)
    },
    {
      type: 'weekly',
      start: startOfWeek(now),
      end: endOfWeek(now)
    },
    {
      type: 'monthly',
      start: startOfMonth(now),
      end: endOfMonth(now)
    },
    {
      type: 'all_time',
      start: new Date('2024-01-01'), // Adjust based on your app launch date
      end: now
    }
  ];
}

/**
 * Fetch user activities for a specific time period
 */
async function fetchUserActivities(
  databases: Databases,
  periodStart: Date,
  periodEnd: Date
): Promise<any[]> {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  
  try {
    // Fetch all activities in the time period
    const activities = await databases.listDocuments(
      databaseId,
      'activities',
      [
        `greaterEqual("timestamp", "${periodStart.toISOString()}")`,
        `lessEqual("timestamp", "${periodEnd.toISOString()}")`,
        'limit(1000)' // Adjust based on expected volume
      ]
    );
    
    return activities.documents;
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return [];
  }
}

/**
 * Fetch user information for username display
 */
async function fetchUserInfo(databases: Databases, userIds: string[]): Promise<Map<string, any>> {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  const userMap = new Map<string, any>();
  
  try {
    // Fetch user info in batches (Appwrite has query limits)
    const batchSize = 25;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const users = await databases.listDocuments(
        databaseId,
        'users',
        batch.map(id => `equal("$id", "${id}")`)
      );
      
      users.documents.forEach(user => {
        userMap.set(user.$id, user);
      });
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error);
  }
  
  return userMap;
}

/**
 * Calculate metrics for each user
 */
function calculateUserMetrics(activities: any[], userMap: Map<string, any>): UserMetrics[] {
  const userStats = new Map<string, {
    total_carbon: number;
    commit_count: number;
    total_lines_added: number;
    active_days: Set<string>;
  }>();
  
  // Aggregate activities by user
  activities.forEach(activity => {
    const userId = activity.user_id;
    
    if (!userStats.has(userId)) {
      userStats.set(userId, {
        total_carbon: 0,
        commit_count: 0,
        total_lines_added: 0,
        active_days: new Set()
      });
    }
    
    const stats = userStats.get(userId)!;
    stats.total_carbon += activity.carbon_kg || 0;
    
    // Count commits and calculate lines added
    if (activity.type === 'commit' && activity.commit) {
      const commitData = JSON.parse(activity.commit);
      stats.commit_count += 1;
      stats.total_lines_added += commitData.additions || 0;
    }
    
    // Track active days
    const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
    stats.active_days.add(activityDate);
  });
  
  // Convert to metrics array
  const metrics: UserMetrics[] = [];
  
  userStats.forEach((stats, userId) => {
    const user = userMap.get(userId);
    
    // Calculate derived metrics
    const carbon_per_commit = stats.commit_count > 0 
      ? stats.total_carbon / stats.commit_count 
      : 0;
    
    const carbon_per_line_added = stats.total_lines_added > 0 
      ? stats.total_carbon / stats.total_lines_added 
      : 0;
    
    // Efficiency score (lower is better) - carbon per line of productive code
    const efficiency_score = carbon_per_line_added || stats.total_carbon;
    
    metrics.push({
      user_id: userId,
      username: user?.username || 'Unknown User',
      total_carbon_kg: Math.round(stats.total_carbon * 1000000) / 1000000,
      carbon_per_commit: Math.round(carbon_per_commit * 1000000) / 1000000,
      carbon_per_line_added: Math.round(carbon_per_line_added * 1000000) / 1000000,
      efficiency_score: Math.round(efficiency_score * 1000000) / 1000000,
      commits_count: stats.commit_count,
      active_days: stats.active_days.size,
      total_lines_added: stats.total_lines_added
    });
  });
  
  return metrics;
}

/**
 * Sort and rank users for leaderboard
 */
function rankUsers(metrics: UserMetrics[], rankBy: 'efficiency' | 'total_carbon' = 'efficiency'): UserMetrics[] {
  // Sort by efficiency (lower is better) or total carbon (higher is worse, but we show it)
  const sorted = [...metrics].sort((a, b) => {
    if (rankBy === 'efficiency') {
      // For efficiency, lower carbon per line is better
      // But we need to handle zero values (users with no code changes)
      if (a.efficiency_score === 0 && b.efficiency_score === 0) {
        return b.total_carbon_kg - a.total_carbon_kg; // Higher total carbon is worse
      }
      if (a.efficiency_score === 0) return 1; // Push zero efficiency to end
      if (b.efficiency_score === 0) return -1;
      return a.efficiency_score - b.efficiency_score; // Lower is better
    } else {
      // For total carbon, we could rank by lowest (most eco-friendly)
      return a.total_carbon_kg - b.total_carbon_kg; // Lower total is better
    }
  });
  
  return sorted;
}

/**
 * Clear existing leaderboard entries for a period
 */
async function clearExistingLeaderboard(
  databases: Databases,
  periodType: string
): Promise<void> {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  
  try {
    const existing = await databases.listDocuments(
      databaseId,
      'leaderboards',
      [`equal("period_type", "${periodType}")`]
    );
    
    // Delete existing entries
    for (const doc of existing.documents) {
      await databases.deleteDocument(databaseId, 'leaderboards', doc.$id);
    }
  } catch (error) {
    console.error(`Failed to clear existing leaderboard for ${periodType}:`, error);
  }
}

/**
 * Store leaderboard entries
 */
async function storeLeaderboard(
  databases: Databases,
  period: LeaderboardPeriod,
  rankedMetrics: UserMetrics[]
): Promise<number> {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace-main';
  let stored = 0;
  
  try {
    // Clear existing entries for this period
    await clearExistingLeaderboard(databases, period.type);
    
    // Store new entries
    const totalParticipants = rankedMetrics.length;
    
    for (let i = 0; i < rankedMetrics.length; i++) {
      const userMetrics = rankedMetrics[i];
      const rank = i + 1;
      const percentile = totalParticipants > 1 
        ? Math.round(((totalParticipants - rank) / (totalParticipants - 1)) * 100) 
        : 100;
      
      await databases.createDocument(
        databaseId,
        'leaderboards',
        'unique()',
        {
          user_id: userMetrics.user_id,
          period_type: period.type,
          period_start: period.start.toISOString(),
          period_end: period.end.toISOString(),
          metrics: JSON.stringify({
            total_carbon_kg: userMetrics.total_carbon_kg,
            carbon_per_commit: userMetrics.carbon_per_commit,
            carbon_per_line_added: userMetrics.carbon_per_line_added,
            efficiency_score: userMetrics.efficiency_score,
            commits_count: userMetrics.commits_count,
            active_days: userMetrics.active_days
          }),
          rank,
          total_participants: totalParticipants,
          percentile,
          last_updated: new Date().toISOString()
        }
      );
      
      stored++;
    }
  } catch (error) {
    console.error(`Failed to store leaderboard for ${period.type}:`, error);
    throw error;
  }
  
  return stored;
}

/**
 * Update leaderboards for all periods
 */
async function updateLeaderboards(): Promise<{
  daily: number;
  weekly: number;
  monthly: number;
  all_time: number;
}> {
  const { databases } = initializeAppwrite();
  const periods = getLeaderboardPeriods();
  const results = { daily: 0, weekly: 0, monthly: 0, all_time: 0 };
  
  for (const period of periods) {
    console.log(`Updating ${period.type} leaderboard...`);
    
    try {
      // Fetch activities for the period
      const activities = await fetchUserActivities(databases, period.start, period.end);
      
      if (activities.length === 0) {
        console.log(`No activities found for ${period.type} period`);
        continue;
      }
      
      // Get unique user IDs
      const userIds = [...new Set(activities.map(a => a.user_id))];
      
      // Fetch user information
      const userMap = await fetchUserInfo(databases, userIds);
      
      // Calculate metrics
      const metrics = calculateUserMetrics(activities, userMap);
      
      if (metrics.length === 0) {
        console.log(`No metrics calculated for ${period.type} period`);
        continue;
      }
      
      // Rank users by efficiency (lower carbon per line is better)
      const rankedMetrics = rankUsers(metrics, 'efficiency');
      
      // Store leaderboard
      const stored = await storeLeaderboard(databases, period, rankedMetrics);
      results[period.type] = stored;
      
      console.log(`${period.type} leaderboard updated: ${stored} entries`);
      
    } catch (error) {
      console.error(`Failed to update ${period.type} leaderboard:`, error);
    }
  }
  
  return results;
}

/**
 * Main function handler
 */
export default async function handler(context: AppwriteContext) {
  const { req, res, log, error } = context;
  
  try {
    log('Starting leaderboard update...');
    
    const results = await updateLeaderboards();
    
    const totalEntries = Object.values(results).reduce((sum, count) => sum + count, 0);
    
    log(`Leaderboard update completed: ${totalEntries} total entries`);
    
    return res.json({
      success: true,
      message: 'Leaderboards updated successfully',
      results,
      total_entries: totalEntries,
      updated_at: new Date().toISOString()
    });
    
  } catch (err: any) {
    error(`Leaderboard update failed: ${err.message}`);
    return res.json({
      error: 'Leaderboard update failed',
      message: err.message
    }, 500);
  }
}

/**
 * Manual trigger for testing (can be called directly)
 */
export async function updateLeaderboardsManual(): Promise<void> {
  console.log('Manual leaderboard update triggered');
  
  try {
    const results = await updateLeaderboards();
    console.log('Manual update results:', results);
  } catch (error) {
    console.error('Manual update failed:', error);
    throw error;
  }
}