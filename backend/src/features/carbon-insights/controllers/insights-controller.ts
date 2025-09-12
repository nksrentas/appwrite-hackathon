import { Request, Response } from 'express';
import { logger } from '@shared/utils/logger';
import { InsightEngineService } from '../services/insight-engine';
import { ImpactTrackerService } from '../services/impact-tracker';
import { PatternAnalyzerService } from '../services/pattern-analyzer';
import { GeographicOptimizerService } from '../services/geographic-optimizer';
import { RecommendationModelService } from '../services/recommendation-model';

export class InsightsController {
  private insightEngine: InsightEngineService;
  private impactTracker: ImpactTrackerService;
  private patternAnalyzer: PatternAnalyzerService;
  private geographicOptimizer: GeographicOptimizerService;
  private recommendationModel: RecommendationModelService;

  constructor() {
    this.insightEngine = InsightEngineService.getInstance();
    this.impactTracker = ImpactTrackerService.getInstance();
    this.patternAnalyzer = PatternAnalyzerService.getInstance();
    this.geographicOptimizer = GeographicOptimizerService.getInstance();
    this.recommendationModel = RecommendationModelService.getInstance();
  }

  /**
   * GET /api/carbon-insights/insights/:userId
   * Get personalized carbon insights for a user
   */
  async getInsights(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      logger.info('Getting insights for user', { userId, ip: req.ip });

      const insights = await this.insightEngine.generateInsights(userId);

      res.json({
        success: true,
        data: {
          insights,
          total: insights.length,
          generatedAt: new Date().toISOString()
        },
        metadata: {
          userId,
          version: '1.0.0',
          algorithm: 'multi-source-recommendation'
        }
      });

    } catch (error) {
      logger.error('Failed to get insights', { 
        userId: req.params.userId,
        error: {
          code: 'INSIGHTS_ERROR',
          message: error.message,
          stack: error.stack
        }
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate insights',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * GET /api/carbon-insights/patterns/:userId
   * Get user's development patterns analysis
   */
  async getPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { days = '30' } = req.query;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const daysNum = parseInt(days as string, 10);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        res.status(400).json({
          success: false,
          error: 'Days must be a number between 1 and 365'
        });
        return;
      }

      logger.info('Getting patterns for user', { userId, days: daysNum });

      const patterns = await this.patternAnalyzer.analyzeUserPatterns(userId, daysNum);

      res.json({
        success: true,
        data: patterns,
        metadata: {
          userId,
          analyzedDays: daysNum,
          analysisDate: patterns.lastAnalyzed
        }
      });

    } catch (error) {
      logger.error('Failed to get patterns', { 
        userId: req.params.userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to analyze patterns',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * GET /api/carbon-insights/geographic/:userId
   * Get geographic context and optimization suggestions
   */
  async getGeographicContext(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      logger.info('Getting geographic context for user', { userId });

      const [context, insights] = await Promise.all([
        this.geographicOptimizer.getGeographicContext(userId),
        this.geographicOptimizer.generateLocationInsights(userId)
      ]);

      res.json({
        success: true,
        data: {
          context,
          insights,
          lastUpdated: new Date().toISOString()
        },
        metadata: {
          userId,
          gridRegion: context.gridRegion,
          carbonIntensity: context.currentCarbonIntensity
        }
      });

    } catch (error) {
      logger.error('Failed to get geographic context', { 
        userId: req.params.userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get geographic context',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * POST /api/carbon-insights/implementation
   * Record implementation of an insight
   */
  async recordImplementation(req: Request, res: Response): Promise<void> {
    try {
      const { userId, insightId, status, notes } = req.body;

      if (!userId || !insightId || !status) {
        res.status(400).json({
          success: false,
          error: 'userId, insightId, and status are required'
        });
        return;
      }

      const validStatuses = ['implemented', 'partially-implemented', 'abandoned', 'rolled-back'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Status must be one of: ${validStatuses.join(', ')}`
        });
        return;
      }

      logger.info('Recording implementation status', { userId, insightId, metadata: { status } });

      await this.impactTracker.recordImplementationStatus(userId, insightId, status, notes);

      res.json({
        success: true,
        message: 'Implementation status recorded successfully',
        data: {
          userId,
          insightId,
          status,
          recordedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to record implementation', { 
        error: {
          code: 'IMPLEMENTATION_RECORD_ERROR',
          message: error.message
        },
        metadata: { requestBody: req.body }
      });

      res.status(500).json({
        success: false,
        error: 'Failed to record implementation',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * GET /api/carbon-insights/impact/:insightId
   * Get impact measurement for a specific insight
   */
  async getImpact(req: Request, res: Response): Promise<void> {
    try {
      const { insightId } = req.params;

      if (!insightId) {
        res.status(400).json({
          success: false,
          error: 'Insight ID is required'
        });
        return;
      }

      logger.info('Getting impact measurement', { insightId });

      const impact = await this.impactTracker.getImpactMeasurement(insightId);

      if (!impact) {
        res.status(404).json({
          success: false,
          error: 'Impact measurement not found'
        });
        return;
      }

      res.json({
        success: true,
        data: impact,
        metadata: {
          insightId,
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get impact measurement', { 
        insightId: req.params.insightId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get impact measurement',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * GET /api/carbon-insights/report/:userId
   * Generate comprehensive impact report for user
   */
  async getImpactReport(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { days = '30' } = req.query;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const daysNum = parseInt(days as string, 10);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        res.status(400).json({
          success: false,
          error: 'Days must be a number between 1 and 365'
        });
        return;
      }

      logger.info('Generating impact report', { userId, days: daysNum });

      const report = await this.impactTracker.generateImpactReport(userId, daysNum);

      res.json({
        success: true,
        data: report,
        metadata: {
          userId,
          periodDays: daysNum,
          reportVersion: '1.0.0'
        }
      });

    } catch (error) {
      logger.error('Failed to generate impact report', { 
        userId: req.params.userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate impact report',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * POST /api/carbon-insights/feedback
   * Submit user feedback on insight effectiveness
   */
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { userId, insightId, satisfaction } = req.body;

      if (!userId || !insightId || !satisfaction) {
        res.status(400).json({
          success: false,
          error: 'userId, insightId, and satisfaction are required'
        });
        return;
      }

      // Validate satisfaction object structure
      const requiredFields = ['overallRating', 'easeOfImplementation', 'effectivenessRating', 'willingnessToRecommend'];
      for (const field of requiredFields) {
        if (!satisfaction[field] || satisfaction[field] < 1 || satisfaction[field] > 5) {
          res.status(400).json({
            success: false,
            error: `${field} must be a number between 1 and 5`
          });
          return;
        }
      }

      logger.info('Collecting user feedback', { userId, insightId });

      await this.impactTracker.collectUserFeedback(userId, insightId, satisfaction);

      // Also update ML model with feedback
      const implemented = satisfaction.effectivenessRating >= 3;
      const effectiveness = satisfaction.effectivenessRating / 5; // Normalize to 0-1
      
      await this.recommendationModel.updateFromFeedback(userId, insightId, implemented, effectiveness);

      res.json({
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          userId,
          insightId,
          submittedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to submit feedback', { 
        error: {
          code: 'FEEDBACK_SUBMISSION_ERROR',
          message: error.message
        },
        metadata: { requestBody: req.body }
      });

      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * GET /api/carbon-insights/model/metrics
   * Get ML model performance metrics
   */
  async getModelMetrics(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting model metrics', { ip: req.ip });

      const metrics = await this.recommendationModel.getModelMetrics();

      res.json({
        success: true,
        data: metrics,
        metadata: {
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get model metrics', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to get model metrics',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * POST /api/carbon-insights/refresh/:userId
   * Force refresh of insights for a user (clears cache)
   */
  async refreshInsights(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      logger.info('Refreshing insights for user', { userId });

      // Clear relevant caches
      const cacheService = new (await import('@shared/utils/cache')).CacheService();
      await Promise.all([
        cacheService.delete(`insights:${userId}`),
        cacheService.delete(`patterns:${userId}:30d`),
        cacheService.delete(`grid-data:*`) // Clear geographic data cache
      ]);

      // Generate fresh insights
      const insights = await this.insightEngine.generateInsights(userId);

      res.json({
        success: true,
        message: 'Insights refreshed successfully',
        data: {
          insights,
          total: insights.length,
          refreshedAt: new Date().toISOString()
        },
        metadata: {
          userId,
          cacheCleared: true
        }
      });

    } catch (error) {
      logger.error('Failed to refresh insights', { 
        userId: req.params.userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to refresh insights',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * GET /api/carbon-insights/health
   * Health check for the carbon insights service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          insightEngine: 'operational',
          patternAnalyzer: 'operational',
          geographicOptimizer: 'operational',
          impactTracker: 'operational',
          recommendationModel: 'operational'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      logger.error('Health check failed', { error: error.message });

      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        message: error.message
      });
    }
  }
}