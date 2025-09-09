import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { dataService } from '~/services/data.service';
import { realtimeService } from '~/services/realtime.service';
import type { AppwriteLeaderboard } from '~/services/appwrite.client';
import type { LeaderboardUpdatePayload } from '~/services/realtime.service';


export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export interface LeaderboardRanking {
  userId: string;
  username: string;
  avatar: string;
  rank: number;
  carbonTotal: number;
  efficiencyScore: number;
  activities: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface UserPosition {
  rank: number;
  total: number;
  carbonTotal: number;
  efficiencyScore: number;
  percentile: number;
}

export interface LeaderboardState {
  leaderboards: Record<LeaderboardPeriod, AppwriteLeaderboard | null>;
  currentPeriod: LeaderboardPeriod;
  userPosition: Record<LeaderboardPeriod, UserPosition | null>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Record<LeaderboardPeriod, string>;

  subscriptions: Set<LeaderboardPeriod>;

  loadLeaderboard: (period: LeaderboardPeriod) => Promise<void>;
  loadUserPosition: (userId: string, period: LeaderboardPeriod) => Promise<void>;
  setPeriod: (period: LeaderboardPeriod) => void;
  subscribeToRealTimeUpdates: (period: LeaderboardPeriod) => void;
  unsubscribeFromRealTimeUpdates: (period?: LeaderboardPeriod) => void;
  handleLeaderboardUpdate: (update: LeaderboardUpdatePayload) => void;
  refreshLeaderboard: (period: LeaderboardPeriod) => Promise<void>;
  clearError: () => void;
}

export const useLeaderboardStore = create<LeaderboardState>()(
  devtools(
    (set, get) => ({
      leaderboards: {
        daily: null,
        weekly: null,
        monthly: null,
        all_time: null,
      },
      currentPeriod: 'daily',
      userPosition: {
        daily: null,
        weekly: null,
        monthly: null,
        all_time: null,
      },
      isLoading: false,
      error: null,
      lastUpdated: {
        daily: '',
        weekly: '',
        monthly: '',
        all_time: '',
      },
      subscriptions: new Set(),

      loadLeaderboard: async (period: LeaderboardPeriod) => {
        try {
          set({ isLoading: true, error: null });

          const leaderboard = await dataService.getLeaderboard(period);

          set((state) => ({
            leaderboards: {
              ...state.leaderboards,
              [period]: leaderboard,
            },
            lastUpdated: {
              ...state.lastUpdated,
              [period]: new Date().toISOString(),
            },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load leaderboard',
            isLoading: false,
          });
          throw error;
        }
      },

      loadUserPosition: async (userId: string, period: LeaderboardPeriod) => {
        try {
          const position = await dataService.getUserLeaderboardPosition(userId, period);

          if (position) {
            const userPos: UserPosition = {
              ...position,
              percentile: Math.round(((position.total - position.rank) / position.total) * 100),
            };

            set((state) => ({
              userPosition: {
                ...state.userPosition,
                [period]: userPos,
              },
            }));
          }
        } catch (error) {
          console.error('Failed to load user position:', error);
        }
      },

      setPeriod: (period: LeaderboardPeriod) => {
        set({ currentPeriod: period });

        const state = get();
        if (!state.leaderboards[period]) {
          state.loadLeaderboard(period);
        }
      },

      subscribeToRealTimeUpdates: (period: LeaderboardPeriod) => {
        const state = get();

        if (state.subscriptions.has(period)) {
          return;
        }

        try {
          const unsubscribe = realtimeService.subscribeToLeaderboard(
            period,
            (update: LeaderboardUpdatePayload) => {
              if (update.period === period) {
                get().handleLeaderboardUpdate(update);
              }
            },
            (error: Error) => {
              console.error(`Leaderboard ${period} update error:`, error);
              set({ error: error.message });
            }
          );

          set((state) => ({
            subscriptions: new Set([...state.subscriptions, period]),
          }));

          (get() as any).cleanupFunctions = {
            ...(get() as any).cleanupFunctions,
            [period]: unsubscribe,
          };
        } catch (error) {
          console.error(`Failed to subscribe to ${period} leaderboard updates:`, error);
          set({
            error:
              error instanceof Error
                ? error.message
                : `Failed to connect to ${period} leaderboard updates`,
          });
        }
      },

      unsubscribeFromRealTimeUpdates: (period?: LeaderboardPeriod) => {
        const cleanupFunctions = (get() as any).cleanupFunctions || {};

        if (period) {
          const cleanup = cleanupFunctions[period];
          if (typeof cleanup === 'function') {
            cleanup();
            delete cleanupFunctions[period];
          }

          set((state) => {
            const newSubscriptions = new Set(state.subscriptions);
            newSubscriptions.delete(period);
            return { subscriptions: newSubscriptions };
          });
        } else {
          Object.values(cleanupFunctions).forEach((cleanup: any) => {
            if (typeof cleanup === 'function') {
              cleanup();
            }
          });

          set({ subscriptions: new Set() });
          (get() as any).cleanupFunctions = {};
        }
      },

      handleLeaderboardUpdate: (update: LeaderboardUpdatePayload) => {
        const period = update.period as LeaderboardPeriod;

        const updatedLeaderboard: AppwriteLeaderboard = {
          $id: `${period}-${Date.now()}`,
          $createdAt: update.lastUpdated,
          $updatedAt: update.lastUpdated,
          period,
          periodStart: '', // Will be filled with actual data
          periodEnd: '', // Will be filled with actual data
          rankings: update.rankings.map((ranking, index) => ({
            userId: ranking.userId,
            username: ranking.username,
            avatar: '', // Will be filled with actual data
            carbonTotal: ranking.carbonTotal,
            efficiencyScore: ranking.efficiencyScore,
            rank: ranking.rank,
            activities: 0, // Will be filled with actual data
          })),
        };

        set((state) => ({
          leaderboards: {
            ...state.leaderboards,
            [period]: updatedLeaderboard,
          },
          lastUpdated: {
            ...state.lastUpdated,
            [period]: update.lastUpdated,
          },
          error: null, // Clear any previous errors
        }));
      },

      refreshLeaderboard: async (period: LeaderboardPeriod) => {
        try {
          await get().loadLeaderboard(period);
        } catch (error) {
          console.error(`Failed to refresh ${period} leaderboard:`, error);
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'leaderboard-store',
    }
  )
);
