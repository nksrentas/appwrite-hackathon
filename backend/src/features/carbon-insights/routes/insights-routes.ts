import { Router } from 'express';
import { InsightsController } from '@features/carbon-insights/controllers/insights-controller';
import { logger } from '@shared/utils/logger';

const router = Router();
const insightsController = new InsightsController();

router.use((req, res, next) => {
  logger.debug('Carbon insights API request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

router.get('/health', insightsController.healthCheck.bind(insightsController));

router.get('/insights/:userId', insightsController.getInsights.bind(insightsController));
router.post('/insights/:userId/refresh', insightsController.refreshInsights.bind(insightsController));

router.get('/patterns/:userId', insightsController.getPatterns.bind(insightsController));

router.get('/geographic/:userId', insightsController.getGeographicContext.bind(insightsController));

router.post('/implementation', insightsController.recordImplementation.bind(insightsController));

router.get('/impact/:insightId', insightsController.getImpact.bind(insightsController));
router.get('/report/:userId', insightsController.getImpactReport.bind(insightsController));

router.post('/feedback', insightsController.submitFeedback.bind(insightsController));

router.get('/model/metrics', insightsController.getModelMetrics.bind(insightsController));

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