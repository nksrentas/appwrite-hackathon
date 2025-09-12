import { Databases, Query, ID } from 'node-appwrite';
import { client } from '@shared/config/appwrite';
import { logger } from '@shared/utils/logger';
import { cacheService } from '@services/cache-service';
import { 
  Challenge, 
  ChallengeParticipant, 
  ChallengeRequest, 
  ChallengeResponse,
  ChallengeProgressUpdate,
  ChallengeType,
  ChallengeStatus,
  ParticipantStatus,
  ChallengeCategory,
  ChallengeDifficulty
} from '../types';
import { privacyManager } from './privacy-manager';

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'ecotrace';

export class ChallengeService {
  private readonly challengesCollectionId = 'challenges';
  private readonly participantsCollectionId = 'challenge_participants';
  private readonly activitiesCollectionId = 'activities';
  private readonly cacheKeyPrefix = 'challenges:';
  private readonly cacheTTL = 600; // 10 minutes

  async getChallenges(request: ChallengeRequest): Promise<ChallengeResponse> {
    try {
      const {
        type,
        category,
        difficulty,
        status = 'active',
        limit = 25,
        offset = 0,
        userId
      } = request;

      logger.info('Getting challenges', { type, category, difficulty, status, limit, offset, userId });

      // Build queries
      const queries = [
        Query.equal('status', status),
        Query.orderDesc('createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ];

      if (type) queries.push(Query.equal('type', type));
      if (category) queries.push(Query.equal('category', category));
      if (difficulty) queries.push(Query.equal('difficulty', difficulty));

      const response = await databases.listDocuments(
        databaseId,
        this.challengesCollectionId,
        queries
      );

      const challenges: Challenge[] = response.documents.map(doc => ({
        id: doc.$id,
        title: doc.title,
        description: doc.description,
        type: doc.type as ChallengeType,
        category: doc.category as ChallengeCategory,
        difficulty: doc.difficulty as ChallengeDifficulty,
        goalType: doc.goalType,
        targetValue: doc.targetValue,
        targetUnit: doc.targetUnit,
        startDate: new Date(doc.startDate),
        endDate: new Date(doc.endDate),
        status: doc.status as ChallengeStatus,
        createdBy: doc.createdBy,
        maxParticipants: doc.maxParticipants,
        currentParticipants: doc.currentParticipants,
        rules: doc.rules,
        rewards: doc.rewards,
        tags: doc.tags ? doc.tags.split(',') : [],
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      }));

      // Get user participation if userId provided
      let userParticipation: ChallengeParticipant[] | undefined;
      if (userId) {
        userParticipation = await this.getUserParticipation(userId);
      }

      return {
        challenges,
        totalChallenges: response.total,
        userParticipation
      };

    } catch (error: any) {
      logger.error('Failed to get challenges', {
        error: {
          code: 'CHALLENGES_GET_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: request
      });
      throw error;
    }
  }

  async getChallengeById(challengeId: string, userId?: string): Promise<Challenge | null> {
    try {
      const doc = await databases.getDocument(
        databaseId,
        this.challengesCollectionId,
        challengeId
      );

      const challenge: Challenge = {
        id: doc.$id,
        title: doc.title,
        description: doc.description,
        type: doc.type as ChallengeType,
        category: doc.category as ChallengeCategory,
        difficulty: doc.difficulty as ChallengeDifficulty,
        goalType: doc.goalType,
        targetValue: doc.targetValue,
        targetUnit: doc.targetUnit,
        startDate: new Date(doc.startDate),
        endDate: new Date(doc.endDate),
        status: doc.status as ChallengeStatus,
        createdBy: doc.createdBy,
        maxParticipants: doc.maxParticipants,
        currentParticipants: doc.currentParticipants,
        rules: doc.rules,
        rewards: doc.rewards,
        tags: doc.tags ? doc.tags.split(',') : [],
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      };

      return challenge;

    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      
      logger.error('Failed to get challenge by ID', {
        error: { message: error.message },
        metadata: { challengeId, userId }
      });
      throw error;
    }
  }

  async createChallenge(challenge: Omit<Challenge, 'id' | 'currentParticipants' | 'createdAt' | 'updatedAt'>): Promise<Challenge> {
    try {
      logger.info('Creating new challenge', { title: challenge.title, type: challenge.type });

      // Validate challenge data
      await this.validateChallengeData(challenge);

      const now = new Date();
      const challengeData = {
        ...challenge,
        currentParticipants: 0,
        tags: challenge.tags ? challenge.tags.join(',') : '',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        startDate: challenge.startDate.toISOString(),
        endDate: challenge.endDate.toISOString()
      };

      const doc = await databases.createDocument(
        databaseId,
        this.challengesCollectionId,
        ID.unique(),
        challengeData
      );

      const newChallenge: Challenge = {
        id: doc.$id,
        title: doc.title,
        description: doc.description,
        type: doc.type as ChallengeType,
        category: doc.category as ChallengeCategory,
        difficulty: doc.difficulty as ChallengeDifficulty,
        goalType: doc.goalType,
        targetValue: doc.targetValue,
        targetUnit: doc.targetUnit,
        startDate: new Date(doc.startDate),
        endDate: new Date(doc.endDate),
        status: doc.status as ChallengeStatus,
        createdBy: doc.createdBy,
        maxParticipants: doc.maxParticipants,
        currentParticipants: doc.currentParticipants,
        rules: doc.rules,
        rewards: doc.rewards,
        tags: doc.tags ? doc.tags.split(',') : [],
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      };

      // Invalidate relevant caches
      await this.invalidateCache();

      logger.info('Challenge created successfully', { challengeId: newChallenge.id });

      return newChallenge;

    } catch (error: any) {
      logger.error('Failed to create challenge', {
        error: {
          code: 'CHALLENGE_CREATE_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: challenge
      });
      throw error;
    }
  }

  async joinChallenge(challengeId: string, userId: string, teamId?: string): Promise<ChallengeParticipant> {
    try {
      logger.info('User joining challenge', { challengeId, userId, teamId });

      // Check if user can participate
      const canParticipate = await privacyManager.canUserParticipate(userId);
      if (!canParticipate) {
        throw new Error('User privacy settings do not allow challenge participation');
      }

      // Get challenge details
      const challenge = await this.getChallengeById(challengeId);
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      if (challenge.status !== 'active') {
        throw new Error('Challenge is not active');
      }

      if (challenge.maxParticipants && challenge.currentParticipants >= challenge.maxParticipants) {
        throw new Error('Challenge is full');
      }

      // Check if user is already participating
      const existingParticipation = await this.getUserChallengeParticipation(challengeId, userId);
      if (existingParticipation) {
        throw new Error('User is already participating in this challenge');
      }

      const now = new Date();
      const participantData = {
        challengeId,
        userId,
        joinedAt: now.toISOString(),
        status: 'active',
        currentProgress: 0,
        teamId,
        updatedAt: now.toISOString()
      };

      const doc = await databases.createDocument(
        databaseId,
        this.participantsCollectionId,
        ID.unique(),
        participantData
      );

      // Update challenge participant count
      await databases.updateDocument(
        databaseId,
        this.challengesCollectionId,
        challengeId,
        {
          currentParticipants: challenge.currentParticipants + 1,
          updatedAt: now.toISOString()
        }
      );

      const participant: ChallengeParticipant = {
        id: doc.$id,
        challengeId: doc.challengeId,
        userId: doc.userId,
        joinedAt: new Date(doc.joinedAt),
        status: doc.status as ParticipantStatus,
        currentProgress: doc.currentProgress,
        bestProgress: doc.bestProgress,
        lastActivityAt: doc.lastActivityAt ? new Date(doc.lastActivityAt) : undefined,
        teamId: doc.teamId,
        notes: doc.notes,
        updatedAt: new Date(doc.updatedAt)
      };

      // Invalidate caches
      await this.invalidateCache();

      logger.info('User joined challenge successfully', { challengeId, userId });

      return participant;

    } catch (error: any) {
      logger.error('Failed to join challenge', {
        error: {
          code: 'CHALLENGE_JOIN_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: { challengeId, userId, teamId }
      });
      throw error;
    }
  }

  async updateChallengeProgress(update: ChallengeProgressUpdate): Promise<void> {
    try {
      const { challengeId, userId, newProgress, activityData, timestamp = new Date() } = update;

      logger.info('Updating challenge progress', { challengeId, userId, newProgress });

      // Get participant record
      const participant = await this.getUserChallengeParticipation(challengeId, userId);
      if (!participant) {
        logger.warn('Participant not found for progress update', { challengeId, userId });
        return;
      }

      if (participant.status !== 'active') {
        logger.warn('Cannot update progress for inactive participant', { challengeId, userId, status: participant.status });
        return;
      }

      // Update progress
      const updatedData: any = {
        currentProgress: newProgress,
        lastActivityAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString()
      };

      // Update best progress if this is better
      if (!participant.bestProgress || newProgress > participant.bestProgress) {
        updatedData.bestProgress = newProgress;
      }

      // Check if challenge is completed
      const challenge = await this.getChallengeById(challengeId);
      if (challenge && newProgress >= challenge.targetValue) {
        updatedData.status = 'completed';
        
        // TODO: Trigger achievement checks
        // TODO: Send completion notification
      }

      // Update participant record
      const participantDoc = await databases.listDocuments(
        databaseId,
        this.participantsCollectionId,
        [
          Query.equal('challengeId', challengeId),
          Query.equal('userId', userId)
        ]
      );

      if (participantDoc.documents.length > 0) {
        await databases.updateDocument(
          databaseId,
          this.participantsCollectionId,
          participantDoc.documents[0].$id,
          updatedData
        );
      }

      // Invalidate caches
      await this.invalidateCache();

      logger.info('Challenge progress updated successfully', { challengeId, userId, newProgress });

    } catch (error: any) {
      logger.error('Failed to update challenge progress', {
        error: {
          code: 'CHALLENGE_PROGRESS_ERROR',
          message: error.message,
          stack: error.stack
        },
        metadata: update
      });
      throw error;
    }
  }

  async getChallengeLeaderboard(challengeId: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await databases.listDocuments(
        databaseId,
        this.participantsCollectionId,
        [
          Query.equal('challengeId', challengeId),
          Query.equal('status', 'active'),
          Query.orderDesc('currentProgress'),
          Query.limit(limit)
        ]
      );

      const leaderboard = response.documents.map((doc, index) => ({
        rank: index + 1,
        userId: doc.userId,
        progress: doc.currentProgress,
        bestProgress: doc.bestProgress,
        joinedAt: new Date(doc.joinedAt),
        lastActivityAt: doc.lastActivityAt ? new Date(doc.lastActivityAt) : undefined
      }));

      return leaderboard;

    } catch (error: any) {
      logger.error('Failed to get challenge leaderboard', {
        error: { message: error.message },
        metadata: { challengeId, limit }
      });
      throw error;
    }
  }

  async getUserParticipation(userId: string): Promise<ChallengeParticipant[]> {
    try {
      const response = await databases.listDocuments(
        databaseId,
        this.participantsCollectionId,
        [
          Query.equal('userId', userId),
          Query.orderDesc('joinedAt')
        ]
      );

      return response.documents.map(doc => ({
        id: doc.$id,
        challengeId: doc.challengeId,
        userId: doc.userId,
        joinedAt: new Date(doc.joinedAt),
        status: doc.status as ParticipantStatus,
        currentProgress: doc.currentProgress,
        bestProgress: doc.bestProgress,
        lastActivityAt: doc.lastActivityAt ? new Date(doc.lastActivityAt) : undefined,
        teamId: doc.teamId,
        notes: doc.notes,
        updatedAt: new Date(doc.updatedAt)
      }));

    } catch (error: any) {
      logger.error('Failed to get user participation', {
        error: { message: error.message },
        metadata: { userId }
      });
      throw error;
    }
  }

  private async getUserChallengeParticipation(challengeId: string, userId: string): Promise<ChallengeParticipant | null> {
    try {
      const response = await databases.listDocuments(
        databaseId,
        this.participantsCollectionId,
        [
          Query.equal('challengeId', challengeId),
          Query.equal('userId', userId)
        ]
      );

      if (response.documents.length === 0) {
        return null;
      }

      const doc = response.documents[0];
      return {
        id: doc.$id,
        challengeId: doc.challengeId,
        userId: doc.userId,
        joinedAt: new Date(doc.joinedAt),
        status: doc.status as ParticipantStatus,
        currentProgress: doc.currentProgress,
        bestProgress: doc.bestProgress,
        lastActivityAt: doc.lastActivityAt ? new Date(doc.lastActivityAt) : undefined,
        teamId: doc.teamId,
        notes: doc.notes,
        updatedAt: new Date(doc.updatedAt)
      };

    } catch (error: any) {
      logger.error('Failed to get user challenge participation', {
        error: { message: error.message },
        metadata: { challengeId, userId }
      });
      return null;
    }
  }

  private async validateChallengeData(challenge: Omit<Challenge, 'id' | 'currentParticipants' | 'createdAt' | 'updatedAt'>): Promise<void> {
    // Validate dates
    if (challenge.startDate >= challenge.endDate) {
      throw new Error('Start date must be before end date');
    }

    if (challenge.endDate <= new Date()) {
      throw new Error('End date must be in the future');
    }

    // Validate target value
    if (challenge.targetValue <= 0) {
      throw new Error('Target value must be positive');
    }

    // Validate max participants
    if (challenge.maxParticipants && challenge.maxParticipants <= 0) {
      throw new Error('Max participants must be positive');
    }
  }

  async updateChallengeStatus(challengeId: string, status: ChallengeStatus): Promise<void> {
    try {
      await databases.updateDocument(
        databaseId,
        this.challengesCollectionId,
        challengeId,
        {
          status,
          updatedAt: new Date().toISOString()
        }
      );

      await this.invalidateCache();

      logger.info('Challenge status updated', { challengeId, status });

    } catch (error: any) {
      logger.error('Failed to update challenge status', {
        error: { message: error.message },
        metadata: { challengeId, status }
      });
      throw error;
    }
  }

  private async invalidateCache(): Promise<void> {
    try {
      await cacheService.deletePattern(`${this.cacheKeyPrefix}*`);
    } catch (error: any) {
      logger.warn('Failed to invalidate challenge cache', {
        error: { message: error.message }
      });
    }
  }

  async getChallengeCategories(): Promise<ChallengeCategory[]> {
    return ['efficiency', 'reduction', 'innovation', 'education', 'collaboration'];
  }

  async getChallengeDifficulties(): Promise<ChallengeDifficulty[]> {
    return ['beginner', 'intermediate', 'advanced', 'expert'];
  }

  async getChallengeTypes(): Promise<ChallengeType[]> {
    return ['individual', 'team', 'organization', 'global'];
  }
}

export const challengeService = new ChallengeService();