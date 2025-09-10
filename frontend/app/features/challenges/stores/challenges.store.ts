import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { challengesService } from '@features/challenges/services/challenges.service';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  reward: number;
  progress: number;
  target: number;
  status: 'active' | 'completed' | 'locked';
  iconName: string;
  color: string;
  timeLeft?: string;
  requirement?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  reward: number;
  earnedAt: string;
  iconName: string;
  category: string;
}

export interface UserStats {
  totalPoints: number;
  activeChallenges: number;
  completedChallenges: number;
  successRate: number;
  currentStreak: number;
  longestStreak: number;
  rank: number;
  totalParticipants: number;
}

interface ChallengesState {
  challenges: Challenge[];
  achievements: Achievement[];
  userStats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface ChallengesActions {
  loadChallenges: (userId: string) => Promise<void>;
  loadAchievements: (userId: string) => Promise<void>;
  loadUserStats: (userId: string) => Promise<void>;
  startChallenge: (challengeId: string, userId: string) => Promise<void>;
  updateChallengeProgress: (challengeId: string, progress: number, userId: string) => Promise<void>;
  completeChallenge: (challengeId: string, userId: string) => Promise<void>;
  refreshData: (userId: string) => Promise<void>;
  clearError: () => void;
}

const initialState: ChallengesState = {
  challenges: [],
  achievements: [],
  userStats: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useChallengesStore = create<ChallengesState & ChallengesActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    loadChallenges: async (userId) => {
      set({ isLoading: true, error: null });
      
      try {
        const challenges = await challengesService.getChallenges(userId);
        set({
          challenges,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load challenges',
          isLoading: false,
        });
      }
    },

    loadAchievements: async (userId) => {
      try {
        const achievements = await challengesService.getAchievements(userId);
        set({ achievements });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load achievements',
        });
      }
    },

    loadUserStats: async (userId) => {
      try {
        const userStats = await challengesService.getUserStats(userId);
        set({ userStats });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load user stats',
        });
      }
    },

    startChallenge: async (challengeId, userId) => {
      try {
        await challengesService.startChallenge(challengeId, userId);
        
        const updatedChallenges = get().challenges.map(challenge =>
          challenge.id === challengeId
            ? { ...challenge, status: 'active' as const, startedAt: new Date().toISOString() }
            : challenge
        );
        
        set({ challenges: updatedChallenges });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to start challenge',
        });
      }
    },

    updateChallengeProgress: async (challengeId, progress, userId) => {
      try {
        await challengesService.updateChallengeProgress(challengeId, progress, userId);
        
        const updatedChallenges = get().challenges.map(challenge =>
          challenge.id === challengeId
            ? { 
                ...challenge, 
                progress,
                status: progress >= challenge.target ? 'completed' : challenge.status
              }
            : challenge
        );
        
        set({ challenges: updatedChallenges });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to update progress',
        });
      }
    },

    completeChallenge: async (challengeId, userId) => {
      try {
        await challengesService.completeChallenge(challengeId, userId);
        
        const updatedChallenges = get().challenges.map(challenge =>
          challenge.id === challengeId
            ? { 
                ...challenge, 
                status: 'completed' as const,
                progress: challenge.target,
                completedAt: new Date().toISOString()
              }
            : challenge
        );
        
        set({ challenges: updatedChallenges });
        
        await get().loadUserStats(userId);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to complete challenge',
        });
      }
    },

    refreshData: async (userId) => {
      await Promise.all([
        get().loadChallenges(userId),
        get().loadAchievements(userId),
        get().loadUserStats(userId),
      ]);
    },

    clearError: () => {
      set({ error: null });
    },
  }))
);