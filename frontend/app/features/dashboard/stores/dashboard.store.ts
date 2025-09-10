import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { dataService } from '../services/data.service';
import { realtimeService } from '../services/realtime.service';
import type { AppwriteActivity } from '@shared/services/appwrite.client';
import type { CarbonUpdatePayload, ActivityUpdatePayload } from '../services/realtime.service';


export interface DashboardMetrics {
  totalCarbon: number;
  todayCarbon: number;
  weekCarbon: number;
  monthCarbon: number;
  efficiencyScore: number;
  carbonTrend: 'up' | 'down' | 'stable';
  leaderboardPosition: number | null;
  lastUpdated: string;
}

export interface DashboardState {
  metrics: DashboardMetrics | null;
  recentActivities: AppwriteActivity[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  lastActivity: ActivityUpdatePayload | null;

  subscriptions: Set<string>;

  loadDashboard: (userId: string) => Promise<void>;
  subscribeToRealTimeUpdates: (userId: string) => void;
  unsubscribeFromRealTimeUpdates: () => void;
  handleCarbonUpdate: (update: CarbonUpdatePayload) => void;
  handleActivityUpdate: (activity: ActivityUpdatePayload) => void;
  refreshData: (userId: string) => Promise<void>;
  clearError: () => void;
  setConnectionStatus: (connected: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      metrics: null,
      recentActivities: [],
      isLoading: false,
      isConnected: false,
      error: null,
      lastActivity: null,
      subscriptions: new Set(),

      loadDashboard: async (userId: string) => {
        try {
          set({ isLoading: true, error: null });

          const summary = await dataService.getDashboardSummary(userId);

          set({
            metrics: {
              totalCarbon: summary.totalCarbon,
              todayCarbon: summary.todayCarbon,
              weekCarbon: summary.weekCarbon,
              monthCarbon: summary.monthCarbon,
              efficiencyScore: summary.efficiencyScore,
              carbonTrend: summary.carbonTrend,
              leaderboardPosition: summary.leaderboardPosition,
              lastUpdated: new Date().toISOString(),
            },
            recentActivities: summary.recentActivities,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load dashboard',
            isLoading: false,
          });
          throw error;
        }
      },

      subscribeToRealTimeUpdates: (userId: string) => {
        const state = get();

        if (state.subscriptions.has(userId)) {
          return;
        }

        try {
          const carbonUnsubscribe = realtimeService.subscribeToUserCarbon(
            userId,
            (update: CarbonUpdatePayload) => {
              get().handleCarbonUpdate(update);
            },
            (error: Error) => {
              console.error('Carbon update error:', error);
              set({ error: error.message });
            }
          );

          const activityUnsubscribe = realtimeService.subscribeToUserActivities(
            userId,
            (activity: ActivityUpdatePayload) => {
              get().handleActivityUpdate(activity);
            },
            (error: Error) => {
              console.error('Activity update error:', error);
              set({ error: error.message });
            }
          );

          const statusUnsubscribe = realtimeService.onConnectionStatusChange((status) => {
            set({ isConnected: status === 'connected' });
          });

          state.subscriptions.add(userId);

          (get() as any).cleanupFunctions = {
            ...(get() as any).cleanupFunctions,
            [userId]: () => {
              carbonUnsubscribe();
              activityUnsubscribe();
              statusUnsubscribe();
            },
          };

          set({ isConnected: realtimeService.isConnected() });
        } catch (error) {
          console.error('Failed to subscribe to real-time updates:', error);
          set({
            error:
              error instanceof Error ? error.message : 'Failed to connect to real-time updates',
            isConnected: false,
          });
        }
      },

      unsubscribeFromRealTimeUpdates: () => {
        const cleanupFunctions = (get() as any).cleanupFunctions || {};

        Object.values(cleanupFunctions).forEach((cleanup: any) => {
          if (typeof cleanup === 'function') {
            cleanup();
          }
        });

        set({
          subscriptions: new Set(),
          isConnected: false,
        });

        (get() as any).cleanupFunctions = {};
      },

      handleCarbonUpdate: (update: CarbonUpdatePayload) => {
        const state = get();
        if (!state.metrics) return;

        const updatedMetrics: DashboardMetrics = {
          ...state.metrics,
          totalCarbon: state.metrics.totalCarbon + update.carbonValue,
          todayCarbon: state.metrics.todayCarbon + update.carbonValue,
          lastUpdated: update.timestamp,
        };

        set({
          metrics: updatedMetrics,
          error: null, // Clear any previous errors
        });
      },

      handleActivityUpdate: (activity: ActivityUpdatePayload) => {
        const state = get();

        const updatedActivities = [
          {
            $id: activity.id,
            $createdAt: activity.timestamp,
            $updatedAt: activity.timestamp,
            userId: '', // Will be filled by the real data
            type: activity.type as any,
            repository: activity.repository,
            githubEventId: '',
            details: activity.details,
            carbonCalculated: !!activity.carbonValue,
            carbonValue: activity.carbonValue,
            carbonUnit: activity.carbonUnit,
          } as AppwriteActivity,
          ...state.recentActivities.slice(0, 4), // Keep only 5 most recent
        ];

        set({
          recentActivities: updatedActivities,
          lastActivity: activity,
          error: null, // Clear any previous errors
        });
      },

      refreshData: async (userId: string) => {
        try {
          await get().loadDashboard(userId);
        } catch (error) {
          console.error('Failed to refresh dashboard data:', error);
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setConnectionStatus: (connected: boolean) => {
        set({ isConnected: connected });
      },
    }),
    {
      name: 'dashboard-store',
    }
  )
);
