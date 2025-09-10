import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { analyticsService } from '@features/analytics/services/analytics.service';

export interface TimeSeriesData {
  date: string;
  commits: number;
  pullRequests: number;
  ciRuns: number;
  deployments: number;
  totalCarbon: number;
}

export interface AnalyticsMetrics {
  commits: {
    total: number;
    avgCarbonPerCommit: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  pullRequests: {
    total: number;
    avgCarbonPerPR: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  ciRuns: {
    total: number;
    avgCarbonPerRun: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  deployments: {
    total: number;
    avgCarbonPerDeploy: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  efficiency: {
    codeQuality: number;
    testCoverage: number;
    buildTime: number;
    bundleSize: number;
  };
}

export interface AnalyticsActivity {
  id: string;
  type: 'commit' | 'pull_request' | 'ci_run' | 'deployment';
  repository: string;
  timestamp: string;
  carbonValue: number;
  carbonUnit: string;
  details: string;
  author?: string;
}

interface AnalyticsState {
  metrics: AnalyticsMetrics | null;
  timeSeries: TimeSeriesData[];
  activities: AnalyticsActivity[];
  isLoading: boolean;
  error: string | null;
  selectedTimeFrame: '7d' | '30d' | '90d' | '1y';
  lastUpdated: string | null;
}

interface AnalyticsActions {
  setTimeFrame: (timeFrame: '7d' | '30d' | '90d' | '1y') => void;
  loadAnalytics: (userId: string, timeFrame?: '7d' | '30d' | '90d' | '1y') => Promise<void>;
  refreshData: (userId: string) => Promise<void>;
  clearError: () => void;
}

const initialState: AnalyticsState = {
  metrics: null,
  timeSeries: [],
  activities: [],
  isLoading: false,
  error: null,
  selectedTimeFrame: '30d',
  lastUpdated: null,
};

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setTimeFrame: (timeFrame) => {
      set({ selectedTimeFrame: timeFrame });
    },

    loadAnalytics: async (userId, timeFrame) => {
      set({ isLoading: true, error: null });
      
      try {
        const selectedTimeFrame = timeFrame || get().selectedTimeFrame;
        
        const [metrics, timeSeries, activities] = await Promise.all([
          analyticsService.getAnalyticsMetrics(userId, selectedTimeFrame),
          analyticsService.getTimeSeriesData(userId, selectedTimeFrame),
          analyticsService.getRecentActivities(userId, selectedTimeFrame),
        ]);

        set({
          metrics,
          timeSeries,
          activities,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
          selectedTimeFrame,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load analytics data',
          isLoading: false,
        });
      }
    },

    refreshData: async (userId) => {
      const { selectedTimeFrame } = get();
      await get().loadAnalytics(userId, selectedTimeFrame);
    },

    clearError: () => {
      set({ error: null });
    },
  }))
);