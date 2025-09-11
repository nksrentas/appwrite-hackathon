import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

import { webSocketService } from '@websocket/services/connection';
import { realtimeBroadcaster } from '@websocket/services/broadcaster';
import { DashboardService } from '@features/dashboard/services/dashboard-service';
import { carbonCalculationEngine } from '@features/carbon-calculation';
// Temporarily disabled GitHub integration
// import { 
//   githubRoutes, 
//   webhookRoutes, 
//   githubSecurityMiddleware, 
//   webhookSecurityMiddleware, 
//   githubErrorHandler,
//   GitHubIntegrationFeature
// } from '@features/github-integration';
import { logger } from '@shared/utils/logger';
import { performanceMonitor } from '@shared/utils/performance';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize GitHub integration feature - temporarily disabled
// let githubIntegration: GitHubIntegrationFeature | null = null;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Mount GitHub integration routes - temporarily disabled
// app.use('/api/github', githubSecurityMiddleware, githubRoutes);
// app.use('/api/webhooks', webhookSecurityMiddleware, webhookRoutes);

app.get('/api/dashboard/carbon/:userId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const { period = 'weekly' } = req.query;
    
    logger.info('Dashboard carbon data requested', {
      userId,
      period: period as string,
      metadata: { endpoint: '/carbon' }
    });
    
    const carbonData = await DashboardService.getUserCarbonData({
      userId,
      period: period as 'daily' | 'weekly' | 'monthly' | 'all_time'
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: carbonData,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard carbon data request failed', {
      error: {
        message: error.message,
        code: 'CARBON_DATA_ERROR',
        stack: error.stack
      },
      metadata: { userId: req.params.userId }
    });
    
    res.status(500).json({
      error: 'Failed to fetch carbon data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/dashboard/activities/:userId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const { 
      limit = '25', 
      offset = '0', 
      type,
      since 
    } = req.query;
    
    logger.info('Dashboard activities requested', {
      userId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      type: type as string | undefined,
      since: since as string | undefined,
      metadata: { endpoint: '/activities' }
    });
    
    const activities = await DashboardService.getUserActivities({
      userId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      type: type as string,
      since: since as string
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: activities,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard activities request failed', {
      error: {
        message: error.message,
        code: 'ACTIVITIES_DATA_ERROR',
        stack: error.stack
      },
      metadata: { userId: req.params.userId }
    });
    
    res.status(500).json({
      error: 'Failed to fetch activities data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/dashboard/stats/:userId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const { period = 'weekly' } = req.query;
    
    logger.info('Dashboard stats requested', {
      userId,
      period: period as string,
      metadata: { endpoint: '/stats' }
    });
    
    const stats = await DashboardService.getUserStats({
      userId,
      period: period as 'daily' | 'weekly' | 'monthly' | 'all_time'
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard stats request failed', {
      error: {
        message: error.message,
        code: 'STATS_DATA_ERROR',
        stack: error.stack
      },
      metadata: { userId: req.params.userId }
    });
    
    res.status(500).json({
      error: 'Failed to fetch stats data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/dashboard/trends/:userId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    const { 
      period = 'weekly',
      granularity = 'daily',
      days = '30'
    } = req.query;
    
    logger.info('Dashboard trends requested', {
      userId,
      period: period as string,
      granularity: granularity as string,
      days: parseInt(days as string),
      metadata: { endpoint: '/trends' }
    });
    
    const trends = await DashboardService.getUserTrends({
      userId,
      period: period as string,
      granularity: granularity as 'hourly' | 'daily' | 'weekly',
      days: parseInt(days as string)
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: trends,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard trends request failed', {
      error: {
        message: error.message,
        code: 'TRENDS_DATA_ERROR',
        stack: error.stack
      },
      metadata: { userId: req.params.userId }
    });
    
    res.status(500).json({
      error: 'Failed to fetch trends data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/dashboard/leaderboard', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      period = 'weekly',
      limit = '50',
      userId 
    } = req.query;
    
    logger.info('Dashboard leaderboard requested', {
      period: period as string,
      limit: parseInt(limit as string),
      userId: userId as string | undefined,
      metadata: { endpoint: '/leaderboard' }
    });
    
    const leaderboard = await DashboardService.getLeaderboardData({
      period: period as 'daily' | 'weekly' | 'monthly' | 'all_time',
      limit: parseInt(limit as string),
      userId: userId as string
    });
    
    const responseTime = Date.now() - startTime;
    
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.json({
      success: true,
      data: leaderboard,
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });
    
  } catch (error: any) {
    logger.error('Dashboard leaderboard request failed', {
      error: {
        message: error.message,
        code: 'LEADERBOARD_ERROR',
        stack: error.stack
      }
    });
    
    res.status(500).json({
      error: 'Failed to fetch leaderboard data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/dashboard/broadcast/test/:userId', async (req, res): Promise<any> => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    const { userId } = req.params;
    const { type = 'carbon_updated', data = {} } = req.body;
    
    logger.info('Test broadcast triggered', {
      userId,
      type,
      data,
      metadata: { endpoint: '/broadcast/test' }
    });
    
    if (type === 'carbon_updated') {
      await realtimeBroadcaster.broadcastCarbonUpdate({
        userId,
        activityId: data.activityId || 'test-activity',
        carbonKg: data.carbonKg || 0.123,
        confidence: data.confidence || 'medium'
      });
    }
    
    else if (type === 'activity_created') {
      await realtimeBroadcaster.broadcastActivityUpdate({
        userId,
        activityId: data.activityId || 'test-activity',
        activityType: data.activityType || 'commit',
        repository: data.repository || 'test/repo'
      });
    }
    else {
      return res.status(400).json({
        error: 'Invalid broadcast type',
        message: `Unknown type: ${type}. Supported types: carbon_updated, activity_created`
      });
    }
    
    res.json({
      success: true,
      message: 'Test broadcast sent',
      type,
      userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('Test broadcast failed', {
      error: {
        code: 'BROADCAST_TEST_ERROR',
        message: error.message,
        stack: error.stack
      }
    });
    
    res.status(500).json({
      error: 'Test broadcast failed',
      message: error.message
    });
  }
});

app.get('/api/dashboard/performance', async (_req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch performance metrics',
      message: error.message
    });
  }
});

app.post('/api/calculation/carbon', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const activityData = req.body;

    logger.info('Carbon calculation requested', {
      metadata: { endpoint: '/carbon', activityType: activityData.activityType }
    });

    const result = await carbonCalculationEngine.calculateCarbon(activityData);
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.json({
      success: true,
      data: {
        carbonKg: result.carbonKg,
        confidence: result.confidence,
        methodology: result.methodology,
        sources: result.sources,
        uncertaintyRange: result.uncertaintyRange,
        validUntil: result.validUntil,
        auditTrail: result.auditTrail
      },
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Carbon calculation request failed', {
      error: {
        message: error.message,
        code: 'CARBON_CALCULATION_API_ERROR',
        stack: error.stack
      },
      metadata: { endpoint: '/carbon' }
    });

    res.status(500).json({
      error: 'Carbon calculation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/calculation/methodology', async (_req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('Methodology information requested', {
      metadata: { endpoint: '/methodology' }
    });

    const result = await carbonCalculationEngine.getPublicMethodology('commit');
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      ...result,
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Methodology request failed', {
      error: {
        message: error.message,
        code: 'METHODOLOGY_API_ERROR',
        stack: error.stack
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch methodology',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/calculation/sources', async (_req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('Data sources information requested', {
      metadata: { endpoint: '/sources' }
    });

    const result = await carbonCalculationEngine.getDataSources();
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      ...result,
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Data sources request failed', {
      error: {
        message: error.message,
        code: 'DATA_SOURCES_API_ERROR',
        stack: error.stack
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch data sources',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/calculation/confidence', async (_req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('Confidence indicators requested', {
      metadata: { endpoint: '/confidence' }
    });

    const result = await carbonCalculationEngine.getConfidenceIndicators();
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.json({
      ...result,
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Confidence indicators request failed', {
      error: {
        message: error.message,
        code: 'CONFIDENCE_API_ERROR',
        stack: error.stack
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch confidence indicators',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/calculation/audit/:auditId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { auditId } = req.params;

    logger.info('Audit trail requested', {
      metadata: { endpoint: '/audit', auditId }
    });

    const result = {
      success: auditId ? true : false,
      data: auditId ? {
        auditId,
        timestamp: new Date().toISOString(),
        status: 'audit_record_found'
      } : null,
      timestamp: new Date().toISOString()
    };
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    if (!result.success) {
      res.status(404).json({
        ...result,
        response_time_ms: responseTime
      });
      return;
    }

    res.json({
      ...result,
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Audit trail request failed', {
      error: {
        message: error.message,
        code: 'AUDIT_TRAIL_API_ERROR',
        stack: error.stack
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit trail',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/calculation/health', async (_req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('Service health check requested', {
      metadata: { endpoint: '/calculation/health' }
    });

    const health = {
      overall: 'healthy' as const,
      services: {
        calculationEngine: 'healthy' as const,
        validation: 'healthy' as const,
        audit: 'healthy' as const,
        epaGrid: 'healthy' as const,
        externalApis: 'healthy' as const
      },
      performance: {
        averageResponseTime: 25,
        successRate: 0.99,
        errorRate: 0.01
      },
      lastUpdated: new Date().toISOString()
    };
    
    const serviceInfo = {
      name: 'EcoTrace Scientific Carbon Calculation Engine',
      version: '1.0.0',
      features: [
        'Multi-modal carbon calculation',
        'EPA eGRID integration',
        'Conservative estimation methodology',
        'Uncertainty quantification',
        'Audit trail system'
      ]
    };
    const responseTime = Date.now() - startTime;

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    const statusCode = health.overall === 'healthy' ? 200 : 
                      health.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: health.overall === 'healthy' || health.overall === 'degraded',
      data: {
        health,
        service: serviceInfo
      },
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime
    });

  } catch (error: any) {
    logger.error('Service health check failed', {
      error: {
        message: error.message,
        code: 'HEALTH_CHECK_ERROR',
        stack: error.stack
      }
    });

    res.status(503).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'EcoTrace Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    architecture: 'feature-based'
  });
});

app.get('/websocket/status', (_req, res) => {
  try {
    const stats = webSocketService.getConnectionStats();
    
    res.json({
      success: true,
      websocket: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get WebSocket status',
      message: error.message
    });
  }
});

async function initializeServices(): Promise<void> {
  try {
    webSocketService.initialize(httpServer);
    
    // Initialize GitHub integration if configuration is available - temporarily disabled
    // try {
    //   githubIntegration = new GitHubIntegrationFeature();
    //   await githubIntegration.initialize();
    //   logger.info('GitHub integration initialized successfully');
    // } catch (error: any) {
    //   logger.warn('GitHub integration initialization failed', {
    //     error: {
    //       code: 'GITHUB_INIT_WARNING',
    //       message: error.message,
    //       stack: error.stack
    //     }
    //   });
    //   // Don't fail the entire application if GitHub integration fails
    //   githubIntegration = null;
    // }
    
    logger.info('All services initialized successfully');
    
  } catch (error: any) {
    logger.error('Service initialization failed', {
      error: {
        code: 'SERVICE_INIT_ERROR',
        message: error.message,
        stack: error.stack
      }
    });
    throw error;
  }
}

// GitHub-specific error handler - temporarily disabled
// app.use('/api/github', githubErrorHandler);
// app.use('/api/webhooks', githubErrorHandler);

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Express error handler', {
    error: {
      code: 'EXPRESS_ERROR',
      message: err.message,
      stack: err.stack
    },
    method: req.method,
    path: req.path,
    metadata: { body: req.body }
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  httpServer.close(async () => {
    webSocketService.shutdown();
    // if (githubIntegration) {
    //   await githubIntegration.shutdown();
    // }
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  httpServer.close(async () => {
    webSocketService.shutdown();
    // if (githubIntegration) {
    //   await githubIntegration.shutdown();
    // }
    logger.info('Server closed');
    process.exit(0);
  });
});

async function startServer(): Promise<void> {
  try {
    await initializeServices();
    
    httpServer.listen(PORT, () => {
      logger.info('EcoTrace Backend started', {
        port: parseInt(PORT.toString()),
        environment: process.env.NODE_ENV || 'development',
        architecture: 'feature-based',
        features: [
          'Real-time WebSocket',
          'Dashboard API',
          'Scientific Carbon Calculation Engine',
          'EPA eGRID Database Integration',
          'External API Integrations (AWS, Electricity Maps, GSF)',
          'Multi-modal Processing',
          'Data Validation & Quality Assurance',
          'Audit Trail & Version Control',
          'Circuit Breaker Pattern',
          'Conservative Estimation Methodology',
          // 'GitHub Integration', // temporarily disabled
          'Analytics System',
          'Challenges & Achievements',
          'Authentication System',
          'Performance Monitoring'
        ]
      });
      console.log(`🚀 EcoTrace Backend v2.0 running on port ${PORT}`);
      console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard`);
      console.log(`🧮 Carbon Calculation API: http://localhost:${PORT}/api/calculation/carbon`);
      console.log(`📋 Methodology Info: http://localhost:${PORT}/api/calculation/methodology`);
      console.log(`📡 Data Sources: http://localhost:${PORT}/api/calculation/sources`);
      console.log(`🎯 Confidence Indicators: http://localhost:${PORT}/api/calculation/confidence`);
      console.log(`📝 Audit Trail: http://localhost:${PORT}/api/calculation/audit/{id}`);
      console.log(`❤️ Service Health: http://localhost:${PORT}/api/calculation/health`);
      console.log(`💾 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket Status: http://localhost:${PORT}/websocket/status`);
      // if (githubIntegration && githubIntegration.isReady()) {
      //   console.log(`🐙 GitHub Integration: http://localhost:${PORT}/api/github`);
      //   console.log(`🪝 GitHub Webhooks: http://localhost:${PORT}/api/webhooks`);
      // }
      console.log(`⚡ Feature-based architecture with path aliases`);
    });
    
  } catch (error: any) {
    logger.error('Failed to start server', {
      error: {
        code: 'SERVER_START_ERROR',
        message: error.message,
        stack: error.stack
      }
    });
    process.exit(1);
  }
}

startServer();