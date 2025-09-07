import { 
  databases, 
  DATABASE_ID, 
  COLLECTION_IDS, 
  executeAppwriteOperation,
  QueryBuilder,
  PermissionHelper,
  cache
} from '~/utils/appwrite-client';
import { logger } from '~/utils/logging-utils';
import { 
  User, 
  Activity, 
  Calculation, 
  LeaderboardEntry, 
  EmissionFactor,
  UserDocument,
  ActivityDocument,
  CalculationDocument,
  LeaderboardDocument,
  EmissionFactorDocument
} from '~/types/database-types';

export interface CreateUserParams {
  userData: Omit<User, '$id' | '$createdAt' | '$updatedAt'>;
}

export interface CreateUserResult {
  user: User;
}

export interface FindUserByGitHubIdParams {
  githubId: string;
}

export interface FindUserByGitHubIdResult {
  user: User | null;
}

export interface UpdateUserParams {
  userId: string;
  updates: Partial<User>;
}

export interface UpdateUserResult {
  user: User;
}

export interface CreateActivityParams {
  activityData: Omit<Activity, '$id' | '$createdAt'>;
}

export interface CreateActivityResult {
  activity: Activity;
}

export interface UpdateActivityCarbonParams {
  activityId: string;
  carbonKg: number;
  confidence: Activity['calculation_confidence'];
}

export interface UpdateActivityCarbonResult {
  activity: Activity;
}

export interface GetUserActivitiesParams {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface GetUserActivitiesResult {
  activities: Activity[];
  total: number;
}

export interface GetActivitiesByDateRangeParams {
  startDate: string;
  endDate: string;
  limit?: number;
}

export interface GetActivitiesByDateRangeResult {
  activities: Activity[];
}

export interface CreateCalculationParams {
  calculationData: Omit<Calculation, '$id' | '$createdAt'>;
}

export interface CreateCalculationResult {
  calculation: Calculation;
}

export interface GetCalculationByActivityIdParams {
  activityId: string;
}

export interface GetCalculationByActivityIdResult {
  calculation: Calculation | null;
}

export interface GetLeaderboardParams {
  periodType: LeaderboardEntry['period_type'];
  limit?: number;
}

export interface GetLeaderboardResult {
  leaderboard: LeaderboardEntry[];
}

export interface GetUserPositionParams {
  userId: string;
  periodType: LeaderboardEntry['period_type'];
}

export interface GetUserPositionResult {
  position: LeaderboardEntry | null;
}

export interface ClearLeaderboardParams {
  periodType: LeaderboardEntry['period_type'];
}

export interface ClearLeaderboardResult {
  deletedCount: number;
}

export interface CreateLeaderboardEntriesParams {
  entries: Omit<LeaderboardEntry, '$id' | '$createdAt'>[];
}

export interface CreateLeaderboardEntriesResult {
  createdCount: number;
}

export interface GetEmissionFactorParams {
  country: string;
  stateProvince?: string;
}

export interface GetEmissionFactorResult {
  factor: EmissionFactor | null;
}

export interface StoreEmissionFactorParams {
  factorData: Omit<EmissionFactor, '$id' | '$createdAt'>;
}

export interface StoreEmissionFactorResult {
  factor: EmissionFactor;
}

export class UserService {
  static async createUser(params: CreateUserParams): Promise<CreateUserResult> {
    return executeAppwriteOperation(async () => {
      const { userData } = params;
      
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        'unique()',
        {
          github_id: userData.github_id,
          username: userData.username,
          email: userData.email,
          avatar_url: userData.avatar_url,
          location: userData.location ? JSON.stringify(userData.location) : undefined,
          preferences: JSON.stringify(userData.preferences),
          onboarding_completed: userData.onboarding_completed
        },
        PermissionHelper.userOwned(userData.github_id)
      );
      
      logger.appwriteOperation('createUser', COLLECTION_IDS.USERS, result.$id, true);
      
      const doc = result as unknown as UserDocument;
      const user = {
        ...doc,
        location: doc.location ? JSON.parse(doc.location) : undefined,
        preferences: JSON.parse(doc.preferences)
      } as User;

      return { user };
    }, 'createUser');
  }

  static async findByGitHubId(params: FindUserByGitHubIdParams): Promise<FindUserByGitHubIdResult> {
    const { githubId } = params;
    const cacheKey = `user_github_${githubId}`;
    const cached = cache.get(cacheKey);
    if (cached) return { user: cached };

    return executeAppwriteOperation(async () => {
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        new QueryBuilder().equal('github_id', githubId).limit(1).build()
      );
      
      if (result.documents.length === 0) {
        return { user: null };
      }
      
      const doc = result.documents[0] as unknown as UserDocument;
      const user = {
        ...doc,
        location: doc.location ? JSON.parse(doc.location) : undefined,
        preferences: JSON.parse(doc.preferences)
      } as User;
      
      cache.set(cacheKey, user, 5 * 60 * 1000);
      logger.appwriteOperation('findByGitHubId', COLLECTION_IDS.USERS, user.$id, true);
      
      return { user };
    }, 'findUserByGitHubId');
  }

  static async updateUser(params: UpdateUserParams): Promise<UpdateUserResult> {
    return executeAppwriteOperation(async () => {
      const { userId, updates } = params;
      const updateData: any = {};
      
      if (updates.username) updateData.username = updates.username;
      if (updates.email) updateData.email = updates.email;
      if (updates.avatar_url) updateData.avatar_url = updates.avatar_url;
      if (updates.location) updateData.location = JSON.stringify(updates.location);
      if (updates.preferences) updateData.preferences = JSON.stringify(updates.preferences);
      if (updates.onboarding_completed !== undefined) updateData.onboarding_completed = updates.onboarding_completed;

      const result = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        userId,
        updateData
      );
      
      if (updates.github_tokens?.access_token) {
        cache.delete(`user_github_${result.github_id}`);
      }
      
      logger.appwriteOperation('updateUser', COLLECTION_IDS.USERS, userId, true);
      
      const doc = result as unknown as UserDocument;
      const user = {
        ...doc,
        location: doc.location ? JSON.parse(doc.location) : undefined,
        preferences: JSON.parse(doc.preferences)
      } as User;

      return { user };
    }, 'updateUser');
  }
}

export class ActivityService {
  static async createActivity(params: CreateActivityParams): Promise<CreateActivityResult> {
    return executeAppwriteOperation(async () => {
      const { activityData } = params;
      
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.ACTIVITIES,
        'unique()',
        {
          user_id: activityData.user_id,
          type: activityData.type,
          repository: activityData.repository ? JSON.stringify(activityData.repository) : undefined,
          commit: activityData.commit ? JSON.stringify(activityData.commit) : undefined,
          ci_data: activityData.ci_data ? JSON.stringify(activityData.ci_data) : undefined,
          local_data: activityData.local_data ? JSON.stringify(activityData.local_data) : undefined,
          carbon_kg: activityData.carbon_kg,
          calculation_confidence: activityData.calculation_confidence,
          timestamp: activityData.timestamp
        },
        PermissionHelper.userOwned(activityData.user_id)
      );
      
      logger.appwriteOperation('createActivity', COLLECTION_IDS.ACTIVITIES, result.$id, true);
      logger.carbonCalculation('Activity created', {
        type: activityData.type,
        confidence: activityData.calculation_confidence,
        carbon_kg: activityData.carbon_kg
      }, { activityId: result.$id, userId: activityData.user_id });
      
      const doc = result as unknown as ActivityDocument;
      const activity = {
        ...doc,
        repository: doc.repository ? JSON.parse(doc.repository) : undefined,
        commit: doc.commit ? JSON.parse(doc.commit) : undefined,
        ci_data: doc.ci_data ? JSON.parse(doc.ci_data) : undefined,
        local_data: doc.local_data ? JSON.parse(doc.local_data) : undefined
      } as Activity;

      return { activity };
    }, 'createActivity');
  }

  static async updateActivityCarbon(params: UpdateActivityCarbonParams): Promise<UpdateActivityCarbonResult> {
    return executeAppwriteOperation(async () => {
      const { activityId, carbonKg, confidence } = params;
      
      const result = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.ACTIVITIES,
        activityId,
        {
          carbon_kg: carbonKg,
          calculation_confidence: confidence
        }
      );
      
      logger.appwriteOperation('updateActivityCarbon', COLLECTION_IDS.ACTIVITIES, activityId, true);
      logger.carbonCalculation('Activity carbon updated', {
        type: result.type,
        confidence,
        carbon_kg: carbonKg
      }, { activityId });
      
      const doc = result as unknown as ActivityDocument;
      const activity = {
        ...doc,
        repository: doc.repository ? JSON.parse(doc.repository) : undefined,
        commit: doc.commit ? JSON.parse(doc.commit) : undefined,
        ci_data: doc.ci_data ? JSON.parse(doc.ci_data) : undefined,
        local_data: doc.local_data ? JSON.parse(doc.local_data) : undefined
      } as Activity;

      return { activity };
    }, 'updateActivityCarbon');
  }

  static async getUserActivities(params: GetUserActivitiesParams): Promise<GetUserActivitiesResult> {
    return executeAppwriteOperation(async () => {
      const { userId, limit = 25, offset = 0 } = params;
      
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.ACTIVITIES,
        new QueryBuilder()
          .equal('user_id', userId)
          .orderDesc('timestamp')
          .limit(limit)
          .offset(offset)
          .build()
      );
      
      const activities = result.documents.map((doc) => {
        const activityDoc = doc as unknown as ActivityDocument;
        return {
        ...activityDoc,
        repository: activityDoc.repository ? JSON.parse(activityDoc.repository) : undefined,
        commit: activityDoc.commit ? JSON.parse(activityDoc.commit) : undefined,
        ci_data: activityDoc.ci_data ? JSON.parse(activityDoc.ci_data) : undefined,
        local_data: activityDoc.local_data ? JSON.parse(activityDoc.local_data) : undefined
        };
      }) as Activity[];
      
      logger.appwriteOperation('getUserActivities', COLLECTION_IDS.ACTIVITIES, undefined, true);
      
      return {
        activities,
        total: result.total
      };
    }, 'getUserActivities');
  }

  static async getActivitiesByDateRange(params: GetActivitiesByDateRangeParams): Promise<GetActivitiesByDateRangeResult> {
    return executeAppwriteOperation(async () => {
      const { startDate, endDate, limit = 1000 } = params;
      
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.ACTIVITIES,
        new QueryBuilder()
          .greaterEqual('timestamp', startDate)
          .lessEqual('timestamp', endDate)
          .orderDesc('timestamp')
          .limit(limit)
          .build()
      );
      
      const activities = result.documents.map((doc) => {
        const activityDoc = doc as unknown as ActivityDocument;
        return {
        ...activityDoc,
        repository: activityDoc.repository ? JSON.parse(activityDoc.repository) : undefined,
        commit: activityDoc.commit ? JSON.parse(activityDoc.commit) : undefined,
        ci_data: activityDoc.ci_data ? JSON.parse(activityDoc.ci_data) : undefined,
        local_data: activityDoc.local_data ? JSON.parse(activityDoc.local_data) : undefined
        };
      }) as Activity[];
      
      logger.appwriteOperation('getActivitiesByDateRange', COLLECTION_IDS.ACTIVITIES, undefined, true);
      
      return { activities };
    }, 'getActivitiesByDateRange');
  }
}

export class CalculationService {
  static async createCalculation(params: CreateCalculationParams): Promise<CreateCalculationResult> {
    return executeAppwriteOperation(async () => {
      const { calculationData } = params;
      
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.CALCULATIONS,
        'unique()',
        {
          activity_id: calculationData.activity_id,
          emission_factors: JSON.stringify(calculationData.emission_factors),
          energy_breakdown: JSON.stringify(calculationData.energy_breakdown),
          methodology_version: calculationData.methodology_version,
          calculation_timestamp: calculationData.calculation_timestamp,
          raw_data: JSON.stringify(calculationData.raw_data),
          confidence_factors: JSON.stringify(calculationData.confidence_factors)
        },
        PermissionHelper.publicReadOnly()
      );
      
      logger.appwriteOperation('createCalculation', COLLECTION_IDS.CALCULATIONS, result.$id, true);
      
      const doc = result as unknown as CalculationDocument;
      const calculation = {
        ...doc,
        emission_factors: JSON.parse(doc.emission_factors),
        energy_breakdown: JSON.parse(doc.energy_breakdown),
        raw_data: JSON.parse(doc.raw_data),
        confidence_factors: JSON.parse(doc.confidence_factors)
      } as Calculation;

      return { calculation };
    }, 'createCalculation');
  }

  static async getByActivityId(params: GetCalculationByActivityIdParams): Promise<GetCalculationByActivityIdResult> {
    const { activityId } = params;
    const cacheKey = `calculation_activity_${activityId}`;
    const cached = cache.get(cacheKey);
    if (cached) return { calculation: cached };

    return executeAppwriteOperation(async () => {
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.CALCULATIONS,
        new QueryBuilder().equal('activity_id', activityId).limit(1).build()
      );
      
      if (result.documents.length === 0) {
        return { calculation: null };
      }
      
      const doc = result.documents[0] as unknown as CalculationDocument;
      const calculation = {
        ...doc,
        emission_factors: JSON.parse(doc.emission_factors),
        energy_breakdown: JSON.parse(doc.energy_breakdown),
        raw_data: JSON.parse(doc.raw_data),
        confidence_factors: JSON.parse(doc.confidence_factors)
      } as Calculation;
      
      cache.set(cacheKey, calculation, 30 * 60 * 1000);
      logger.appwriteOperation('getCalculationByActivityId', COLLECTION_IDS.CALCULATIONS, calculation.$id, true);
      
      return { calculation };
    }, 'getCalculationByActivityId');
  }
}

export class LeaderboardService {
  static async getLeaderboard(params: GetLeaderboardParams): Promise<GetLeaderboardResult> {
    const { periodType, limit = 50 } = params;
    const cacheKey = `leaderboard_${periodType}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return { leaderboard: cached };

    return executeAppwriteOperation(async () => {
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.LEADERBOARDS,
        new QueryBuilder()
          .equal('period_type', periodType)
          .orderAsc('rank')
          .limit(limit)
          .build()
      );
      
      const leaderboard = result.documents.map((doc) => {
        const leaderboardDoc = doc as unknown as LeaderboardDocument;
        return {
        ...leaderboardDoc,
        metrics: JSON.parse(leaderboardDoc.metrics)
        };
      }) as LeaderboardEntry[];
      
      cache.set(cacheKey, leaderboard, 10 * 60 * 1000);
      logger.appwriteOperation('getLeaderboard', COLLECTION_IDS.LEADERBOARDS, undefined, true);
      
      return { leaderboard };
    }, 'getLeaderboard');
  }

  static async getUserPosition(params: GetUserPositionParams): Promise<GetUserPositionResult> {
    return executeAppwriteOperation(async () => {
      const { userId, periodType } = params;
      
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.LEADERBOARDS,
        new QueryBuilder()
          .equal('user_id', userId)
          .equal('period_type', periodType)
          .limit(1)
          .build()
      );
      
      if (result.documents.length === 0) {
        return { position: null };
      }
      
      const doc = result.documents[0] as unknown as LeaderboardDocument;
      const position = {
        ...doc,
        metrics: JSON.parse(doc.metrics)
      } as LeaderboardEntry;
      
      logger.appwriteOperation('getUserLeaderboardPosition', COLLECTION_IDS.LEADERBOARDS, position.$id, true);
      
      return { position };
    }, 'getUserLeaderboardPosition');
  }

  static async clearLeaderboard(params: ClearLeaderboardParams): Promise<ClearLeaderboardResult> {
    return executeAppwriteOperation(async () => {
      const { periodType } = params;
      
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.LEADERBOARDS,
        new QueryBuilder().equal('period_type', periodType).build()
      );
      
      let deletedCount = 0;
      for (const doc of result.documents) {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.LEADERBOARDS, doc.$id);
        deletedCount++;
      }
      
      cache.delete(`leaderboard_${periodType}_50`);
      cache.delete(`leaderboard_${periodType}_25`);
      
      logger.appwriteOperation('clearLeaderboard', COLLECTION_IDS.LEADERBOARDS, undefined, true);
      
      return { deletedCount };
    }, 'clearLeaderboard');
  }

  static async createLeaderboardEntries(params: CreateLeaderboardEntriesParams): Promise<CreateLeaderboardEntriesResult> {
    return executeAppwriteOperation(async () => {
      const { entries } = params;
      let createdCount = 0;
      
      for (const entry of entries) {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTION_IDS.LEADERBOARDS,
          'unique()',
          {
            user_id: entry.user_id,
            period_type: entry.period_type,
            period_start: entry.period_start,
            period_end: entry.period_end,
            metrics: JSON.stringify(entry.metrics),
            rank: entry.rank,
            total_participants: entry.total_participants,
            percentile: entry.percentile,
            last_updated: entry.last_updated
          },
          PermissionHelper.publicReadOnly()
        );
        
        createdCount++;
      }
      
      logger.appwriteOperation('createLeaderboardEntries', COLLECTION_IDS.LEADERBOARDS, undefined, true);
      
      return { createdCount };
    }, 'createLeaderboardEntries');
  }
}

export class EmissionFactorService {
  static async getEmissionFactor(params: GetEmissionFactorParams): Promise<GetEmissionFactorResult> {
    const { country, stateProvince } = params;
    const cacheKey = `emission_factor_${country}_${stateProvince || 'none'}`;
    const cached = cache.get(cacheKey);
    if (cached) return { factor: cached };

    return executeAppwriteOperation(async () => {
      const query = new QueryBuilder()
        .equal('region.country', country)
        .greaterThan('valid_until', new Date().toISOString())
        .orderDesc('last_updated')
        .limit(1);
      
      if (stateProvince) {
        query.equal('region.state_province', stateProvince);
      }
      
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.EMISSION_FACTORS,
        query.build()
      );
      
      if (result.documents.length === 0) {
        return { factor: null };
      }
      
      const doc = result.documents[0] as unknown as EmissionFactorDocument;
      const factor = {
        ...doc,
        region: JSON.parse(doc.region),
        source: JSON.parse(doc.source)
      } as EmissionFactor;
      
      cache.set(cacheKey, factor, 6 * 60 * 60 * 1000);
      logger.appwriteOperation('getEmissionFactor', COLLECTION_IDS.EMISSION_FACTORS, factor.$id, true);
      
      return { factor };
    }, 'getEmissionFactor');
  }

  static async storeEmissionFactor(params: StoreEmissionFactorParams): Promise<StoreEmissionFactorResult> {
    return executeAppwriteOperation(async () => {
      const { factorData } = params;
      
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.EMISSION_FACTORS,
        'unique()',
        {
          region: JSON.stringify(factorData.region),
          factor_kg_co2_per_kwh: factorData.factor_kg_co2_per_kwh,
          renewable_percentage: factorData.renewable_percentage,
          source: JSON.stringify(factorData.source),
          confidence_rating: factorData.confidence_rating,
          valid_from: factorData.valid_from,
          valid_until: factorData.valid_until,
          last_updated: factorData.last_updated
        },
        PermissionHelper.publicReadOnly()
      );
      
      logger.appwriteOperation('storeEmissionFactor', COLLECTION_IDS.EMISSION_FACTORS, result.$id, true);
      
      const doc = result as unknown as EmissionFactorDocument;
      const factor = {
        ...doc,
        region: JSON.parse(doc.region),
        source: JSON.parse(doc.source)
      } as EmissionFactor;

      return { factor };
    }, 'storeEmissionFactor');
  }
}