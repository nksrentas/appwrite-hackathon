import { Client, Account, Databases, Functions } from 'appwrite';


const client = new Client();

if (typeof window !== 'undefined') {
  const endpoint = window.ENV?.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
  const projectId = window.ENV?.APPWRITE_PROJECT_ID || '';

  client.setEndpoint(endpoint).setProject(projectId);
} else {
  // Server-side initialization - use fallback values for now
  client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('');
}

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

export const realtime = typeof window !== 'undefined' ? client : null;

export { client };

export const DATABASE_ID = 'ecotrace_main';

export const COLLECTIONS = {
  USERS: 'users',
  ACTIVITIES: 'activities',
  CALCULATIONS: 'calculations',
  LEADERBOARD: 'developer_leaderboard',
  CHALLENGES: 'challenges',
  CHALLENGE_PARTICIPANTS: 'challenge_participants',
  USER_ACHIEVEMENTS: 'user_achievements',
  TEAMS: 'teams',
  PRIVACY_SETTINGS: 'privacy_settings',
  LEADERBOARDS: 'leaderboards',
  EMISSION_FACTORS: 'emission_factors',
} as const;

export const CHANNELS = {
  USER_CARBON: (userId: string) => `user.${userId}.carbon`,
  USER_ACTIVITIES: (userId: string) => `user.${userId}.activities`,
  LEADERBOARD_DAILY: 'leaderboard.daily',
  LEADERBOARD_WEEKLY: 'leaderboard.weekly',
  LEADERBOARD_MONTHLY: 'leaderboard.monthly',
  ACTIVITIES_GLOBAL: 'activities.global',
} as const;

export const FUNCTIONS_IDS = {
  CALCULATE_CARBON: 'calculate_carbon',
  UPDATE_LEADERBOARD: 'update_leaderboard',
  SYNC_GITHUB: 'sync_github',
  WEBHOOK_HANDLER: 'webhook_handler',
} as const;

export const OAUTH_PROVIDERS = {
  GITHUB: 'github',
} as const;

export interface AppwriteUser {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  githubId: string;
  githubUsername: string;
  email: string;
  name: string;
  avatar: string;
  repositories: string[];
  settings: {
    notifications: boolean;
    publicProfile: boolean;
    dataRetention: number;
  };
  carbonFootprint: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    lastUpdated: string;
  };
}

export interface AppwriteActivity {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  type: 'commit' | 'pr' | 'ci_run' | 'deployment';
  repository: string;
  githubEventId: string;
  details: Record<string, unknown>;
  carbonCalculated: boolean;
  carbonValue?: number;
  carbonUnit?: string;
  carbonConfidence?: number;
  carbonSource?: string;
}

export interface AppwriteCalculation {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  activityId: string;
  userId: string;
  carbonValue: number;
  carbonUnit: string;
  methodology: string;
  emissionFactors: Record<string, unknown>;
  confidence: number;
  dataSource: string;
  calculationVersion: string;
}

export interface AppwriteLeaderboard {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  periodStart: string;
  periodEnd: string;
  rankings: Array<{
    userId: string;
    username: string;
    avatar: string;
    carbonTotal: number;
    efficiencyScore: number;
    rank: number;
    activities: number;
  }>;
}

export interface AppwriteEmissionFactor {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  region: string;
  source: string;
  factorType: string;
  value: number;
  unit: string;
  confidence: number;
  validFrom: string;
  validTo: string;
  metadata: Record<string, unknown>;
}
