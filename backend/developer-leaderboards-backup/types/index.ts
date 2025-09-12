export interface PrivacySettings {
  userId: string;
  participationLevel: 'none' | 'anonymous' | 'username' | 'full';
  shareCarbonEfficiency: boolean;
  shareImprovementTrends: boolean;
  shareAchievements: boolean;
  shareChallengeParticipation: boolean;
  teamVisibility: boolean;
  allowMentorship: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  username?: string;
  displayName?: string;
  category: LeaderboardCategory;
  period: TimePeriod;
  carbonEfficiency: number; // kg CO2e per unit (commit, build, feature)
  improvementPercentage?: number;
  rank: number;
  privacyLevel: PrivacyLevel;
  totalCommits?: number;
  totalBuilds?: number;
  totalDeployments?: number;
  contextGroup?: string; // For fair comparison grouping
  lastUpdated: Date;
  createdAt: Date;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  goalType: ChallengeGoalType;
  targetValue: number;
  targetUnit: string;
  startDate: Date;
  endDate: Date;
  status: ChallengeStatus;
  createdBy: string;
  maxParticipants?: number;
  currentParticipants: number;
  rules?: string;
  rewards?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  joinedAt: Date;
  status: ParticipantStatus;
  currentProgress: number;
  bestProgress?: number;
  lastActivityAt?: Date;
  teamId?: string;
  notes?: string;
  updatedAt: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlockCriteria: UnlockCriteria;
  points: number;
  isActive: boolean;
  totalUnlocked: number;
  requirements?: string;
  tips?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress?: number;
  context?: string;
  isVisible: boolean;
  shareLevel: ShareLevel;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  type: TeamType;
  maxMembers?: number;
  currentMembers: number;
  isPublic: boolean;
  inviteCode?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  isActive: boolean;
  invitedBy?: string;
  lastActiveAt?: Date;
}

// Enums and Union Types
export type PrivacyLevel = 'anonymous' | 'username' | 'full';
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time';
export type LeaderboardCategory = 'carbon_efficiency' | 'improvement' | 'total_reduction' | 'consistency';

export type ChallengeType = 'individual' | 'team' | 'organization' | 'global';
export type ChallengeCategory = 'efficiency' | 'reduction' | 'innovation' | 'education' | 'collaboration';
export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ChallengeGoalType = 'reduce_carbon' | 'improve_efficiency' | 'complete_activities' | 'share_knowledge';
export type ChallengeStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'archived';

export type ParticipantStatus = 'active' | 'completed' | 'dropped_out' | 'disqualified';

export type AchievementCategory = 'efficiency' | 'improvement' | 'community' | 'challenge' | 'milestone' | 'innovation';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ShareLevel = 'private' | 'team' | 'public';
export type TeamType = 'challenge' | 'permanent' | 'project' | 'organization';
export type TeamRole = 'member' | 'moderator' | 'admin' | 'owner';

// Complex Types
export interface UnlockCriteria {
  type: 'carbon_efficiency' | 'total_reduction' | 'improvement_streak' | 'challenge_completion' | 'community_contribution';
  conditions: CriteriaCondition[];
  timeframe?: TimePeriod;
  minimumActivities?: number;
}

export interface CriteriaCondition {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'in' | 'between';
  value: number | string | number[] | string[];
  unit?: string;
}

// API Request/Response Types
export interface LeaderboardRequest {
  category?: LeaderboardCategory;
  period?: TimePeriod;
  limit?: number;
  offset?: number;
  userId?: string; // For getting user's position
  contextGroup?: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userPosition?: {
    entry: LeaderboardEntry;
    rank: number;
  };
  totalEntries: number;
  period: TimePeriod;
  category: LeaderboardCategory;
  lastUpdated: Date;
}

export interface ChallengeRequest {
  type?: ChallengeType;
  category?: ChallengeCategory;
  difficulty?: ChallengeDifficulty;
  status?: ChallengeStatus;
  limit?: number;
  offset?: number;
  userId?: string; // For user's challenges
}

export interface ChallengeResponse {
  challenges: Challenge[];
  totalChallenges: number;
  userParticipation?: ChallengeParticipant[];
}

export interface AchievementRequest {
  category?: AchievementCategory;
  rarity?: AchievementRarity;
  userId?: string; // For user's achievements
  onlyUnlocked?: boolean;
}

export interface AchievementResponse {
  achievements: Achievement[];
  userAchievements?: UserAchievement[];
  totalAchievements: number;
  unlockedCount?: number;
}

export interface PrivacyUpdateRequest {
  participationLevel?: PrivacyLevel;
  shareMetrics?: {
    carbonEfficiency?: boolean;
    improvementTrends?: boolean;
    achievements?: boolean;
    challengeParticipation?: boolean;
  };
  teamVisibility?: boolean;
  allowMentorship?: boolean;
}

// Service Types
export interface LeaderboardCalculationOptions {
  category: LeaderboardCategory;
  period: TimePeriod;
  contextAware: boolean;
  privacyFiltering: boolean;
}

export interface ChallengeProgressUpdate {
  challengeId: string;
  userId: string;
  newProgress: number;
  activityData?: any;
  timestamp?: Date;
}

export interface AchievementUnlockEvent {
  userId: string;
  achievementId: string;
  context?: string;
  progress?: number;
  activityData?: any;
}

// WebSocket Event Types
export interface LeaderboardUpdateEvent {
  type: 'leaderboard_updated';
  category: LeaderboardCategory;
  period: TimePeriod;
  affectedUsers: string[];
  timestamp: Date;
}

export interface ChallengeUpdateEvent {
  type: 'challenge_updated' | 'challenge_progress' | 'challenge_completed';
  challengeId: string;
  participants?: string[];
  progressData?: {
    userId: string;
    progress: number;
    rank?: number;
  }[];
  timestamp: Date;
}

export interface AchievementUpdateEvent {
  type: 'achievement_unlocked' | 'achievement_progress';
  userId: string;
  achievementId: string;
  progress?: number;
  unlocked?: boolean;
  timestamp: Date;
}

// Error Types
export interface LeaderboardError extends Error {
  code: 'PRIVACY_VIOLATION' | 'INVALID_CATEGORY' | 'CALCULATION_ERROR' | 'DATABASE_ERROR';
  details?: any;
}

export interface ChallengeError extends Error {
  code: 'ALREADY_PARTICIPATING' | 'CHALLENGE_FULL' | 'INVALID_CHALLENGE' | 'PERMISSION_DENIED';
  details?: any;
}

export interface AchievementError extends Error {
  code: 'ALREADY_UNLOCKED' | 'CRITERIA_NOT_MET' | 'INVALID_ACHIEVEMENT' | 'CALCULATION_ERROR';
  details?: any;
}