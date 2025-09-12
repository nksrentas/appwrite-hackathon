import { Router } from 'express';
import { InsightsController } from '../controllers/insights-controller';
import { logger } from '@shared/utils/logger';

const router = Router();
const insightsController = new InsightsController();

// Middleware for request logging
router.use((req, res, next) => {
  logger.debug('Carbon insights API request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
router.get('/health', insightsController.healthCheck.bind(insightsController));

// Main insights endpoints
router.get('/insights/:userId', insightsController.getInsights.bind(insightsController));
router.post('/insights/:userId/refresh', insightsController.refreshInsights.bind(insightsController));

// Pattern analysis endpoints
router.get('/patterns/:userId', insightsController.getPatterns.bind(insightsController));

// Geographic optimization endpoints
router.get('/geographic/:userId', insightsController.getGeographicContext.bind(insightsController));

// Implementation tracking endpoints
router.post('/implementation', insightsController.recordImplementation.bind(insightsController));

// Impact measurement endpoints
router.get('/impact/:insightId', insightsController.getImpact.bind(insightsController));
router.get('/report/:userId', insightsController.getImpactReport.bind(insightsController));

// Feedback endpoints
router.post('/feedback', insightsController.submitFeedback.bind(insightsController));

// ML model endpoints
router.get('/model/metrics', insightsController.getModelMetrics.bind(insightsController));

// Error handling middleware
router.use((error: Error, req: any, res: any, next: any) => {
  logger.error('Carbon insights API error', {
    error: {
      code: 'API_ERROR',
      message: error.message,
      stack: error.stack
    },
    method: req.method,
    path: req.path,
    metadata: { requestBody: req.body }
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

export { router as insightsRoutes };