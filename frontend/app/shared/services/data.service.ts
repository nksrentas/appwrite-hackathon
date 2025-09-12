import { databases, DATABASE_ID, COLLECTIONS } from './appwrite.client';
import { Query } from 'appwrite';

class DataService {
  async getLeaderboardData(category: string, period: string) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.LEADERBOARD,
        [
          Query.equal('category', category),
          Query.equal('period', period),
          Query.orderDesc('score'),
          Query.limit(100)
        ]
      );
      return response.documents;
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      throw error;
    }
  }

  async getChallenges(filters?: { type?: string; status?: string }) {
    try {
      const queries = [];
      if (filters?.type) {
        queries.push(Query.equal('type', filters.type));
      }
      if (filters?.status) {
        queries.push(Query.equal('status', filters.status));
      }
      queries.push(Query.orderDesc('$createdAt'));
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CHALLENGES,
        queries
      );
      return response.documents;
    } catch (error) {
      console.error('Error fetching challenges:', error);
      throw error;
    }
  }

  async getAchievements(userId: string) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_ACHIEVEMENTS,
        [
          Query.equal('userId', userId),
          Query.orderDesc('unlockedAt')
        ]
      );
      return response.documents;
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
  }

  async getTeams(userId?: string) {
    try {
      const queries = userId 
        ? [Query.equal('members', userId)]
        : [Query.orderDesc('score')];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.TEAMS,
        queries
      );
      return response.documents;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  }

  async updatePrivacySettings(userId: string, settings: any) {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PRIVACY_SETTINGS,
        userId,
        settings
      );
      return response;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  async joinChallenge(challengeId: string, userId: string) {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.CHALLENGE_PARTICIPANTS,
        'unique()',
        {
          challengeId,
          userId,
          joinedAt: new Date().toISOString(),
          progress: 0
        }
      );
      return response;
    } catch (error) {
      console.error('Error joining challenge:', error);
      throw error;
    }
  }

  async createTeam(teamData: any) {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.TEAMS,
        'unique()',
        teamData
      );
      return response;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }
}

export const dataService = new DataService();