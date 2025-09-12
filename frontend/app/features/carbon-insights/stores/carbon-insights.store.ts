import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { logger } from '@shared/utils/logger';
import { realtimeService } from '@shared/services/realtime.service';
import {
  carbonInsightsService,
  type CarbonInsight,
  type CarbonTrend,
  type CarbonForecast,
  type CarbonMethodology,
  type CarbonDataSource,
  type ConfidenceMetrics,
} from '../services/carbon-insights.service';

interface CarbonInsightsState {
  // Data state
  insights: CarbonInsight | null;
  metrics: any;
  trends: CarbonTrend[] | null;
  forecast: CarbonForecast | null;
  methodology: CarbonMethodology | null;
  dataSources: CarbonDataSource[] | null;
  confidence: ConfidenceMetrics | null;
  auditTrail: any | null;

  // UI state
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  lastRefresh: string | null;

  // Real-time state
  realtimeSubscription: any;
  liveUpdates: boolean;

  // Actions
  setInsights: (insights: CarbonInsight) => void;
  setTrends: (trends: CarbonTrend[]) => void;
  setForecast: (forecast: CarbonForecast) => void;
  setMethodology: (methodology: CarbonMethodology) => void;
  setDataSources: (sources: CarbonDataSource[]) => void;
  setConfidence: (confidence: ConfidenceMetrics) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  clearError: () => void;

  // Async actions
  refreshData: (userId: string, timeRange?: string) => Promise<void>;
  loadTrends: (userId: string, timeRange?: string) => Promise<void>;
  loadForecast: (userId: string, days?: number) => Promise<void>;
  loadMethodology: () => Promise<void>;
  loadDataSources: () => Promise<void>;
  loadConfidenceMetrics: (userId: string) => Promise<void>;
  getAuditTrail: (auditId: string) => Promise<void>;
  
  // Real-time actions
  subscribeToRealTimeUpdates: (userId: string) => void;
  unsubscribeFromRealTimeUpdates: () => void;
  handleRealtimeUpdate: (update: any) => void;
}

export const useCarbonInsightsStore = create<CarbonInsightsState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    insights: null,
    metrics: null,
    trends: null,
    forecast: null,
    methodology: null,
    dataSources: null,
    confidence: null,
    auditTrail: null,
    isLoading: false,
    isConnected: false,
    error: null,
    lastRefresh: null,
    realtimeSubscription: null,
    liveUpdates: false,

    // Setters
    setInsights: (insights) => set({ insights }),
    setTrends: (trends) => set({ trends }),
    setForecast: (forecast) => set({ forecast }),
    setMethodology: (methodology) => set({ methodology }),
    setDataSources: (dataSources) => set({ dataSources }),
    setConfidence: (confidence) => set({ confidence }),
    setError: (error) => set({ error }),
    setLoading: (isLoading) => set({ isLoading }),
    setConnected: (isConnected) => set({ isConnected }),
    clearError: () => set({ error: null }),

    // Async actions
    refreshData: async (userId: string, timeRange: string = '7d') => {
      set({ isLoading: true, error: null });

      try {
        logger.info('Refreshing carbon insights data', { userId, timeRange });

        // Try to fetch real data first, fallback to mock data
        let insights: CarbonInsight;
        try {
          insights = await carbonInsightsService.getCarbonInsights(userId, timeRange);
        } catch (error) {
          logger.warn('Using mock data for carbon insights', { error });
          insights = carbonInsightsService.generateMockInsights(userId);
        }

        set({
          insights,
          metrics: insights, // Keep for compatibility
          lastRefresh: new Date().toISOString(),
          isLoading: false,
        });

        logger.info('Carbon insights data refreshed successfully');
      } catch (error) {
        logger.error('Failed to refresh carbon insights data', { error, userId });
        set({
          error: error instanceof Error ? error.message : 'Failed to load carbon insights',
          isLoading: false,
        });
      }
    },

    loadTrends: async (userId: string, timeRange: string = '30d') => {
      try {
        logger.info('Loading carbon trends', { userId, timeRange });

        let trends: CarbonTrend[];
        try {
          trends = await carbonInsightsService.getCarbonTrends(userId, timeRange);
        } catch (error) {
          logger.warn('Using mock data for carbon trends', { error });
          trends = carbonInsightsService.generateMockTrends(timeRange);
        }

        set({ trends });
        logger.info('Carbon trends loaded successfully');
      } catch (error) {
        logger.error('Failed to load carbon trends', { error, userId, timeRange });
        set({ error: error instanceof Error ? error.message : 'Failed to load trends' });
      }
    },

    loadForecast: async (userId: string, days: number = 30) => {
      try {
        logger.info('Loading carbon forecast', { userId, days });

        const forecast = await carbonInsightsService.getCarbonForecast(userId, days);
        set({ forecast });

        logger.info('Carbon forecast loaded successfully');
      } catch (error) {
        logger.error('Failed to load carbon forecast', { error, userId, days });
        set({ error: error instanceof Error ? error.message : 'Failed to load forecast' });
      }
    },

    loadMethodology: async () => {
      try {
        logger.info('Loading carbon methodology');

        const methodology = await carbonInsightsService.getCarbonMethodology();
        set({ methodology });

        logger.info('Carbon methodology loaded successfully');
      } catch (error) {
        logger.error('Failed to load carbon methodology', { error });
        set({ error: error instanceof Error ? error.message : 'Failed to load methodology' });
      }
    },

    loadDataSources: async () => {
      try {
        logger.info('Loading data sources');

        const dataSources = await carbonInsightsService.getDataSources();
        set({ dataSources });

        logger.info('Data sources loaded successfully');
      } catch (error) {
        logger.error('Failed to load data sources', { error });
        set({ error: error instanceof Error ? error.message : 'Failed to load data sources' });
      }
    },

    loadConfidenceMetrics: async (userId: string) => {
      try {
        logger.info('Loading confidence metrics', { userId });

        const confidence = await carbonInsightsService.getConfidenceMetrics(userId);
        set({ confidence });

        logger.info('Confidence metrics loaded successfully');
      } catch (error) {
        logger.error('Failed to load confidence metrics', { error, userId });
        set({ error: error instanceof Error ? error.message : 'Failed to load confidence metrics' });
      }
    },

    getAuditTrail: async (auditId: string) => {
      try {
        logger.info('Loading audit trail', { auditId });

        const auditTrail = await carbonInsightsService.getAuditTrail(auditId);
        set({ auditTrail });

        logger.info('Audit trail loaded successfully');
      } catch (error) {
        logger.error('Failed to load audit trail', { error, auditId });
        set({ error: error instanceof Error ? error.message : 'Failed to load audit trail' });
      }
    },

    // Real-time actions
    subscribeToRealTimeUpdates: (userId: string) => {
      const state = get();
      
      if (state.realtimeSubscription) {
        state.realtimeSubscription.unsubscribe();
      }

      try {
        logger.info('Subscribing to carbon insights real-time updates', { userId });

        const subscription = realtimeService.subscribe(
          'carbon-insights',
          { userId },
          (update) => {
            logger.info('Received carbon insights real-time update', { update });
            get().handleRealtimeUpdate(update);
          }
        );

        set({
          realtimeSubscription: subscription,
          isConnected: true,
          liveUpdates: true,
          error: null,
        });

        logger.info('Successfully subscribed to carbon insights real-time updates');
      } catch (error) {
        logger.error('Failed to subscribe to carbon insights real-time updates', { error, userId });
        set({
          error: error instanceof Error ? error.message : 'Failed to establish real-time connection',
          isConnected: false,
        });
      }
    },

    unsubscribeFromRealTimeUpdates: () => {
      const state = get();
      
      if (state.realtimeSubscription) {
        state.realtimeSubscription.unsubscribe();
        logger.info('Unsubscribed from carbon insights real-time updates');
      }

      set({
        realtimeSubscription: null,
        isConnected: false,
        liveUpdates: false,
      });
    },

    handleRealtimeUpdate: (update: any) => {
      const state = get();
      
      try {
        switch (update.type) {
          case 'carbon_insight_update':
            if (update.data) {
              set({
                insights: { ...state.insights, ...update.data },
                metrics: { ...state.metrics, ...update.data },
                lastRefresh: new Date().toISOString(),
              });
            }
            break;

          case 'carbon_trend_update':
            if (update.data && state.trends) {
              const updatedTrends = [...state.trends];
              // Add new trend point or update existing
              const existingIndex = updatedTrends.findIndex(
                t => t.timestamp === update.data.timestamp
              );
              
              if (existingIndex >= 0) {
                updatedTrends[existingIndex] = update.data;
              } else {
                updatedTrends.push(update.data);
                updatedTrends.sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
              }
              
              set({ trends: updatedTrends });
            }
            break;

          case 'confidence_update':
            if (update.data) {
              set({ confidence: update.data });
            }
            break;

          case 'methodology_update':
            if (update.data) {
              set({ methodology: update.data });
            }
            break;

          case 'data_source_status':
            if (update.data && state.dataSources) {
              const updatedSources = state.dataSources.map(source => 
                source.name === update.data.name 
                  ? { ...source, ...update.data }
                  : source
              );
              set({ dataSources: updatedSources });
            }
            break;

          default:
            logger.warn('Received unknown carbon insights update type', { type: update.type });
        }

        logger.info('Carbon insights real-time update processed', { type: update.type });
      } catch (error) {
        logger.error('Failed to process carbon insights real-time update', { error, update });
      }
    },
  }))
);

// Subscribe to store changes for debugging in development
if (process.env.NODE_ENV === 'development') {
  useCarbonInsightsStore.subscribe(
    (state) => state.insights,
    (insights) => {
      logger.debug('Carbon insights updated', { insights });
    }
  );

  useCarbonInsightsStore.subscribe(
    (state) => state.error,
    (error) => {
      if (error) {
        logger.debug('Carbon insights error updated', { error });
      }
    }
  );
}