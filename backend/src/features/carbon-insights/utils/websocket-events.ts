import { logger } from '@shared/utils/logger';
import { CarbonInsight, ImpactMeasurement, GeographicContext } from '@features/carbon-insights/types';

export interface CarbonInsightsWebSocketEvents {
  'insights:generated': {
    userId: string;
    insights: CarbonInsight[];
    timestamp: string;
  };
  
  'insights:updated': {
    userId: string;
    insightId: string;
    updates: Partial<CarbonInsight>;
    timestamp: string;
  };

  'insights:implementation_started': {
    userId: string;
    insightId: string;
    timestamp: string;
  };

  'insights:implementation_completed': {
    userId: string;
    insightId: string;
    success: boolean;
    timestamp: string;
  };

  'impact:measured': {
    userId: string;
    insightId: string;
    impact: ImpactMeasurement;
    timestamp: string;
  };

  'impact:report_generated': {
    userId: string;
    reportId: string;
    summary: {
      totalReduction: number;
      implementedInsights: number;
      averageRating: number;
    };
    timestamp: string;
  };

  'geographic:context_updated': {
    userId: string;
    context: GeographicContext;
    timestamp: string;
  };

  'geographic:grid_alert': {
    userId: string;
    alertType: 'low_carbon' | 'high_carbon' | 'renewable_peak';
    intensity: number;
    recommendation: string;
    timestamp: string;
  };

  'patterns:analyzed': {
    userId: string;
    summary: {
      buildFrequency: number;
      carbonEfficiency: number;
      topOptimizations: string[];
    };
    timestamp: string;
  };

  'model:recommendation_generated': {
    userId: string;
    insightId: string;
    confidence: number;
    type: string;
    timestamp: string;
  };

  'model:feedback_received': {
    userId: string;
    insightId: string;
    rating: number;
    modelUpdated: boolean;
    timestamp: string;
  };

  'achievements:unlocked': {
    userId: string;
    achievement: {
      id: string;
      name: string;
      description: string;
      category: string;
    };
    timestamp: string;
  };

  'achievements:milestone_reached': {
    userId: string;
    milestone: {
      type: 'carbon_saved' | 'insights_implemented' | 'streak_maintained';
      value: number;
      unit: string;
    };
    timestamp: string;
  };
}

export class CarbonInsightsWebSocketService {
  private static instance: CarbonInsightsWebSocketService;
  private broadcaster: any;

  private constructor() {}

  public static getInstance(): CarbonInsightsWebSocketService {
    if (!CarbonInsightsWebSocketService.instance) {
      CarbonInsightsWebSocketService.instance = new CarbonInsightsWebSocketService();
    }
    return CarbonInsightsWebSocketService.instance;
  }

  public setBroadcaster(broadcaster: any): void {
    this.broadcaster = broadcaster;
  }

  async emitInsightsGenerated(userId: string, insights: CarbonInsight[]): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['insights:generated'] = {
        userId,
        insights,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'insights:generated', event);
      
      logger.info('Emitted insights generated event', { 
        userId, 
        count: insights.length 
      });
    } catch (error) {
      logger.error('Failed to emit insights generated event', { 
        userId, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitImplementationStarted(userId: string, insightId: string): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['insights:implementation_started'] = {
        userId,
        insightId,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'insights:implementation_started', event);
      
      logger.info('Emitted implementation started event', { userId, insightId });
    } catch (error) {
      logger.error('Failed to emit implementation started event', { 
        userId, 
        insightId, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitImplementationCompleted(
    userId: string, 
    insightId: string, 
    success: boolean
  ): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['insights:implementation_completed'] = {
        userId,
        insightId,
        success,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'insights:implementation_completed', event);
      
      logger.info('Emitted implementation completed event', { 
        userId, 
        insightId, 
        metadata: { success } 
      });
    } catch (error) {
      logger.error('Failed to emit implementation completed event', { 
        userId, 
        insightId, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitImpactMeasured(
    userId: string, 
    insightId: string, 
    impact: ImpactMeasurement
  ): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['impact:measured'] = {
        userId,
        insightId,
        impact,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'impact:measured', event);
      
      logger.info('Emitted impact measured event', { 
        userId, 
        insightId, 
        metadata: { actualReduction: impact.actualReduction } 
      });
    } catch (error) {
      logger.error('Failed to emit impact measured event', { 
        userId, 
        insightId, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitGeographicContextUpdate(userId: string, context: GeographicContext): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['geographic:context_updated'] = {
        userId,
        context,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'geographic:context_updated', event);
      
      logger.info('Emitted geographic context update', { 
        userId, 
        metadata: { carbonIntensity: context.currentCarbonIntensity } 
      });
    } catch (error) {
      logger.error('Failed to emit geographic context update', { 
        userId, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitGridAlert(
    userId: string,
    alertType: 'low_carbon' | 'high_carbon' | 'renewable_peak',
    intensity: number,
    recommendation: string
  ): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['geographic:grid_alert'] = {
        userId,
        alertType,
        intensity,
        recommendation,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'geographic:grid_alert', event);
      
      logger.info('Emitted grid alert', { 
        userId, 
        metadata: { alertType, intensity } 
      });
    } catch (error) {
      logger.error('Failed to emit grid alert', { 
        userId, 
        metadata: { alertType }, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitPatternsAnalyzed(
    userId: string,
    summary: {
      buildFrequency: number;
      carbonEfficiency: number;
      topOptimizations: string[];
    }
  ): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['patterns:analyzed'] = {
        userId,
        summary,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'patterns:analyzed', event);
      
      logger.info('Emitted patterns analyzed event', { 
        userId, 
        metadata: { buildFrequency: summary.buildFrequency } 
      });
    } catch (error) {
      logger.error('Failed to emit patterns analyzed event', { 
        userId, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitMLRecommendationGenerated(
    userId: string,
    insightId: string,
    confidence: number,
    type: string
  ): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['model:recommendation_generated'] = {
        userId,
        insightId,
        confidence,
        type,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'model:recommendation_generated', event);
      
      logger.info('Emitted ML recommendation generated event', { 
        userId, 
        insightId, 
        type,
        metadata: { confidence } 
      });
    } catch (error) {
      logger.error('Failed to emit ML recommendation generated event', { 
        userId, 
        insightId, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitAchievementUnlocked(
    userId: string,
    achievement: {
      id: string;
      name: string;
      description: string;
      category: string;
    }
  ): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['achievements:unlocked'] = {
        userId,
        achievement,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'achievements:unlocked', event);
      
      logger.info('Emitted achievement unlocked event', { 
        userId, 
        name: achievement.name, 
        metadata: { achievementId: achievement.id } 
      });
    } catch (error) {
      logger.error('Failed to emit achievement unlocked event', { 
        userId, 
        metadata: { achievementId: achievement.id }, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitMilestoneReached(
    userId: string,
    milestone: {
      type: 'carbon_saved' | 'insights_implemented' | 'streak_maintained';
      value: number;
      unit: string;
    }
  ): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['achievements:milestone_reached'] = {
        userId,
        milestone,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'achievements:milestone_reached', event);
      
      logger.info('Emitted milestone reached event', { 
        userId, 
        metadata: { milestoneType: milestone.type, value: milestone.value } 
      });
    } catch (error) {
      logger.error('Failed to emit milestone reached event', { 
        userId, 
        metadata: { milestone: milestone.type }, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitImpactReportGenerated(
    userId: string,
    reportId: string,
    summary: {
      totalReduction: number;
      implementedInsights: number;
      averageRating: number;
    }
  ): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['impact:report_generated'] = {
        userId,
        reportId,
        summary,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'impact:report_generated', event);
      
      logger.info('Emitted impact report generated event', { 
        userId, 
        metadata: { reportId, totalReduction: summary.totalReduction } 
      });
    } catch (error) {
      logger.error('Failed to emit impact report generated event', { 
        userId, 
        metadata: { reportId }, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  async emitModelFeedbackReceived(
    userId: string,
    insightId: string,
    rating: number,
    modelUpdated: boolean
  ): Promise<void> {
    try {
      const event: CarbonInsightsWebSocketEvents['model:feedback_received'] = {
        userId,
        insightId,
        rating,
        modelUpdated,
        timestamp: new Date().toISOString()
      };

      await this.emit(`user:${userId}`, 'model:feedback_received', event);
      
      logger.info('Emitted model feedback received event', { 
        userId, 
        insightId,
        metadata: { rating, modelUpdated } 
      });
    } catch (error) {
      logger.error('Failed to emit model feedback received event', { 
        userId, 
        insightId,
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }

  private async emit(channel: string, event: string, data: any): Promise<void> {
    if (!this.broadcaster) {
      logger.warn('WebSocket broadcaster not initialized, skipping event emission', {
        channel,
        event
      });
      return;
    }

    try {
      await this.broadcaster.broadcast(channel, event, data);
    } catch (error) {
      logger.error('Failed to broadcast WebSocket event', {
        channel,
        event,
        error: { code: 'WEBSOCKET_BROADCAST_ERROR', message: error.message }
      });
      throw error;
    }
  }

  async subscribeToInsights(userId: string, socketId: string): Promise<void> {
    try {
      if (!this.broadcaster) {
        throw new Error('WebSocket broadcaster not initialized');
      }

      await this.broadcaster.subscribe(socketId, `user:${userId}`);
      
      logger.info('Subscribed to carbon insights events', { userId, metadata: { socketId } });
    } catch (error) {
      logger.error('Failed to subscribe to insights events', { 
        userId, 
        metadata: { socketId }, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
      throw error;
    }
  }

  async unsubscribeFromInsights(userId: string, socketId: string): Promise<void> {
    try {
      if (!this.broadcaster) {
        return;
      }

      await this.broadcaster.unsubscribe(socketId, `user:${userId}`);
      
      logger.info('Unsubscribed from carbon insights events', { userId, metadata: { socketId } });
    } catch (error) {
      logger.error('Failed to unsubscribe from insights events', { 
        userId, 
        metadata: { socketId }, 
        error: { code: 'WEBSOCKET_ERROR', message: error.message } 
      });
    }
  }
}

export const carbonInsightsWebSocket = CarbonInsightsWebSocketService.getInstance();